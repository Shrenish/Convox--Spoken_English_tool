"use client";

import { useEffect, useState } from "react";
import { getProfile, getProgress } from "@/lib/api";
import type { LearnerProfileOut, ProgressSummary } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { RadarChart } from "@/components/progress/RadarChart";
import { TrendLine } from "@/components/progress/TrendLine";

export default function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [profile, setProfile] = useState<LearnerProfileOut | null>(null);

  useEffect(() => {
    Promise.all([getProgress(), getProfile()])
      .then(([s, p]) => {
        setSummary(s);
        setProfile(p);
      })
      .catch(() => {
        setSummary(null);
        setProfile(null);
      });
  }, []);

  if (!summary || !profile) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner label="Crunching your trajectory…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Your progress</h1>
        <p className="text-xs text-slate-400">
          The learner model updates after every evaluated session — adaptive, evidence-driven.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Readiness" value={summary.readiness.toFixed(1)} />
        <Stat label="Sessions" value={String(summary.sessions_completed)} />
        <Stat label="Recovery index" value={summary.recovery_index.toFixed(2)} />
        <Stat label="Intl. gap" value={summary.intl_gap.toFixed(1)} />
      </div>

      <Card>
        <CardHeader title="Readiness over time" subtitle="last sessions — blue: readiness, green: recovery" />
        <div className="px-3 py-4">
          <TrendLine trend={summary.trend} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Language dimensions" />
          <div className="p-4">
            <RadarChart data={summary.language_scores} size={260} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Interaction dimensions" />
          <div className="p-4">
            <RadarChart data={summary.interaction_scores} size={260} color="#3dd68c" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Focus next" subtitle="weakest measured dimensions" />
          <div className="flex flex-wrap gap-2 p-4">
            {summary.weakest_dimensions.length ? (
              summary.weakest_dimensions.map((d) => (
                <Badge key={d} tone="warn">{d.replace(/_/g, " ")}</Badge>
              ))
            ) : (
              <p className="text-xs text-slate-400">Complete a session to calibrate.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Transfer queue" subtitle="Indian-English patterns → alternatives (not corrections)" />
          <div className="space-y-2 p-4">
            {profile.common_errors.length ? (
              profile.common_errors.map((e) => (
                <div key={e.pattern} className="rounded-lg border border-line/60 bg-surface-2/50 px-3 py-2 text-xs">
                  <span className="text-slate-300">{e.pattern}</span>
                  {e.fix ? (
                    <>
                      <span className="mx-2 text-slate-500">→</span>
                      <span className="text-mint">{e.fix}</span>
                    </>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                Nothing flagged yet. As you practice, useful alternatives will show up here.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
    </Card>
  );
}