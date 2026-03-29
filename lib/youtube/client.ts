import { env } from "@/lib/env";
import { YouTubeAPIError } from "@/lib/youtube/errors";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

type ChannelItem = {
  id: string;
  snippet: { title: string };
  contentDetails: { relatedPlaylists: { uploads: string } };
};

type PlaylistItem = {
  snippet: {
    resourceId: { videoId: string };
    publishedAt: string;
  };
};

type VideoItem = {
  id: string;
  snippet: {
    channelId: string;
    title: string;
    publishedAt: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
};

async function youtubeFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries({ ...params, key: env.YOUTUBE_API_KEY }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );

  const maxAttempts = 3;
  let lastError: YouTubeAPIError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 0 },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        let errorData: Record<string, unknown> | undefined;
        try {
          errorData = await res.json();
        } catch {
          // Response wasn't JSON
        }

        const error = YouTubeAPIError.fromResponse(res.status, errorData);

        // Don't retry on client errors (401, 403, 404)
        if (res.status >= 400 && res.status < 500) {
          throw error;
        }

        // Retry on server errors
        if (attempt < maxAttempts) {
          lastError = error;
          const jitter = Math.floor(Math.random() * 120);
          await new Promise((r) => setTimeout(r, 300 * attempt + jitter));
          continue;
        }

        throw error;
      }

      return (await res.json()) as T;
    } catch (error) {
      clearTimeout(timeout);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        lastError = YouTubeAPIError.fromTimeout();
        if (attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 120);
          await new Promise((r) => setTimeout(r, 300 * attempt + jitter));
          continue;
        }
        throw lastError;
      }

      // Handle typed errors
      if (error instanceof YouTubeAPIError) {
        if (attempt >= maxAttempts) throw error;
        lastError = error;
        const jitter = Math.floor(Math.random() * 120);
        await new Promise((r) => setTimeout(r, 300 * attempt + jitter));
        continue;
      }

      // Handle network errors
      lastError = YouTubeAPIError.fromNetworkError(error);
      if (attempt >= maxAttempts) throw lastError;
      const jitter = Math.floor(Math.random() * 120);
      await new Promise((r) => setTimeout(r, 300 * attempt + jitter));
    }
  }

  throw lastError || new YouTubeAPIError("UNKNOWN", "YouTube API call failed");
}

export async function getChannelById(channelId: string): Promise<ChannelItem | null> {
  const data = await youtubeFetch<{ items: ChannelItem[] }>("/channels", {
    part: "snippet,contentDetails",
    id: channelId
  });
  return data.items[0] ?? null;
}

export async function getChannelByHandle(handle: string): Promise<ChannelItem | null> {
  const data = await youtubeFetch<{ items: ChannelItem[] }>("/channels", {
    part: "snippet,contentDetails",
    forHandle: handle.replace(/^@/, "")
  });
  return data.items[0] ?? null;
}

export async function getChannelByUsername(username: string): Promise<ChannelItem | null> {
  const data = await youtubeFetch<{ items: ChannelItem[] }>("/channels", {
    part: "snippet,contentDetails",
    forUsername: username
  });
  return data.items[0] ?? null;
}

export async function getPlaylistVideoIds(uploadsPlaylistId: string, maxResults = 150) {
  const allItems: PlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;
  
  while (allItems.length < maxResults) {
    const fetchLimit = Math.min(maxResults - allItems.length, 50);
    const params: Record<string, string> = {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: String(fetchLimit)
    };
    if (nextPageToken) params.pageToken = nextPageToken;

    const resData = await youtubeFetch<{ items: PlaylistItem[]; nextPageToken?: string }>("/playlistItems", params);
    
    allItems.push(...resData.items);
    if (!resData.nextPageToken) break;
    nextPageToken = resData.nextPageToken;
  }

  return allItems.map((item) => ({
    id: item.snippet.resourceId.videoId,
    publishedAt: item.snippet.publishedAt
  }));
}

export async function getVideos(videoIds: string[]): Promise<VideoItem[]> {
  if (!videoIds.length) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) chunks.push(videoIds.slice(i, i + 50));
  
  // Parallelize chunk requests instead of awaiting serially
  const fetchPromises = chunks.map(chunk => 
    youtubeFetch<{ items: VideoItem[] }>("/videos", {
      part: "snippet,statistics,contentDetails",
      id: chunk.join(","),
      maxResults: "50"
    })
  );

  const results = await Promise.all(fetchPromises);
  const out: VideoItem[] = [];
  results.forEach(data => out.push(...data.items));
  
  return out;
}

/**
 * Utility to detect if a video is a Short based on its ISO-8601 duration
 */
export function parseIsShort(duration?: string) {
  if (!duration) return false;
  // Format: PT#H#M#S
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return false;
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  // Shorts are strictly < 60s, but we allow 65s buffer for edge cases/metadata lag
  return (h * 3600 + m * 60 + s) <= 65;
}

