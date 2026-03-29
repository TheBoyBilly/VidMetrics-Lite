import type { VideoMetrics } from "@/types/analytics";

type SortBy = "views" | "engagement" | "date" | "score";
type Props = { videos: VideoMetrics[]; sortBy: SortBy; onSortBy: (sortBy: SortBy) => void };

const sortLabels: Array<{ key: SortBy; label: string }> = [
  { key: "score", label: "Performance" },
  { key: "views", label: "Views" },
  { key: "engagement", label: "Engagement" },
  { key: "date", label: "Date" }
];

export function VideoTable({ videos, sortBy, onSortBy }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <h3 className="text-xs font-bold tracking-widest text-slate-400">ALL VIDEOS</h3>
        <div className="flex flex-wrap gap-2">
          {sortLabels.map((item) => (
            <button
              key={item.key}
              onClick={() => onSortBy(item.key)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                sortBy === item.key 
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                  : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs text-slate-400">
            <tr>
              <th className="pb-2">Video</th>
              <th className="pb-2">Views</th>
              <th className="pb-2">ER</th>
              <th className="pb-2">Score</th>
              <th className="pb-2">Labels</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-t border-slate-800">
                <td className="py-3">
                  <div className="font-medium">{video.title}</div>
                  <div className="text-xs text-slate-400">{new Date(video.publishedAt).toLocaleDateString()}</div>
                </td>
                <td>{video.views.toLocaleString()}</td>
                <td>{(video.engagementRate * 100).toFixed(2)}%</td>
                <td>{video.performanceScore.toFixed(2)}</td>
                <td className="text-xs text-slate-300">
                  <div className="flex flex-wrap gap-1">
                    {video.labels.map(l => (
                      <span key={l} className={`inline-block rounded-md px-2 py-0.5 whitespace-nowrap ${
                        l === "Outlier" 
                          ? "border border-rose-500/50 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] font-bold tracking-wide" 
                          : "border border-slate-700 bg-slate-800 text-slate-300"
                      }`}>
                        {l === "Outlier" ? "Viral Breakout 🚀" : l}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
