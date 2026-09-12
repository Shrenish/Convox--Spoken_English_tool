import { Badge } from "@/components/ui/Badge";

export interface InjectedEvent {
  event_type: string;
  description: string;
  trigger_turn: number;
  resolved: boolean;
  resolution_turn?: number | null;
}

const ICON: Record<string, string> = {
  misunderstanding: "🔀",
  disagreement: "⚖️",
  time_pressure: "⏱️",
  topic_shift: "↔️",
  vocabulary_gap: "🕳️",
  interruption: "✂️",
  unfamiliar_context: "🌍",
  new_information: "📨",
};

export function EventTimeline({ events }: { events: InjectedEvent[] }) {
  if (!events.length) {
    return <p className="px-5 py-4 text-xs text-slate-400">No scripted events were injected.</p>;
  }
  return (
    <ol className="relative space-y-4 px-5 py-4">
      {events.map((ev, i) => (
        <li key={`${ev.event_type}-${ev.trigger_turn}-${i}`} className="relative flex gap-3">
          {i < events.length - 1 && (
            <span className="absolute left-[13px] top-7 h-full w-px bg-line" />
          )}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm">
            {ICON[ev.event_type] ?? "⚡"}
          </span>
          <div className="pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {ev.event_type.replace(/_/g, " ")}
              </span>
              <Badge tone={ev.resolved ? "good" : "bad"}>
                {ev.resolved ? `recovered${ev.resolution_turn != null ? ` · turn ${ev.resolution_turn}` : ""}` : "not recovered"}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{ev.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}