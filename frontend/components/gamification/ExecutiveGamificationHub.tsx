"use client";

import Link from "next/link";
import { useState } from "react";
import type { GamificationState, AchievementBadge, ExecutivePersona } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Props {
  state: GamificationState;
  onSelectPersona?: (persona: ExecutivePersona) => void;
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Bronze: { bg: "bg-amber-950/20", border: "border-amber-700/40", text: "text-amber-500", glow: "shadow-amber-900/10" },
  Silver: { bg: "bg-slate-800/30", border: "border-slate-400/40", text: "text-slate-300", glow: "shadow-slate-500/10" },
  Gold: { bg: "bg-yellow-950/20", border: "border-yellow-500/40", text: "text-yellow-400", glow: "shadow-yellow-500/20" },
  Platinum: { bg: "bg-indigo-950/25", border: "border-indigo-400/40", text: "text-indigo-300", glow: "shadow-indigo-500/20" },
};

export function ExecutiveGamificationHub({ state, onSelectPersona }: Props) {
  const [activeTab, setActiveTab] = useState<"personas" | "badges">("personas");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    state.personas.find((p) => p.unlocked)?.id ?? "mentor_priya"
  );

  const selectedPersona = state.personas.find((p) => p.id === selectedPersonaId) ?? state.personas[0];
  const unlockedBadgesCount = state.badges.filter((b) => b.unlocked).length;
  const progressPercent = Math.min(100, Math.round((state.xp / state.next_level_xp) * 100));

  return (
    <div className="space-y-6">
      {/* Executive Level & Progress Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-surface via-surface to-surface-2 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent/40 bg-accent/15 text-2xl shadow-md shadow-accent/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-accent-soft">
                  Executive Tier Level {state.executive_level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber/10 px-2 py-0.5 text-[10px] font-bold text-amber border border-amber/30">
                  🔥 {state.streak_days} Day Streak
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-100">{state.title}</h3>
              <p className="text-xs text-slate-400">
                {state.xp} XP earned · {state.next_level_xp - state.xp} XP to next milestone promotion
              </p>
            </div>
          </div>

          <div className="w-full md:w-56 space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-slate-400">Level Progress</span>
              <span className="text-accent-soft">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
              <div
                className="h-full bg-gradient-to-r from-accent to-mint transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-right text-slate-500">
              {unlockedBadgesCount}/{state.badges.length} Credential Badges Unlocked
            </p>
          </div>
        </div>

        {/* Recent Milestone Notification */}
        {state.recent_rewards.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line/40 flex items-center gap-2 text-xs text-mint">
            <span className="inline-block animate-bounce">🎖️</span>
            <span className="font-semibold">{state.recent_rewards[state.recent_rewards.length - 1]}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab("personas")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "personas"
              ? "bg-accent/15 text-accent-soft border border-accent/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-surface-2/60"
          }`}
        >
          <span>👤</span>
          <span>Adaptive AI Personas ({state.personas.filter((p) => p.unlocked).length} Active)</span>
        </button>
        <button
          onClick={() => setActiveTab("badges")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "badges"
              ? "bg-accent/15 text-accent-soft border border-accent/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-surface-2/60"
          }`}
        >
          <span>🎖️</span>
          <span>Executive Credentials ({unlockedBadgesCount}/{state.badges.length})</span>
        </button>
      </div>

      {/* Tab 1: Adaptive Executive Personas */}
      {activeTab === "personas" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Persona Selection List */}
          <div className="md:col-span-1 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Your Practice Partner
            </p>
            {state.personas.map((persona) => {
              const isSelected = persona.id === selectedPersona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => {
                    if (persona.unlocked) {
                      setSelectedPersonaId(persona.id);
                      onSelectPersona?.(persona);
                    }
                  }}
                  disabled={!persona.unlocked}
                  className={`w-full text-left rounded-xl p-3 border transition-all flex items-start gap-3 ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-md shadow-accent/10"
                      : persona.unlocked
                      ? "border-line bg-surface hover:border-accent/40 hover:bg-surface-2"
                      : "border-line/40 bg-surface/40 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm"
                    style={{ backgroundColor: persona.avatar_color }}
                  >
                    {persona.unlocked ? persona.name[0] : "🔒"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-100 truncate">{persona.name}</p>
                      {persona.unlocked ? (
                        <span className="text-[9px] font-semibold text-mint bg-mint/10 px-1.5 py-0.5 rounded border border-mint/20">
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-500 bg-surface-2 px-1.5 py-0.5 rounded border border-line">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{persona.role}</p>
                    {!persona.unlocked && (
                      <p className="text-[9px] text-amber mt-1 font-medium leading-tight">
                        {persona.requirement}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Persona Spotlight Card */}
          <div className="md:col-span-2 rounded-2xl border border-line bg-surface p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md"
                    style={{ backgroundColor: selectedPersona.avatar_color }}
                  >
                    {selectedPersona.name[0]}
                  </div>
                  <div>
                    <Badge tone="cool" className="mb-1 text-[10px]">
                      {selectedPersona.role}
                    </Badge>
                    <h4 className="text-lg font-bold text-slate-100">{selectedPersona.name}</h4>
                    <p className="text-xs text-slate-400">{selectedPersona.title}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Cadence & Accent</span>
                  <span className="text-xs font-semibold text-accent-soft">
                    {selectedPersona.voice_description.split(",")[0]}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    🎯 Strategic Coaching Focus
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedPersona.coaching_style}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    🎙️ Voice & Delivery Demeanor
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {selectedPersona.voice_description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line/60">
              <div>
                <span className="text-[10px] text-slate-500 block">Targeted Scenario</span>
                <span className="text-xs font-semibold text-slate-200">
                  {selectedPersona.recommended_scenario.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
              <Link href={`/conversation?scenario=${selectedPersona.recommended_scenario}`}>
                <Button size="md" className="bg-gradient-to-r from-accent to-accent-soft text-white hover:opacity-90 shadow-md">
                  Engage in Dialogue →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Gamified Executive Credential Badges */}
      {activeTab === "badges" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.badges.map((badge) => {
            const tierStyle = TIER_COLORS[badge.tier] || TIER_COLORS.Bronze;
            const pct = Math.round(badge.progress * 100);
            return (
              <div
                key={badge.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                  badge.unlocked
                    ? `${tierStyle.border} ${tierStyle.bg} shadow-md ${tierStyle.glow}`
                    : "border-line bg-surface/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 border border-line text-2xl">
                    {badge.icon}
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${tierStyle.text} ${tierStyle.border}`}
                    >
                      {badge.tier}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-1 uppercase tracking-tight">
                      {badge.category}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <h5 className="text-sm font-bold text-slate-100">{badge.title}</h5>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-line/40">
                  <div className="flex justify-between items-center text-[10px] mb-1 font-semibold">
                    <span className="text-slate-400">
                      {badge.unlocked ? "Credential Earned" : "Requirement Progress"}
                    </span>
                    <span className={badge.unlocked ? "text-mint font-bold" : "text-slate-400"}>
                      {badge.unlocked ? "UNLOCKED ✓" : `${pct}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        badge.unlocked ? "bg-mint" : "bg-accent/60"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
