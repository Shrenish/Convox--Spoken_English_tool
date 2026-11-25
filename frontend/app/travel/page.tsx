"use client";

import { useEffect, useState } from "react";
import { completeStage, getTravel, startStage, startTravel } from "@/lib/api";
import type { TravelJourneyOut } from "@/lib/types";
import { ConversationView } from "@/components/conversation/ConversationView";
import { Badge } from "@/components/ui/Badge";
import { TravelJourneyIllustration } from "@/components/illustrations/FeatureIllustrations";
import { TRAVEL_THEMES, type TravelTheme } from "@/components/travel/travelScenariosData";

const DEST = "UK";

export default function TravelPage() {
  const [journey, setJourney] = useState<TravelJourneyOut | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<TravelTheme | null>(null);
  const [stageBusy, setStageBusy] = useState<string | null>(null);
  const [active, setActive] = useState<{
    stage_key: string;
    conversation_id: string;
    scenario_key: string;
    title: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("convox-journey-id") : null;
    if (saved) {
      getTravel(saved)
        .then(setJourney)
        .catch(() => window.localStorage.removeItem("convox-journey-id"));
    }
  }, []);

  const handlePickConversation = async (stageKey: string, convTitle: string, convId: string) => {
    setStageBusy(convId);
    setError("");
    try {
      let currentJourney = journey;
      if (!currentJourney) {
        currentJourney = await startTravel(DEST);
        window.localStorage.setItem("convox-journey-id", currentJourney.journey_id);
        setJourney(currentJourney);
      }
      const start = await startStage(currentJourney.journey_id, stageKey);
      setActive({
        stage_key: start.stage_key,
        conversation_id: start.conversation_id,
        scenario_key: start.scenario_key,
        title: convTitle,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the conversation.");
    } finally {
      setStageBusy(null);
    }
  };

  const handleStageComplete = async () => {
    if (!journey || !active) return;
    setActive(null);
    try {
      await completeStage(journey.journey_id, active.stage_key);
      const fresh = await getTravel(journey.journey_id);
      setJourney(fresh);
    } catch {
      // ignore
    }
  };

  if (active && journey) {
    return (
      <div className="flex h-[78vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <ConversationView
          key={active.conversation_id}
          conversationId={active.conversation_id}
          scenarioKey={active.scenario_key}
          mode="travel"
          title={`${active.title} · Travel`}
          onFinished={() => void handleStageComplete()}
        />
      </div>
    );
  }

  if (selectedTheme) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-4xl">
              {selectedTheme.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#a3e635] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
                  {selectedTheme.badge}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {selectedTheme.conversations.length} Conversations Ready
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold text-white">{selectedTheme.title}</h1>
              <p className="text-xs text-slate-400">{selectedTheme.desc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTheme(null)}
            className="rounded-xl border border-line bg-surface-2 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-[#a3e635]/50 hover:text-white"
          >
            ← All 8 Travel Themes
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-xs text-rose">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedTheme.conversations.map((c, idx) => {
            const isBusy = stageBusy === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void handlePickConversation(selectedTheme.stageKey, c.title, c.id)}
                disabled={stageBusy !== null}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-[#a3e635]/60 hover:shadow-lg disabled:opacity-60"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full bg-[#a3e635] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
                      {c.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#a3e635]">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.desc}</p>
                </div>
                <span className="mt-3 inline-block font-mono text-[11px] font-semibold text-[#4ade80]">
                  {isBusy ? "Starting conversation…" : "Start Conversation →"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface to-surface-2 px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <Badge tone="cool">Travel Scenes · 8 Themes · 120 Conversations</Badge>
            <h1 className="text-3xl font-extrabold text-slate-100">Choose Your Travel Scene</h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              Click any travel theme box below to explore 15 unique, ready-to-practice conversations
              for that exact setting.
            </p>
            {error && <p className="mt-3 text-xs text-rose">{error}</p>}
          </div>

          <div className="hidden sm:flex items-center justify-center p-2">
            <TravelJourneyIllustration className="w-36 h-36" />
          </div>
        </div>
      </div>

      {/* 8 Cartoonish Travel Scene Category Boxes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRAVEL_THEMES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSelectedTheme(s)}
            className={`group flex flex-col justify-between rounded-2xl border ${s.border} bg-gradient-to-br ${s.bg} p-4 text-left transition hover:-translate-y-1 hover:shadow-xl`}
          >
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#a3e635] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black">
                  {s.badge}
                </span>
                <span className="text-lg tracking-widest">{s.emojis}</span>
              </div>
              <div className="mb-3 flex h-20 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-5xl transition-transform group-hover:scale-105">
                {s.icon}
              </div>
              <h3 className="text-sm font-extrabold text-white">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.desc}</p>
            </div>
            <span className="mt-3 inline-block font-mono text-[11px] font-semibold text-[#a3e635]">
              Explore 15 Scenarios →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
