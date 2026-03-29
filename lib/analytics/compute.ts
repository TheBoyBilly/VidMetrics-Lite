import type { AnalyzeResponse, InsightLabel, VideoMetrics } from "@/types/analytics";

type RawVideo = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  isShort: boolean;
};

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[index];
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function topTopic(titles: string[]) {
  const stop = new Set(["the", "a", "an", "to", "and", "how", "in", "of", "for", "on", "with", "this", "that", "it", "is", "my", "i", "we", "you", "vs"]);
  const counts = new Map<string, { count: number; isPhrase: boolean }>();

  titles.forEach((title) => {
    const rawWords = title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const words = rawWords.filter((w) => !stop.has(w) && w.length > 2 && !/^\d+$/.test(w));
    
    words.forEach((w) => {
      const curr = counts.get(w) || { count: 0, isPhrase: false };
      counts.set(w, { count: curr.count + 1, isPhrase: false });
    });

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words[i] + " " + words[i + 1];
      const curr = counts.get(phrase) || { count: 0, isPhrase: true };
      counts.set(phrase, { count: curr.count + 1, isPhrase: true });
    }
  });

  let maxScore = 0;
  let winner = "N/A";

  counts.forEach((data, text) => {
    // Favor 2-word phrases if they repeat
    const score = data.isPhrase && data.count > 1 ? data.count * 1.5 : data.count;
    if (score > maxScore) {
      maxScore = score;
      winner = text;
    }
  });

  if (winner !== "N/A") {
    return winner.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return "N/A";
}

export function computeAnalysis(params: {
  channelId: string;
  channelTitle: string;
  videos: RawVideo[];
}): AnalyzeResponse {
  const now = Date.now();
  const medianViews = median(params.videos.map((v) => v.views));
  const isEstablished = medianViews >= 50000;
  
  const weightViews = isEstablished ? 0.70 : 0.40;
  const weightEngage = isEstablished ? 0.15 : 0.40;
  const weightVelocity = isEstablished ? 0.15 : 0.20;

  const maxViews = Math.max(1, ...params.videos.map((v) => v.views));
  const maxEngage = Math.max(0.01, ...params.videos.map((v) => (v.likes + v.comments) / Math.max(v.views, 1)));
  const maxVelocity = Math.max(1, ...params.videos.map((v) => v.views / Math.max((now - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60), 1)));

  const videos: VideoMetrics[] = params.videos.map((video) => {
    const hoursSincePublish = Math.max((now - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60), 1);
    const engagementRate = (video.likes + video.comments) / Math.max(video.views, 1);
    const velocityScore = video.views / hoursSincePublish;

    const normViews = video.views / maxViews;
    const normEngage = engagementRate / maxEngage;
    const normVelocity = velocityScore / maxVelocity;

    const performanceScore = (normViews * weightViews) + (normEngage * weightEngage) + (normVelocity * weightVelocity);

    return { ...video, isShort: video.isShort, engagementRate, velocityScore, performanceScore, labels: ["Normal"] as InsightLabel[] };
  });

  const scores = [...videos.map(v => v.performanceScore)].sort((a, b) => a - b);
  const velocities = videos.map((v) => v.velocityScore).sort((a, b) => a - b);
  const p80 = percentile(scores, 80);
  const p20 = percentile(scores, 20);
  const velocityMedian = Math.max(1, percentile(velocities, 50));

  for (let i = 0; i < videos.length; i += 1) {
    const video = videos[i];
    const labels: InsightLabel[] = [];
    
    // Outlier Detection (Velocity > 300% of channel median)
    if (video.velocityScore > velocityMedian * 3 && video.views > medianViews) {
      labels.push("Outlier");
    }
    
    if (video.performanceScore >= p80) labels.push("Top Performer");
    if (video.performanceScore <= p20 && video.views < medianViews) labels.push("Underperformer");
    
    const publishedHoursAgo = (now - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60);
    if (publishedHoursAgo <= 72 && video.velocityScore > velocityMedian * 1.35) labels.push("Trending");
    
    video.labels = labels.length ? labels : ["Normal"];
  }

  const views = videos.map((v) => v.views);
  const engagementRates = videos.map((v) => v.engagementRate);
  const dateRangeDays =
    videos.length > 1
      ? Math.max(
          1,
          (new Date(videos[0].publishedAt).getTime() -
            new Date(videos[videos.length - 1].publishedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 7;

  return {
    channelId: params.channelId,
    channelTitle: params.channelTitle,
    generatedAt: new Date().toISOString(),
    summary: {
      videoCount: videos.length,
      medianViews: Math.round(median(views)),
      averageEngagementRate: engagementRates.length
        ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
        : 0,
      uploadsPerWeek: Number(((videos.length / dateRangeDays) * 7).toFixed(2)),
      topTopic: topTopic(videos.map((v) => v.title))
    },
    videos: videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  };
}
