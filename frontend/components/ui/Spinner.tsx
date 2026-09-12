export function Spinner({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
      {label}
    </div>
  );
}