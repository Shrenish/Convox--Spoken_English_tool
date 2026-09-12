import type { EvidenceItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const IMPACT_TONE = { High: "bad", Medium: "warn", Low: "neutral" } as const;

/** Evidence cards: every CORE score must point at a quoted transcript moment. */
export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (!evidence.length) {
    return <p className="px-5 py-4 text-xs text-slate-400">No evidence captured.</p>;
  }
  return (
    <div className="space-y-3 px-5 py-4">
      {evidence.map((e, i) => (
        <div key={i} className="rounded-xl border border-line/70 bg-surface-2/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="cool">{e.skill}</Badge>
            <Badge tone={IMPACT_TONE[e.impact as keyof typeof IMPACT_TONE] ?? "neutral"}>
              {e.impact}
            </Badge>
          </div>
          <p className="mt-2 border-l-2 border-accent/50 pl-2 text-sm italic text-slate-200">
            “{e.quote}”
          </p>
          <p className="mt-1.5 text-xs text-slate-400">{e.note}</p>
          {e.timestamp && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{e.timestamp}</p>
          )}
        </div>
      ))}
    </div>
  );
}