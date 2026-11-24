"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProgress, getProfile } from "@/lib/api";
import type { ProgressSummary, LearnerProfileOut } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function AssessmentHubPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [profile, setProfile] = useState<LearnerProfileOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProgress(), getProfile()])
      .then(([s, p]) => {
        setSummary(s);
        setProfile(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sessions = summary?.sessions_completed ?? 0;
  const readiness = summary?.readiness ?? 0;

  // Derive estimated CEFR tier from evaluated performance
  const cefrTier =
    sessions === 0
      ? "Not Calibrated"
      : readiness >= 8.0
      ? "C1 — Advanced"
      : readiness >= 6.5
      ? "B2 — Upper Intermediate"
      : readiness >= 4.5
      ? "B1 — Intermediate"
      : "A2 — Elementary";

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Proficiency Header */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-surface-2 p-6 sm:p-8">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="cool">Forensic Proficiency Check</Badge>
              <Badge tone={sessions > 0 ? "good" : "warn"}>
                {sessions > 0 ? `${sessions} Verified Sessions` : "Initial Baseline Needed"}
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">
              English Communication Status
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              Check your verified spoken English ability across 14 CORE dimensions, evaluate your readiness gaps, and follow customized scenario training.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-line/80 bg-surface-2/80 p-5 min-w-[200px] text-center shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Provisional Level
            </span>
            <span className="text-2xl font-black text-accent-soft my-1">
              {cefrTier}
            </span>
            <span className="text-xs text-slate-400">
              Readiness: <strong className="text-slate-200">{sessions > 0 ? readiness.toFixed(1) : "–"} / 10</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 3-Step Proficiency & Training Journey */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>🎯</span> Your Assessment & Growth Cycle
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Step 1 */}
          <Card className="p-5 flex flex-col justify-between space-y-4 border-accent/40 bg-gradient-to-b from-surface to-surface-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent-soft font-bold text-xs">
                  1
                </span>
                <Badge tone="cool">Trial Speaking Test</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-100">Establish Your Baseline</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a 3-4 minute conversational diagnostic with an AI partner. Discuss interests, introduce yourself, and handle unexpected questions.
              </p>
            </div>
            <Link href="/conversation?scenario=introduce_classmate">
              <Button className="w-full" size="sm">
                Start Trial Assessment →
              </Button>
            </Link>
          </Card>

          {/* Step 2 */}
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint/20 text-mint font-bold text-xs">
                  2
                </span>
                <Badge tone="good">Autopsy & Scorecard</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-100">Forensic Evaluation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review your 14 CORE scores with verifiable quotes from your speech. Identify exactly where grammar, vocabulary, or turn-taking dropped.
              </p>
            </div>
            <Link href="/progress">
              <Button variant="secondary" className="w-full" size="sm">
                View Full Scorecard →
              </Button>
            </Link>
          </Card>

          {/* Step 3 */}
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/20 text-amber font-bold text-xs">
                  3
                </span>
                <Badge tone="warn">Targeted Scenarios</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-100">Targeted Adaptive Training</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Practice specific scenarios that deliberately target your weakest dimensions and train international alternatives.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="secondary" className="w-full" size="sm">
                Go to Training Hub →
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Dimension Self-Check Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Current Evaluated Breakdown</h2>
            <p className="text-xs text-slate-400">Derived only from verified speech turns in completed conversations.</p>
          </div>
          {sessions === 0 && (
            <Badge tone="warn">Uncalibrated</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner label="Loading evaluation dimensions…" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent-soft">
                Language Dimensions
              </h3>
              <div className="space-y-2.5">
                {summary && Object.keys(summary.language_scores).length > 0 ? (
                  Object.entries(summary.language_scores).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-line/30 last:border-none">
                      <span className="text-slate-300 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-slate-100">{v != null ? `${v.toFixed(1)}/10` : "Not Assessed"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4">No speech turns evaluated yet.</p>
                )}
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mint">
                Interaction Dimensions
              </h3>
              <div className="space-y-2.5">
                {summary && Object.keys(summary.interaction_scores).length > 0 ? (
                  Object.entries(summary.interaction_scores).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-line/30 last:border-none">
                      <span className="text-slate-300 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-slate-100">{v != null ? `${v.toFixed(1)}/10` : "Not Assessed"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4">No speech turns evaluated yet.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
