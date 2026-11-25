"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { listScenarios } from "@/lib/api";
import type { ScenarioOut } from "@/lib/types";
import { ConversationView } from "@/components/conversation/ConversationView";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

function ScenarioPicker({
  scenarios,
  onPick,
}: {
  scenarios: ScenarioOut[];
  onPick: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-100">Choose a conversation</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((s) => (
          <button
            key={s.scenario_key}
            onClick={() => onPick(s.scenario_key)}
            className="text-left"
          >
            <Card className="h-full p-4 transition-colors hover:border-accent/50">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-100">{s.title}</h4>
                <Badge tone="neutral">{s.environment}</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.description}</p>
              <p className="mt-2 text-[11px] text-slate-500">difficulty {s.difficulty.toFixed(0)}/10</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationRoute() {
  const sp = useSearchParams();
  const requested = sp.get("scenario");
  const focus = sp.get("focus") ?? undefined;
  const [scenarioKey, setScenarioKey] = useState<string | null>(requested);
  const [scenarios, setScenarios] = useState<ScenarioOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requested) {
      setScenarioKey(requested);
    } else {
      listScenarios()
        .then((list) => setScenarios(list.filter((s) => s.category === "core")))
        .catch(() => setScenarios([]))
        .finally(() => setLoading(false));
    }
  }, [requested]);

  if (scenarioKey) {
    return (
      <div className="flex min-h-[82vh] flex-col overflow-hidden rounded-2xl border border-[#464554]/50 bg-[#10131a] shadow-2xl">
        <ConversationView
          key={scenarioKey}
          scenarioKey={scenarioKey}
          focus={focus}
          onFinished={(id) => {
            window.location.href = `/autopsy/${id}`;
          }}
        />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner label="Loading scenarios…" />
      </div>
    );
  }
  return (
    <div>
      <ScenarioPicker scenarios={scenarios} onPick={setScenarioKey} />
      <p className="mt-4 text-center text-xs text-slate-500">
        Prefer the <Link className="text-accent-soft underline" href="/travel">survival journey</Link> instead?
      </p>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <ConversationRoute />
    </Suspense>
  );
}