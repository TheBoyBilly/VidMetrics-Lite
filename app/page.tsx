"use client";

import { useMemo, useState } from "react";
import { ChannelInput } from "@/components/channel-input";
import { SummaryCards } from "@/components/summary-cards";
import type { AnalyzeResponse, InsightLabel } from "@/types/analytics";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import dynamic from "next/dynamic";

const ViewsEngagementChart = dynamic(() => import("@/components/charts/views-engagement-chart").then(mod => mod.ViewsEngagementChart), { ssr: false });
const ViewsPerVideoChart = dynamic(() => import("@/components/charts/views-per-video-chart").then(mod => mod.ViewsPerVideoChart), { ssr: false });
const EngagementByLabelChart = dynamic(() => import("@/components/charts/engagement-by-label-chart").then(mod => mod.EngagementByLabelChart), { ssr: false });
const VideoTable = dynamic(() => import("@/components/video-table").then(mod => mod.VideoTable), { ssr: false });

type SortBy = "views" | "engagement" | "date" | "score";
type LabelFilter = "All" | InsightLabel;

function isLikelyValidChannelInput(inputRaw: string) {
  const input = inputRaw.trim();
  if (!input) return false;
  if (/^UC[\w-]{22}$/.test(input)) return true;
  if (/^@[\w-]{2,}$/.test(input)) return true;

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const isYouTubeDomain = host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be";
    if (!isYouTubeDomain) return false;

    const parts = url.pathname.split("/").filter(Boolean);
    const first = parts[0];
    if (host === "youtu.be") return parts[0]?.length > 0;

    if (first === "channel" && parts[1]) return true;
    if (first === "user" && parts[1]) return true;
    if (first === "c" && parts[1]) return true;
    if (first?.startsWith("@")) return true;
    if (first === "watch") return true;
    if (first === "shorts") return true;
    return false;
  } catch {
    // Allow plain username formats (e.g., channel name isn't reliably parseable)
    return input.length >= 2;
  }
}

export default function HomePage() {
  const [channelInput, setChannelInput] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [formatFilter, setFormatFilter] = useState<"All" | "Videos" | "Shorts">("All");
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  async function onAnalyze() {
    setError(null);
    const trimmed = channelInput.trim();
    if (!isLikelyValidChannelInput(trimmed)) {
      setError("Please enter a valid YouTube channel URL, @handle, or channel id.");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelInput: trimmed, periodDays })
      });
      if (!res.ok) throw new Error("Analysis failed");
      const payload = (await res.json()) as AnalyzeResponse;
      setData(payload);
    } catch {
      setError("Could not analyze this channel. Please verify the input and try again.");
    } finally {
      setLoading(false);
    }
  }

  const visibleVideos = useMemo(() => {
    if (!data) return [];
    let videos = [...data.videos];
    if (formatFilter === "Shorts") videos = videos.filter((v) => v.isShort);
    if (formatFilter === "Videos") videos = videos.filter((v) => !v.isShort);
    if (labelFilter !== "All") {
      videos = videos.filter((v) => v.labels.includes(labelFilter));
    }
    if (sortBy === "views") videos.sort((a, b) => b.views - a.views);
    if (sortBy === "engagement") videos.sort((a, b) => b.engagementRate - a.engagementRate);
    if (sortBy === "date") videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    if (sortBy === "score") videos.sort((a, b) => b.performanceScore - a.performanceScore);
    return videos;
  }, [data, labelFilter, formatFilter, sortBy]);

  function exportToCsv() {
    if (!data) return;
    const headers = ["Title", "Date", "Views", "Likes", "Engagement", "Score", "Format", "Labels"];
    const rows = visibleVideos.map((v) => [
      `"${v.title.replace(/"/g, '""')}"`,
      new Date(v.publishedAt).toLocaleDateString(),
      v.views,
      v.likes,
      (v.engagementRate * 100).toFixed(2) + "%",
      v.performanceScore.toFixed(3),
      v.isShort ? "Short" : "Long Form",
      `"${v.labels.join(", ")}"`
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vidmetrics-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="text-center">
        <div className="mb-4 inline-flex items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          Enterprise Analytics
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
          VidMetrics <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Lite</span>
        </h1>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-m">
          Deep structural analysis for any YouTube channel. Pinpoint outlier velocities, evaluate engagement retention, and uncover high-performing formats instantly.
        </p>
      </header>

      <ChannelInput value={channelInput} onChange={setChannelInput} onSubmit={onAnalyze} loading={loading} />

      {loading && <LoadingSkeleton />}

      {error && <div className="rounded-xl border border-rose-700 bg-rose-950/30 p-4 text-rose-200">{error}</div>}

      {data && data.videos.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          No videos found for this channel in the last {periodDays} days.
        </div>
      )}

      {data && data.videos.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <div className="mb-2 text-xs font-bold tracking-widest text-slate-400">TIME WINDOW</div>
                <div className="flex flex-wrap gap-2">
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPeriodDays(d)}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        periodDays === d ? "border-indigo-500 bg-indigo-600/30 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                      disabled={loading}
                    >
                      Last {d} days
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={exportToCsv} 
                className="mt-4 sm:mt-0 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold tracking-widest text-indigo-300 transition-colors hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
              >
                DOWNLOAD CSV ⬇
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="mb-3 text-xs font-bold tracking-widest text-slate-400">CONTENT FORMAT</div>
                <div className="flex flex-wrap gap-2">
                  {(["All", "Videos", "Shorts"] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setFormatFilter(format)}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        formatFilter === format ? "border-indigo-500 bg-indigo-600/30 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                      disabled={loading}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-bold tracking-widest text-slate-400">PERFORMANCE LABELS</div>
                <div className="flex flex-wrap gap-2">
                  {(["All", "Outlier", "Top Performer", "Underperformer", "Trending"] as LabelFilter[]).map((label) => (
                    <button
                      key={label}
                      onClick={() => setLabelFilter(label)}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        labelFilter === label ? "border-indigo-500 bg-indigo-600/30 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                      disabled={loading}
                    >
                      {label === "Outlier" ? "🚀 Outlier" : label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-400 pt-2 border-t border-white/5">
              Showing {visibleVideos.length} of {data.videos.length} videos
            </div>
          </div>

          {visibleVideos.length === 0 ? (
             <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-12 text-center shadow-2xl backdrop-blur-xl">
               <span className="text-5xl block mb-6">📭</span>
               <h3 className="text-xl font-bold text-white tracking-wide">No {formatFilter !== "All" ? formatFilter : "Videos"} Found</h3>
               <p className="mt-3 text-slate-400">There are no videos matching the current length or performance filters in the last {periodDays} days for this channel.</p>
             </div>
          ) : (
            <>
              <SummaryCards summary={data.summary} />
              <ViewsEngagementChart videos={visibleVideos} />
              <ViewsPerVideoChart videos={visibleVideos} />
              <EngagementByLabelChart videos={visibleVideos} />
              <VideoTable videos={visibleVideos} sortBy={sortBy} onSortBy={setSortBy} />
            </>
          )}
        </div>
      )}
    </main>
  );
}
