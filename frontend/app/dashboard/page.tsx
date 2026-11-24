"use client";

/**
 * Dashboard — the authenticated learner's home.
 * Shows readiness score, recommended scenario, quick stats and scenario picker.
 * Requires auth — redirects to / if unauthenticated.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getProgress, listScenarios, recommendScenario } from "@/lib/api";
import type { ProgressSummary, ScenarioOut, ScenarioRecommendation } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

function stripMarkdown(text: string) {
  return text.replace(/\*\*/g, "");
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [recommend, setRecommend] = useState<ScenarioRecommendation | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioOut[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
    if (!authLoading && user && !user.onboarding_completed) {
      router.replace("/onboarding");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [rec, prog, list] = await Promise.all([
          recommendScenario(),
          getProgress(),
          listScenarios(),
        ]);
        setRecommend(rec);
        setProgress(prog);
        setScenarios(list.filter((s) => s.category === "core" && !s.stage_key).slice(0, 6));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Backend unreachable.");
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user]);

  if (authLoading || (!user && !error)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <section className="rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-surface-2 px-6 py-8">
        <Badge tone="cool">
          {user.communication_context ?? "Communication simulator"}
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-50">
          Welcome back, {user.display_name.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Continue building your confidence through realistic conversations.
          Every session gives you evidence-based feedback, not just scores.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/assessment">
            <Button size="lg" className="bg-gradient-to-r from-accent to-accent-soft hover:opacity-90">
              Check English Proficiency →
            </Button>
          </Link>
          {recommend && (
            <Link href={`/conversation?scenario=${recommend.scenario_key}`}>
              <Button size="lg" variant="secondary">
                Practice → <span className="font-normal opacity-80 ml-1">{recommend.title}</span>
              </Button>
            </Link>
          )}
          <Link href="/travel">
            <Button size="lg" variant="secondary">
              Global Survival Journey 🌍
            </Button>
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
          {error} — ensure the backend is running on port 8000.
        </div>
      )}

      {/* Stats row */}
      {!dataLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Communication readiness
            </p>
            <p className="mt-2 text-4xl font-extrabold text-accent-soft">
              {progress?.readiness != null ? progress.readiness.toFixed(1) : "–"}
              <span className="text-base font-medium text-slate-500">/10</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {progress?.sessions_completed ?? 0} session
              {(progress?.sessions_completed ?? 0) === 1 ? "" : "s"} completed
              {progress?.recovery_index != null && (progress?.sessions_completed ?? 0) > 0
                ? ` · recovery ${progress.recovery_index.toFixed(2)}`
                : ""}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Communication context
            </p>
            <p className="mt-2 text-lg font-bold text-slate-100">
              {user.communication_context ?? "Not set"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{user.country ?? ""}</p>
          </Card>

          <Card className="p-5 md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Today's recommendation</p>
            {recommend ? (
              <>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {recommend.title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400 line-clamp-2">
                  {stripMarkdown(recommend.reason)}
                </p>
                <Badge tone="neutral" className="mt-2">
                  difficulty {recommend.difficulty.toFixed(0)}/10
                </Badge>
              </>
            ) : (
              <Spinner />
            )}
          </Card>
        </div>
      )}

      {dataLoading && (
        <div className="flex h-32 items-center justify-center">
          <Spinner label="Loading your data…" />
        </div>
      )}

      {/* Focus areas */}
      {progress?.weakest_dimensions && progress.weakest_dimensions.length > 0 && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
            Areas to focus on
          </p>
          <div className="flex flex-wrap gap-2">
            {progress.weakest_dimensions.map((dim) => (
              <span
                key={dim}
                className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs text-amber"
              >
                {dim}
              </span>
            ))}
          </div>
          {progress.recommended_focus && (
            <p className="mt-3 text-xs text-slate-400">
              {stripMarkdown(progress.recommended_focus)}
            </p>
          )}
        </Card>
      )}

      {/* Quick scenario picker */}
      {!dataLoading && scenarios.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Or pick a conversation</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenarios.map((s) => (
              <Link key={s.scenario_key} href={`/conversation?scenario=${s.scenario_key}`}>
                <Card className="h-full p-4 transition-colors hover:border-accent/50">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-100">{s.title}</h4>
                    <Badge tone="neutral">{s.environment}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {s.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
