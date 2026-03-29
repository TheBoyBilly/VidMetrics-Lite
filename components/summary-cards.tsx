import type { SummaryStats } from "@/types/analytics";

type Props = { summary: SummaryStats };

export function SummaryCards({ summary }: Props) {
  const items = [
    { label: "Videos", value: summary.videoCount.toLocaleString() },
    { label: "Median Views", value: summary.medianViews.toLocaleString() },
    { label: "Avg Engagement", value: `${(summary.averageEngagementRate * 100).toFixed(2)}%` },
    { label: "Uploads / Week", value: summary.uploadsPerWeek.toString() },
    { label: "Top Topic", value: summary.topTopic }
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl"></div>
          <p className="text-xs font-bold tracking-wider text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
