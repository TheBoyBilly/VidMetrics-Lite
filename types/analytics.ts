export type InsightLabel = "Top Performer" | "Underperformer" | "Trending" | "Normal" | "Outlier";

export type VideoMetrics = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  velocityScore: number;
  performanceScore: number;
  isShort: boolean;
  labels: InsightLabel[];
};

export type SummaryStats = {
  videoCount: number;
  medianViews: number;
  averageEngagementRate: number;
  uploadsPerWeek: number;
  topTopic: string;
};

export type AnalyzeResponse = {
  channelId: string;
  channelTitle: string;
  generatedAt: string;
  summary: SummaryStats;
  videos: VideoMetrics[];
};
