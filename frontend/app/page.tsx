"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHealth, getProgress, listScenarios, recommendScenario } from "@/lib/api";
import type { Health, ProgressSummary, ScenarioOut, ScenarioRecommendation } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

function stripMarkdown(text: string) {
  return text.replace(/\*\*/g, "");
}

export default function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [recommend, setRecommend] = useState<ScenarioRecommendation | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioOut[]>([]);
  const [loadId, setLoadId] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [h, rec, prog, list] = await Promise.all([
          getHealth(),
          recommendScenario(),
          getProgress(),
          listScenarios(),
        ]);
        setHealth(h);
        setRecommend(rec);
        setProgress(prog);
        setScenarios(list.filter((s) => s.category === "core" && !s.stage_key).slice(0, 6));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Backend unreachable.");
      } finally {
        setLoadId(false);
      }
    })();
  }, []);

  const missingKeys = health
    ? [
        health.configured.anthropic ? null : "Anthropic (conversation & evaluation)",
        health.configured.groq ? null : "Groq (voice → text)",
        health.configured.openai ? null : "OpenAI (text → voice)",
      ].filter(Boolean)
    : [];

  if (loadId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Warming up your coach…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-surface-2 px-6 py-8">
        <Badge tone="cool">Adaptive communication simulator</Badge>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-50">
          Speak out loud.
          <br />
          <span className="text-accent-soft">Learn</span>, then go global.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Practice real conversations with AI partners — a classmate, a professor, an interviewer, a
          travel agent. After every session you get a CORE evaluation with proof, not vibes.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {recommend && (
            <Link href={`/conversation?scenario=${recommend.scenario_key}`}>
              <Button size="lg">
                {`Start today's session → ${recommend.title}`}
              </Button>
            </Link>
          )}
          <Link href="/travel">
            <Button size="lg" variant="secondary">Explore Travel mode</Button>
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
          {error} — start the backend with <code className="rounded bg-ink px-1">uvicorn app.main:app</code>.
        </div>
      )}

      {missingKeys.length > 0 && health && (
        <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-xs text-amber">
          🔑 Add keys to <code className="rounded bg-ink px-1">backend/.env</code> to unlock:{" "}
          {missingKeys.join(", ")}. The app still works in text mode.
        </div>
      )}

      {/* Readiness + today's recommendation */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Communication readiness</p>
          <p className="mt-2 text-4xl font-extrabold text-accent-soft">
            {progress?.readiness.toFixed(1) ?? "–"}
            <span className="text-base font-medium text-slate-500">/10</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {progress?.sessions_completed ?? 0} session{(progress?.sessions_completed ?? 0) === 1 ? "" : "s"} completed
            {progress?.recovery_index != null && progress.sessions_completed > 0
              ? ` · recovery ${progress.recovery_index.toFixed(2)}`
              : ""}
          </p>
        </Card>
        <Card className="p-5 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Your coach recommends</p>
              {recommend ? (
                <>
                  <h2 className="mt-1 text-lg font-bold text-slate-100">{recommend.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {stripMarkdown(recommend.reason)}
                  </p>
                </>
              ) : (
                <Spinner />
              )}
            </div>
            {recommend && (
              <Badge tone="neutral">difficulty {recommend.difficulty.toFixed(0)}/10</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Quick scenarios */}
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
    </div>
  );
}