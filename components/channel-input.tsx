"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

export function ChannelInput({ value, onChange, onSubmit, loading }: Props) {
  return (
    <form
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl transition-all"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit();
      }}
    >
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl"></div>
      <div className="relative z-10">
        <label htmlFor="channel-input" className="mb-3 block text-sm font-medium text-slate-300">
          Analyze Any YouTube Channel
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="channel-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. https://youtube.com/@MrBeast"
            className="w-full flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none ring-indigo-500 transition-all focus:border-indigo-500 focus:bg-slate-900 focus:ring-2"
            aria-label="YouTube channel input"
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="relative overflow-hidden rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold tracking-wide text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>
    </form>
  );
}
