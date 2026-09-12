import type { TravelStageOut } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const STATUS_META = {
  completed: { dot: "bg-mint", badge: <Badge tone="good">done</Badge>, icon: "✓" },
  active: { dot: "bg-accent pulse-ring", badge: <Badge tone="cool">active</Badge>, icon: "●" },
  locked: { dot: "bg-line", badge: <Badge tone="neutral">locked</Badge>, icon: "🔒" },
} as const;

/** Vertical "road" of the survival journey: 8 stages in order. */
export function JourneyMap({
  stages,
  onStart,
  busyKey,
}: {
  stages: TravelStageOut[];
  onStart?: (stageKey: string) => void;
  busyKey?: string | null;
}) {
  return (
    <ol className="space-y-2">
      {stages.map((s) => {
        const meta = STATUS_META[s.status as keyof typeof STATUS_META] ?? STATUS_META.locked;
        const isBusy = busyKey === s.stage_key;
        return (
          <li key={s.stage_key} className="flex items-center gap-3">
            <div className="flex flex-col items-center self-stretch">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${meta.dot} ${meta.icon === "●" ? "text-white" : meta.icon === "✓" ? "text-ink" : ""}`}>
                {meta.icon}
              </span>
              {s.stage_index < stages.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className={`flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2 ${s.status === "active" ? "border-accent/50 bg-accent/5" : "border-line/60 bg-surface-2/50"}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{s.title}</p>
                <p className="text-[11px] text-slate-400">
                  {s.status === "completed" && s.score != null ? `score ${s.score.toFixed(1)}` : s.stage_key}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {meta.badge}
                {s.status === "active" && onStart && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(s.stage_key);
                    }}
                    disabled={isBusy}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-soft/90 disabled:opacity-50"
                  >
                    {isBusy ? "Starting…" : "Start"}
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}