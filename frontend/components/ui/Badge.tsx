import type { HTMLAttributes } from "react";

type Tone = "neutral" | "good" | "warn" | "bad" | "cool";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-slate-300 border-line",
  good: "bg-mint/12 text-mint border-mint/30",
  warn: "bg-amber/12 text-amber border-amber/30",
  bad: "bg-rose/12 text-rose border-rose/30",
  cool: "bg-accent/12 text-accent-soft border-accent/30",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}