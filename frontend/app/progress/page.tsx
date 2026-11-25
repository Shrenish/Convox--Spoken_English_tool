"use client";

import { useCallback, useEffect, useState } from "react";
import { getProfile, getProgress } from "@/lib/api";
import type { LearnerProfileOut, ProgressSummary } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { TrendLine } from "@/components/progress/TrendLine";

export default function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [profile, setProfile] = useState<LearnerProfileOut | null>(null);
  const [lastSync, setLastSync] = useState<string>("");

  const fetchLive = useCallback(() => {
    Promise.all([getProgress(), getProfile()])
      .then(([s, p]) => {
        setSummary(s);
        setProfile(p);
        setLastSync(new Date().toLocaleTimeString());
      })
      .catch(() => {
        // keep existing data on transient error
      });
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 5000);
    window.addEventListener("focus", fetchLive);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", fetchLive);
    };
  }, [fetchLive]);

  if (!summary || !profile) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner label="Crunching your trajectory…" />
      </div>
    );
  }

  const isBaseline = summary.sessions_completed === 1;

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Performance Scorecard</h1>
          <p className="text-xs text-slate-400">
            Evidence-based communication evaluation across 14 CORE dimensions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ade80]/40 bg-[#4ade80]/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#4ade80]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" />
            Live DB Sync {lastSync ? `· ${lastSync}` : ""}
          </span>
          {isBaseline ? (
            <Badge tone="cool" className="self-start sm:self-auto py-1 px-3">
              🎯 Initial Speaking Baseline
            </Badge>
          ) : summary.sessions_completed > 1 ? (
            <Badge tone="good" className="self-start sm:self-auto py-1 px-3">
              📈 {summary.sessions_completed} Evaluated Sessions
            </Badge>
          ) : (
            <Badge tone="neutral" className="self-start sm:self-auto py-1 px-3">
              Calibrating
            </Badge>
          )}
        </div>
      </div>

      {/* Benchmark Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Readiness Score"
          value={`${summary.readiness.toFixed(1)}/10`}
          sub="Observable conversational competence"
        />
        <Stat
          label="Sessions Evaluated"
          value={String(summary.sessions_completed)}
          sub="Completed & forensic-scored"
        />
        <Stat
          label="Recovery Index"
          value={summary.sessions_completed > 0 ? summary.recovery_index.toFixed(2) : "–"}
          sub="Repair after conversational events"
        />
        <Stat
          label="Provisional Level"
          value="B1 — Intermediate"
          sub="Evidence-based estimate"
        />
      </div>

      {/* Trend trajectory over time */}
      <Card>
        <CardHeader
          title="Readiness trajectory"
          subtitle="Evaluation history — blue: readiness composite, green: recovery index"
        />
        <div className="px-3 py-4">
          <TrendLine trend={summary.trend} />
        </div>
      </Card>

      {/* CORE 14 Dimensions Breakdown (Language & Interaction) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Language Dimensions */}
        <Card className="p-5 space-y-4">
          <div className="border-b border-line pb-2">
            <h3 className="text-sm font-bold text-slate-100">Language Dimensions (CORE)</h3>
            <p className="text-[11px] text-slate-400">Grammar, vocabulary, and structural clarity</p>
          </div>
          <div className="space-y-3">
            {Object.entries(summary.language_scores).map(([dim, score]) => (
              <SkillBar key={dim} label={dim} score={score} tone="accent" />
            ))}
          </div>
        </Card>

        {/* Interaction Dimensions */}
        <Card className="p-5 space-y-4">
          <div className="border-b border-line pb-2">
            <h3 className="text-sm font-bold text-slate-100">Interaction Dimensions (CORE)</h3>
            <p className="text-[11px] text-slate-400">Turn-taking, conversational repair, and active listening</p>
          </div>
          <div className="space-y-3">
            {Object.entries(summary.interaction_scores).map(([dim, score]) => (
              <SkillBar key={dim} label={dim} score={score} tone="mint" />
            ))}
          </div>
        </Card>
      </div>

      {/* Priority Focus & Improvement Recommendations */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5 space-y-3">
          <CardHeader
            title="Focus areas"
            subtitle="Dimensions requiring evidence-based reinforcement"
          />
          <div className="flex flex-wrap gap-2 pt-2">
            {summary.weakest_dimensions.length ? (
              summary.weakest_dimensions.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs text-amber font-medium"
                >
                  {d.replace(/_/g, " ")}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-400">Complete more conversations to calibrate.</p>
            )}
          </div>
          {summary.recommended_focus && (
            <p className="text-xs text-slate-300 pt-1 leading-relaxed bg-surface-2 p-3 rounded-xl border border-line">
              💡 {summary.recommended_focus.replace(/\*\*/g, "")}
            </p>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <CardHeader
            title="Transfer Queue (Context Options)"
            subtitle="Indian English patterns → international alternatives (not corrections)"
          />
          <div className="space-y-2 pt-2">
            {profile.common_errors.length ? (
              profile.common_errors.map((e) => (
                <div
                  key={e.pattern}
                  className="rounded-xl border border-line/60 bg-surface-2/60 px-3.5 py-2.5 text-xs flex items-center justify-between"
                >
                  <span className="text-slate-300 font-medium">{e.pattern}</span>
                  {e.fix && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">→</span>
                      <span className="text-mint font-semibold">{e.fix}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3">
                No transfer patterns flagged yet. As you converse, context-specific expressions will appear here.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 flex flex-col justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="my-1.5 text-2xl font-extrabold text-slate-100">{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </Card>
  );
}

function SkillBar({
  label,
  score,
  tone,
}: {
  label: string;
  score: number | null;
  tone: "accent" | "mint";
}) {
  const displayScore = score != null ? score.toFixed(1) : "–";
  const pct = score != null ? Math.min(Math.max((score / 10) * 100, 0), 100) : 0;
  const barColor = tone === "accent" ? "bg-accent" : "bg-mint";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 capitalize">{label.replace(/_/g, " ")}</span>
        <span className="font-bold text-slate-100">
          {displayScore}
          <span className="text-[10px] font-normal text-slate-500">/10</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line/40">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
