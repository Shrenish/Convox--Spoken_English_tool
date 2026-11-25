"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAutopsy } from "@/lib/api";
import type { AutopsyOut } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { EvidenceList } from "@/components/autopsy/EvidenceList";
import { EventTimeline } from "@/components/autopsy/EventTimeline";
import { RadarChart } from "@/components/progress/RadarChart";

const CONF_TONE: Record<string, "good" | "cool" | "warn" | "bad" | "neutral"> = {
  "HIGH CONFIDENCE": "good",
  "MODERATE CONFIDENCE": "cool",
  "LOW CONFIDENCE": "warn",
  "UNABLE TO ASSESS": "bad",
};

export default function AutopsyPage({ params }: { params: { id: string } }) {
  const [autopsy, setAutopsy] = useState<AutopsyOut | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAutopsy(params.id)
      .then(setAutopsy)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load the autopsy."));
  }, [params.id]);

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">{error}</p>
        <Link href="/">
          <Button variant="secondary">Back to practice</Button>
        </Link>
      </div>
    );
  }
  if (!autopsy?.evaluation) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner label="Running your CORE evaluation…" />
      </div>
    );
  }

  const { evaluation, evidence, events, recommended_focus } = autopsy;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Conversation autopsy</h1>
          <p className="text-xs text-slate-400">
            Every score below is tied to a quote from your transcript — nothing fabricated.
          </p>
        </div>
        <Link href="/">
          <Button size="sm" variant="secondary">Practice again →</Button>
        </Link>
      </div>

      {/* Score band */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Communication readiness</p>
            <p className="text-5xl font-extrabold text-accent-soft">
              {evaluation.readiness_score != null ? evaluation.readiness_score.toFixed(1) : "—"}
              <span className="text-lg text-slate-500">/10</span>
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Metric
              label="Recovery index"
              value={evaluation.recovery_index != null ? evaluation.recovery_index.toFixed(2) : "—"}
            />
            <Metric
              label="Vocab recovery"
              value={evaluation.vocab_recovery_index != null ? evaluation.vocab_recovery_index.toFixed(2) : "—"}
            />
            <Metric
              label="Intl. gap"
              value={evaluation.intl_gap != null ? evaluation.intl_gap.toFixed(1) : "—"}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Confidence</span>
              <Badge tone={CONF_TONE[evaluation.confidence] ?? "neutral"}>{evaluation.confidence}</Badge>
            </div>
          </div>
        </div>
        {recommended_focus.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
            <span className="text-xs text-slate-400">Work on:</span>
            {recommended_focus.map((d) => (
              <Badge key={d} tone="cool">{d.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Radar */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Language competence" subtitle="fluency · grammar · vocabulary · pronunciation · coherence" />
          <div className="p-4">
            <RadarChart data={evaluation.language_scores} size={260} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Interaction competence" subtitle="how you listen, repair, adapt and achieve" />
          <div className="p-4">
            <RadarChart data={evaluation.interaction_scores} size={260} color="#3dd68c" />
          </div>
        </Card>
      </div>

      {/* Evidence + events */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Evidence" subtitle={`${evidence.length} moments with quotes`} />
          <EvidenceList evidence={evidence} />
        </Card>
        <Card>
          <CardHeader title="Controlled events" subtitle="what the scenario threw at you" />
          <EventTimeline events={autopsy.events} />
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}