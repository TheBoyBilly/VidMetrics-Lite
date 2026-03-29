"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VideoMetrics } from "@/types/analytics";

type Props = { videos: VideoMetrics[] };

export function ViewsEngagementChart({ videos }: Props) {
  // Sort chronologically for trading-style timeline
  const data = [...videos]
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map((v) => ({
      title: v.title.length > 30 ? v.title.slice(0, 30) + "..." : v.title,
      date: new Date(v.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      views: v.views,
      engagement: Number((v.engagementRate * 100).toFixed(2))
    }));

  return (
    <div className="h-96 w-full rounded-2xl border border-white/5 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs font-bold tracking-widest text-slate-400">PERFORMANCE TIMELINE</div>
        <div className="flex gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-indigo-400">
            <div className="h-2 w-2 rounded-full bg-indigo-500"></div> Views
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div> Engagement
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: "#64748b", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: "#64748b", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false}
            tickFormatter={(val) => val >= 1000000 ? (val/1000000).toFixed(1)+'M' : val >= 1000 ? (val/1000).toFixed(0)+'K' : val}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#64748b", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false}
            tickFormatter={(val) => val + "%"}
          />
          <Tooltip 
            cursor={{ stroke: "#334155", strokeWidth: 1, strokeDasharray: "4 4" }} 
            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)" }}
            labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontSize: "12px" }}
            itemStyle={{ fontSize: "13px", fontWeight: 600 }}
          />
          <Area yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#viewsGradient)" activeDot={{ r: 6, fill: "#818cf8", stroke: "#0f172a", strokeWidth: 2 }} />
          <Line yAxisId="right" type="monotone" dataKey="engagement" name="Engagement" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: "#34d399", stroke: "#0f172a", strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
