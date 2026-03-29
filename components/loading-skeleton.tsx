"use client";

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-full animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900"
          />
        ))}
      </div>
      <div className="h-72 w-full animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
      <div className="h-96 w-full animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
    </div>
  );
}

