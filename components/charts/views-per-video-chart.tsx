"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VideoMetrics } from "@/types/analytics";

type Props = { videos: VideoMetrics[] };

export function ViewsPerVideoChart({ videos }: Props) {
  const top = [...videos].sort((a, b) => b.views - a.views).slice(0, 12);
  const data = top.map((v) => ({
    title: v.title.length > 26 ? v.title.slice(0, 26) + "…" : v.title,
    views: v.views
  }));

  return (
    <div className="h-96 w-full rounded-2xl border border-white/5 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 text-xs font-bold tracking-widest text-slate-400">TOP VIDEOS BY VIEWS</div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 45 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
              <stop offset="100%" stopColor="#312e81" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
          <XAxis 
            dataKey="title" 
            tick={{ fill: "#94a3b8", fontSize: 10 }} 
            interval={0} 
            tickFormatter={(val) => val.length > 18 ? val.slice(0, 18) + "..." : val}
            angle={-35}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis 
            tick={{ fill: "#94a3b8", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => val >= 1000000 ? (val/1000000).toFixed(1)+'M' : val >= 1000 ? (val/1000).toFixed(0)+'K' : val}
          />
          <Tooltip 
            cursor={{ fill: "#ffffff", opacity: 0.05 }} 
            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)" }}
            itemStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
          />
          <Bar dataKey="views" fill="url(#barGradient)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

