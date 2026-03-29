import { getChannelByHandle, getChannelById, getChannelByUsername, getVideos } from "@/lib/youtube/client";
import { InputValidationError } from "@/lib/youtube/errors";

// Match format: UC followed by 22 characters (base64url: A-Z, a-z, 0-9, -, _)
const CHANNEL_ID_REGEX = /^UC[\w-]{22}$/;

// Match handle format: @ followed by 2+ alphanumeric/underscore/dash
const HANDLE_REGEX = /^@[\w-]{2,30}$/;

function validateChannelId(input: string): boolean {
  return CHANNEL_ID_REGEX.test(input);
}

function validateHandle(input: string): boolean {
  return HANDLE_REGEX.test(input);
}

function validateUsername(input: string): boolean {
  // Username can be alphanumeric, underscore, dash, 3+ chars
  return /^[\w-]{3,30}$/.test(input);
}

function fromUrl(input: string): { type: "channel" | "handle" | "user" | "custom" | "video"; value: string } | null {
  try {
    const parsed = new URL(input);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // Verify it's a YouTube URL
    if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
      return null;
    }

    if (host === "youtu.be" && parts[0]) {
      return { type: "video", value: parts[0] };
    }

    if (parts[0] === "watch") {
      const v = parsed.searchParams.get("v");
      if (v) return { type: "video", value: v };
    }

    if (parts[0] === "shorts" && parts[1]) {
      return { type: "video", value: parts[1] };
    }

    if (parts[0] === "channel" && parts[1]) {
      const channelId = parts[1];
      if (validateChannelId(channelId)) return { type: "channel", value: channelId };
    }

    if (parts[0]?.startsWith("@")) {
      const handle = parts[0];
      if (validateHandle(handle)) return { type: "handle", value: handle };
    }

    if (parts[0] === "user" && parts[1]) {
      const username = parts[1];
      if (validateUsername(username)) return { type: "user", value: username };
    }

    if (parts[0] === "c" && parts[1]) {
      const custom = parts[1];
      if (validateUsername(custom)) return { type: "custom", value: custom };
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveChannel(inputRaw: string) {
  const input = inputRaw.trim();

  // Early validation - reject obviously invalid input
  if (!input || input.length > 300) {
    throw new InputValidationError("Invalid channel input");
  }

  // Try direct channel ID
  if (validateChannelId(input)) {
    const c = await getChannelById(input);
    if (c) return c;
    throw new InputValidationError("Channel ID not found");
  }

  // Try handle format
  if (validateHandle(input)) {
    const c = await getChannelByHandle(input);
    if (c) return c;
    throw new InputValidationError("Handle not found");
  }

  // Try URL parsing
  const parsed = fromUrl(input);
  if (parsed) {
    if (parsed.type === "channel") {
      const c = await getChannelById(parsed.value);
      if (c) return c;
      throw new InputValidationError("Channel not found");
    }
    if (parsed.type === "handle") {
      const c = await getChannelByHandle(parsed.value);
      if (c) return c;
      throw new InputValidationError("Handle not found");
    }
    if (parsed.type === "user" || parsed.type === "custom") {
      const c = await getChannelByUsername(parsed.value);
      if (c) return c;
      throw new InputValidationError("Channel not found");
    }
    if (parsed.type === "video") {
      const videos = await getVideos([parsed.value]);
      if (videos.length > 0 && videos[0]?.snippet?.channelId) {
        const c = await getChannelById(videos[0].snippet.channelId);
        if (c) return c;
      }
      throw new InputValidationError("Video found, but channel resolving failed");
    }
  }

  // Try plain username (if it passes validation)
  if (validateUsername(input)) {
    const c = await getChannelByUsername(input);
    if (c) return c;
  }

  // Fallback: try to see if the input itself is a raw video ID (11 chars)
  if (/^[\w-]{11}$/.test(input)) {
    const videos = await getVideos([input]);
    if (videos.length > 0 && videos[0]?.snippet?.channelId) {
      const c = await getChannelById(videos[0].snippet.channelId);
      if (c) return c;
    }
  }

  throw new InputValidationError("Could not find channel from this input");
}

