"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { completeStage, getTravel, startStage, startTravel } from "@/lib/api";
import type { TravelJourneyOut, TravelStageCompleteResponse, TravelStageOut } from "@/lib/types";
import { ConversationView } from "@/components/conversation/ConversationView";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { JourneyMap } from "@/components/travel/JourneyMap";
import { TravelJourneyIllustration } from "@/components/illustrations/FeatureIllustrations";

const DEST = "UK";

export default function TravelPage() {
  const [journey, setJourney] = useState<TravelJourneyOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string | null>(null);
  const [active, setActive] = useState<{
    stage_key: string;
    conversation_id: string;
    scenario_key: string;
    title: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [completeInfo, setCompleteInfo] = useState<TravelStageCompleteResponse | null>(null);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("convox-journey-id") : null;
    if (saved) {
      getTravel(saved)
        .then(setJourney)
        .catch(() => window.localStorage.removeItem("convox-journey-id"));
    }
  }, []);

  const refresh = async (id: string) => {
    const fresh = await getTravel(id);
    setJourney(fresh);
  };

  const handleStartJourney = async () => {
    setBusy(true);
    setError("");
    try {
      const created = await startTravel(DEST);
      window.localStorage.setItem("convox-journey-id", created.journey_id);
      setJourney(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the journey.");
    } finally {
      setBusy(false);
    }
  };

  const handleNewJourney = () => {
    window.localStorage.removeItem("convox-journey-id");
    setJourney(null);
    setActive(null);
    setCompleteInfo(null);
  };

  const handleStartStage = async (stageKey: string) => {
    if (!journey) return;
    setStageBusy(stageKey);
    setError("");
    setCompleteInfo(null);
    try {
      const start = await startStage(journey.journey_id, stageKey);
      setActive({
        stage_key: start.stage_key,
        conversation_id: start.conversation_id,
        scenario_key: start.scenario_key,
        title: start.title,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the stage.");
    } finally {
      setStageBusy(null);
    }
  };

  const handleStageComplete = async (conversationId: string) => {
    if (!journey || !active) return;
    setLastConversationId(conversationId);
    setActive(null);
    try {
      const result = await completeStage(journey.journey_id, active.stage_key);
      setCompleteInfo(result);
      await refresh(journey.journey_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stage completion failed.");
    }
  };

  // Inline conversation has exclusive focus.
  if (active && journey) {
    return (
      <div className="flex h-[74vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <ConversationView
          key={active.conversation_id}
          conversationId={active.conversation_id}
          mode="travel"
          title={`${active.title} · Travel`}
          onFinished={handleStageComplete}
        />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface to-surface-2 px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <Badge tone="cool">Global Survival · 8 stages</Badge>
              <h1 className="text-3xl font-extrabold text-slate-100">Survive in English, step by step.</h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-400">
                airport → immigration → transport → hotel → restaurant → shopping → social → the
                unexpected problem. Each stage is a short, real conversation with controlled events,
                scored by CORE and carried into your learner model.
              </p>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => void handleStartJourney()} size="lg" disabled={busy} className="shadow-lg shadow-amber/20">
                  {busy ? "Starting…" : `Start the ${DEST} journey ✈️`}
                </Button>
              </div>
              {error && <p className="mt-3 text-xs text-rose">{error}</p>}
            </div>

            <div className="hidden sm:flex items-center justify-center p-2">
              <TravelJourneyIllustration className="w-36 h-36" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completed = journey.stages.filter((s) => s.status === "completed").length;
  const activeStage = journey.stages.find((s) => s.status === "active") as TravelStageOut | undefined;
  const isDone = journey.status === "completed";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Global Survival</h1>
          <p className="text-xs text-slate-400">
            {completed}/{journey.stages.length} stages · destination {journey.destination}
            {activeStage ? ` · next: ${activeStage.title}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDone ? (
            <Button size="sm" variant="secondary" onClick={handleNewJourney}>Travel again</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleNewJourney}>Start over</Button>
          )}
        </div>
      </div>

      {isDone && (
        <Card className="border-mint/30 bg-mint/10 p-5 text-center">
          <p className="text-sm font-semibold text-mint">Journey complete — you made it through.</p>
          <p className="mt-1 text-xs text-slate-400">Every stage has a CORE autopsy waiting in your history.</p>
        </Card>
      )}

      {completeInfo && (
        <Card className="border-accent/40 bg-accent/10 p-4">
          <p className="text-sm font-semibold text-slate-100">
            {completeInfo.stage_key} — stage complete
          </p>
          {completeInfo.next_stage ? (
            <p className="mt-1 text-xs text-slate-400">
              Next up: {completeInfo.next_stage.title} · score carried into your profile.
              Tap Start when ready.
            </p>
          ) : (
            <p className="mt-1 text-xs text-mint">All stages cleared. See your autopsies in Progress.</p>
          )}
          {completeInfo.recommended_focus.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {completeInfo.recommended_focus.map((d: string) => (
                <Badge key={d} tone="cool">{d.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          )}
          {lastConversationId && (
            <Link href={`/autopsy/${lastConversationId}`} className="mt-3 inline-block">
              <Button size="sm" variant="secondary">Open the autopsy</Button>
            </Link>
          )}
        </Card>
      )}

      {error && (
        <p className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-2 text-xs text-rose">{error}</p>
      )}

      <Card>
        <CardHeader
          title={`Mission control · ${Math.round((completed / journey.stages.length) * 100)}%`}
          subtitle={`Hold-to-talk on each active stage. Text input works if the mic is missing.`}
        />
        <div className="px-5 py-4">
          <JourneyMap stages={journey.stages} onStart={handleStartStage} busyKey={stageBusy} />
        </div>
      </Card>

      <p className="text-center text-[11px] text-slate-500">
        Need the mic elsewhere? <Link href="/conversation" className="text-accent-soft underline">Practice a regular session</Link>.
      </p>

      {busy && (
        <div className="flex justify-center">
          <Spinner label="Setting up…" />
        </div>
      )}
    </div>
  );
}