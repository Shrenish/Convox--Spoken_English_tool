export function Spinner({
  label,
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md";
}) {
  const ring =
    size === "sm"
      ? "h-3.5 w-3.5 border-[1.5px]"
      : "h-4 w-4 border-2";
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span
        className={`${ring} animate-spin rounded-full border-accent/40 border-t-accent`}
      />
      {label}
    </div>
  );
}
