import { NextRequest, NextResponse } from "next/server";
import { computeAnalysis } from "@/lib/analytics/compute";
import { apiError } from "@/lib/errors";
import { cacheKey, getCache, setCache } from "@/lib/cache/store";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { analyzeRequestSchema } from "@/lib/validation/schemas";
import { getPlaylistVideoIds, getVideos, parseIsShort } from "@/lib/youtube/client";
import { resolveChannel } from "@/lib/youtube/resolveChannel";
import { YouTubeAPIError, InputValidationError } from "@/lib/youtube/errors";
import type { AnalyzeResponse } from "@/types/analytics";



const inflight = new Map<string, Promise<AnalyzeResponse>>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Generate a request ID for tracing
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe logging - never logs sensitive data
 */
function logRequest(requestId: string, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${requestId}] ${message}`, meta ? JSON.stringify(meta) : "");
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    logRequest(requestId, "Analyze request received");

    // Rate limiting check
    const ip = extractClientIp(req.headers);
    const limit = checkRateLimit(ip);

    if (!limit.allowed) {
      logRequest(requestId, "Rate limit exceeded", { ip: ip.slice(0, 8) });
      return NextResponse.json(
        { error: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSec),
            "X-Request-ID": requestId
          }
        }
      );
    }

    // Parse and validate request
    const json = await req.json();
    const parsed = analyzeRequestSchema.safeParse(json);

    if (!parsed.success) {
      logRequest(requestId, "Invalid request payload", { errors: parsed.error.errors });
      return apiError(
        400,
        "Invalid request. Please provide channelInput and periodDays.",
        "INVALID_REQUEST",
        requestId
      );
    }

    const { channelInput, periodDays } = parsed.data;

    // Check cache
    const key = cacheKey(["analyze", channelInput.trim().toLowerCase(), periodDays]);
    const cached = getCache<AnalyzeResponse>(key);
    if (cached) {
      logRequest(requestId, "Cache hit", { key });
      return NextResponse.json(cached, { headers: { "X-Request-ID": requestId, "X-Cache": "HIT" } });
    }

    // Check inflight to deduplicate concurrent requests
    const running = inflight.get(key);
    if (running) {
      logRequest(requestId, "Joining inflight request", { key });
      const result = await running;
      return NextResponse.json(result, { headers: { "X-Request-ID": requestId, "X-Cache": "INFLIGHT" } });
    }

    // Build analysis
    logRequest(requestId, "Starting analysis", { channelInput: channelInput.slice(0, 20) });
    const job = buildAnalysis(channelInput, periodDays, requestId);
    inflight.set(key, job);

    const result = await job;
    setCache(key, result, CACHE_TTL_MS);
    inflight.delete(key);

    logRequest(requestId, "Analysis complete", { videoCount: result.videos.length });
    return NextResponse.json(result, { headers: { "X-Request-ID": requestId, "X-Cache": "MISS" } });
  } catch (error) {
    logRequest(requestId, "Unhandled error", { error: String(error) });
    return apiError(500, "An unexpected error occurred. Please try again.", "INTERNAL_ERROR", requestId);
  }
}

async function buildAnalysis(
  channelInput: string,
  periodDays: number,
  requestId: string
): Promise<AnalyzeResponse> {
  try {
    // Resolve channel
    let channel;
    try {
      channel = await resolveChannel(channelInput);
    } catch (error) {
      if (error instanceof InputValidationError) {
        logRequest(requestId, "Channel resolution failed", { reason: error.message });
        throw error;
      }
      throw error;
    }

    if (!channel) {
      throw new InputValidationError("Could not resolve channel");
    }

    logRequest(requestId, "Channel resolved", { channelId: channel.id });

    const uploadsId = channel.contentDetails.relatedPlaylists.uploads;

    // Get playlist items, up to 500 to cover 90 days of daily uploads
    const items = await getPlaylistVideoIds(uploadsId, 500);
    logRequest(requestId, "Playlist items fetched", { count: items.length });

    // Filter by date robustly using UTC days
    const cutoffDate = new Date();
    cutoffDate.setUTCHours(0, 0, 0, 0);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - periodDays);
    const cutoff = cutoffDate.getTime();

    const inRange = items.filter((item) => {
      if (!item.publishedAt) return false;
      const date = new Date(item.publishedAt);
      if (isNaN(date.getTime())) return false;
      return date.getTime() >= cutoff;
    });

    // If no videos in explicit date range, fallback to standard latest 50 to provide some MVP data
    const sourceIds = (inRange.length > 0 ? inRange : items.slice(0, 50))
      .slice(0, 200)
      .map((item) => item.id);

    logRequest(requestId, "Videos in range", { count: sourceIds.length });

    // Get video details
    const videos = await getVideos(sourceIds);
    logRequest(requestId, "Videos fetched", { count: videos.length });

    // Return empty response if no videos
    if (!videos.length) {
      return {
        channelId: channel.id,
        channelTitle: channel.snippet.title,
        generatedAt: new Date().toISOString(),
        summary: {
          videoCount: 0,
          medianViews: 0,
          averageEngagementRate: 0,
          uploadsPerWeek: 0,
          topTopic: "N/A"
        },
        videos: []
      };
    }

    // Transform video data
    const raw = videos.map((v) => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url ?? "",
      publishedAt: v.snippet.publishedAt,
      views: Number(v.statistics?.viewCount ?? 0),
      likes: Number(v.statistics?.likeCount ?? 0),
      comments: Number(v.statistics?.commentCount ?? 0),
      isShort: parseIsShort(v.contentDetails?.duration)
    }));

    // Compute analytics
    const result = computeAnalysis({
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      videos: raw
    });

    return result;
  } catch (error) {
    // Handle YouTube API errors
    if (error instanceof YouTubeAPIError) {
      logRequest(requestId, "YouTube API error", { type: error.type });
      throw error; // Let caller handle
    }

    // Handle validation errors
    if (error instanceof InputValidationError) {
      logRequest(requestId, "Validation error", { message: error.message });
      throw error;
    }

    // Unknown error
    logRequest(requestId, "Unknown error in buildAnalysis", { error: String(error) });
    throw error;
  }
}

