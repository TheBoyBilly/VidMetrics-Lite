import { prisma } from "@/lib/db/prisma";
import { computeAnalysis } from "@/lib/analytics/compute";
import { getChannelById, getPlaylistVideoIds, getVideos } from "@/lib/youtube/client";

export async function refreshTrackedChannel(channelId: string, periodDays = 30) {
  // Resolve latest channel state from YouTube.
  const ytChannel = await getChannelById(channelId);
  if (!ytChannel) return { refreshed: false, reason: "Channel not found on YouTube" };

  const uploadsPlaylistId = ytChannel.contentDetails.relatedPlaylists.uploads;

  const items = await getPlaylistVideoIds(uploadsPlaylistId, 50);
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const inRange = items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
  const sourceIds = (inRange.length ? inRange : items).slice(0, 50).map((item) => item.id);

  const videos = await getVideos(sourceIds);

  const raw = videos.map((v) => ({
    id: v.id,
    title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url ?? "",
    publishedAt: v.snippet.publishedAt,
    views: Number(v.statistics?.viewCount ?? 0),
    likes: Number(v.statistics?.likeCount ?? 0),
    comments: Number(v.statistics?.commentCount ?? 0)
  }));

  const analysis = computeAnalysis({
    channelId: ytChannel.id,
    channelTitle: ytChannel.snippet.title,
    videos: raw
  });

  // Update channel metadata before inserting snapshots.
  await prisma.channel.upsert({
    where: { id: ytChannel.id },
    update: { title: ytChannel.snippet.title, uploadsPlaylistId },
    create: { id: ytChannel.id, title: ytChannel.snippet.title, uploadsPlaylistId }
  });

  const analysisRun = await prisma.analysisRun.create({
    data: {
      channelId: ytChannel.id,
      periodDays,
      videoCount: analysis.videos.length
    }
  });

  for (const video of analysis.videos) {
    await prisma.video.upsert({
      where: { id: video.id },
      update: { title: video.title, publishedAt: new Date(video.publishedAt) },
      create: {
        id: video.id,
        channelId: ytChannel.id,
        title: video.title,
        publishedAt: new Date(video.publishedAt)
      }
    });

    await prisma.videoSnapshot.create({
      data: {
        analysisRunId: analysisRun.id,
        videoId: video.id,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        engagementRate: video.engagementRate,
        performanceScore: video.performanceScore,
        velocityScore: video.velocityScore
      }
    });
  }

  return {
    refreshed: true,
    channelId: ytChannel.id,
    analysisRunId: analysisRun.id,
    videoCount: analysis.videos.length
  };
}

