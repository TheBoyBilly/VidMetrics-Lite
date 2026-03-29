"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VideoMetrics, InsightLabel } from "@/types/analytics";

type Props = { videos: VideoMetrics[] };

type BucketLabel = Exclude<InsightLabel, "Normal">;

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function EngagementByLabelChart({ videos }: Props) {
  const buckets: BucketLabel[] = ["Top Performer", "Underperformer", "Trending"];

  const data = buckets.map((label) => {
    const relevant = videos.filter((v) => v.labels.includes(label));
    if (!relevant.length) return null;
    const engagementRate = avg(relevant.map((v) => v.engagementRate));
    return {
      label,
      engagementPct: Number((engagementRate * 100).toFixed(2))
    };
  }).filter(Boolean);

  return (
    <div className="h-80 w-full rounded-2xl border border-white/5 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 text-xs font-bold tracking-widest text-slate-400">ENGAGEMENT BY LABEL</div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
          <XAxis 
            dataKey="label" 
            tick={{ fill: "#94a3b8", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            dy={10} 
          />
          <YAxis 
            tick={{ fill: "#94a3b8", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => val + '%'}
          />
          <Tooltip 
            cursor={{ fill: "#ffffff", opacity: 0.05 }} 
            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)" }}
            itemStyle={{ color: "#c084fc", fontWeight: 600 }}
            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
          />
          <Bar dataKey="engagementPct" fill="url(#greenGradient)" radius={[6, 6, 0, 0]} maxBarSize={60} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

