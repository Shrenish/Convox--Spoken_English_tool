"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ProgressSummary, ScenarioOut } from "@/lib/types";

interface Props {
  progress: ProgressSummary | null;
  context?: string | null;
  scenarios: ScenarioOut[];
  defaultScenarioKey: string;
}

const QUICK_DRILLS = [
  {
    type: "Vocabulary Recovery",
    prompt: "Replace the vague phrase: 'The project is going good and we got big results.'",
    options: [
      "The initiative is tracking ahead of schedule with 34% higher throughput.",
      "The thing is doing nice and we have lots of stuff done.",
      "We are doing fine and the results are very big.",
    ],
    best: 0,
    tip: "Swap 'good' and 'big' for measurable executive verbs and metrics.",
  },
  {
    type: "Message Clarification",
    prompt: "Your listener looks confused after you explain a deadline slip. Best repair move?",
    options: [
      "Let me rephrase that concisely: delivery moves to Friday so QA can finish.",
      "As I already said earlier, it's just delayed because of stuff.",
      "Never mind, you'll see the email later.",
    ],
    best: 0,
    tip: "Acknowledge, signal the rephrase ('Let me rephrase'), and give the core reason in one sentence.",
  },
  {
    type: "Pronunciation & Cadence",
    prompt: "Which pacing strategy prevents syllable clipping on multi-syllable words like 'accountability'?",
    options: [
      "Pause 0.3s before key nouns and stress the primary syllable clearly.",
      "Speak 30% faster to finish the sentence quickly.",
      "Drop the ending syllables to sound casual.",
    ],
    best: 0,
    tip: "A brief 0.3s micro-pause before dense nouns boosts clarity and perceived authority.",
  },
];

export function MentorSyllabusAndDrills({
  progress,
  context,
  scenarios,
  defaultScenarioKey,
}: Props) {
  // Personalization slider: 0 = Vocabulary, 50 = Balanced, 100 = Clarification & Repair
  const [focusSlider, setFocusSlider] = useState(50);
  const [minutesPerDay, setMinutesPerDay] = useState<2 | 5 | 10>(3 as 2);

  // 2-minute micro-challenge game state
  const [drillActive, setDrillActive] = useState(false);
  const [drillIdx, setDrillIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    if (!drillActive) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [drillActive]);

  const currentDrill = QUICK_DRILLS[drillIdx % QUICK_DRILLS.length];
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const weakest = progress?.weakest_dimensions ?? [];
  const readiness = progress?.readiness;

  const syllabusTrack =
    focusSlider < 35
      ? {
          title: "Precision Vocabulary & Lexical Recovery",
          steps: [
            `Module 1 (${minutesPerDay}m): Replace filler adjectives with domain-specific verbs`,
            "Module 2 (3m): Synonym retrieval under 45-second time pressure",
            "Module 3 (5m): Live AI Arena with Vocabulary Recovery focus",
          ],
        }
      : focusSlider > 65
        ? {
            title: "Clarification, Repair & Pronunciation Clarity",
            steps: [
              `Module 1 (${minutesPerDay}m): 1-sentence 'Let me clarify' repair loops`,
              "Module 2 (3m): Syllable-stress & cadence control at 135 WPM",
              "Module 3 (5m): Live AI Arena with hostile interruption recovery",
            ],
          }
        : {
            title: "Balanced Executive Communication Syllabus",
            steps: [
              `Module 1 (${minutesPerDay}m): Warmup Vocab + Pronunciation micro-drill`,
              "Module 2 (4m): Structured 30-second framing & message clarification",
              `Module 3 (6m): ${context ?? "Workplace"} AI Video-Call Simulation`,
            ],
          };

  const scenarioHref = (dim: string) => {
    const key = scenarios[0]?.scenario_key || defaultScenarioKey;
    return `/conversation?scenario=${encodeURIComponent(key)}&focus=${encodeURIComponent(dim)}`;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Left 7-Col: AI Mentor Strategic Guide & Personalized Syllabus */}
      <Card className="border-[#a3e635]/30 bg-[#0c0c10] p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#a3e635]">
              AI Mentor · Strategic Guide
            </span>
            <h3 className="text-base font-bold text-white">
              Your Personalized Syllabus &amp; Course Plan
            </h3>
          </div>
          <Badge tone="cool">
            {readiness != null ? `Readiness ${readiness.toFixed(1)}/10` : "Baseline Ready"}
          </Badge>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          {weakest.length > 0
            ? `Based on your latest evaluation, your mentor recommends prioritizing ${weakest
                .slice(0, 2)
                .map((w) => w.replace(/_/g, " "))
                .join(" and ")}. Adjust the personalization slider below to rebalance your daily itinerary.`
            : "Complete an assessment or conversation to calibrate your weakest CORE 14 dimensions, or use the slider below to customize your focus."}
        </p>

        {/* Personalization Slide Bar */}
        <div className="mt-4 rounded-xl border border-[#272734] bg-[#14141b] p-3.5">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#a3e635]">Vocabulary Focus</span>
            <span className="text-slate-400">Balanced</span>
            <span className="text-[#ec4899]">Repair &amp; Pronunciation</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={focusSlider}
            onChange={(e) => setFocusSlider(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[#a3e635]"
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-white">{syllabusTrack.title}</span>
            <div className="flex items-center gap-1">
              {([2, 5, 10] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutesPerDay(m)}
                  className={`rounded-md px-2 py-0.5 font-mono transition ${
                    minutesPerDay === m
                      ? "bg-[#a3e635] font-bold text-black"
                      : "bg-black/40 text-slate-400 hover:text-white"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Itinerary Steps */}
        <div className="mt-3 space-y-2">
          {syllabusTrack.steps.map((step, i) => (
            <div
              key={step}
              className="flex items-center justify-between rounded-lg border border-[#272734] bg-[#050507] px-3 py-2 text-xs"
            >
              <span className="flex items-center gap-2 text-slate-200">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a3e635]/20 font-mono text-[10px] font-bold text-[#a3e635]">
                  {i + 1}
                </span>
                {step}
              </span>
              {i === 2 && (
                <Link
                  href={scenarioHref(weakest[0] || "repair")}
                  className="font-mono text-[11px] font-semibold text-[#4ade80] hover:underline"
                >
                  Launch →
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Right 5-Col: 2-Minute Unified Vocab / Clarification / Pronunciation Game */}
      <Card className="border-[#ec4899]/35 bg-[#0c0c10] p-5 lg:col-span-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#ec4899]">
              2-Min Micro-Challenge
            </span>
            <h3 className="text-base font-bold text-white">
              Vocab · Pronunciation · Repair
            </h3>
          </div>
          <span className="rounded-lg border border-[#ec4899]/40 bg-[#ec4899]/15 px-2.5 py-1 font-mono text-xs font-bold text-[#f472b6]">
            ⏱️ {mm}:{ss}
          </span>
        </div>

        {!drillActive ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs leading-relaxed text-slate-300">
              Sharpen your vocabulary recovery, message clarification, and pronunciation cadence in a fast 2-minute sprint.
            </p>
            <div className="flex items-center justify-between rounded-xl border border-[#272734] bg-[#14141b] px-3 py-2.5 text-xs">
              <span className="text-slate-400">Reward on completion</span>
              <span className="font-mono font-bold text-[#a3e635]">+25 XP</span>
            </div>
            <Button
              size="sm"
              className="w-full bg-[#a3e635] font-bold text-black hover:bg-[#bef264]"
              onClick={() => {
                setDrillActive(true);
                setSecondsLeft(120);
                setSelectedOpt(null);
              }}
            >
              ▶ Start 2-Minute Challenge
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-[#4ade80]">{currentDrill.type}</span>
              <span className="text-slate-400">Score: {score}</span>
            </div>
            <p className="text-xs font-medium text-white">{currentDrill.prompt}</p>
            <div className="space-y-1.5">
              {currentDrill.options.map((opt, idx) => {
                const picked = selectedOpt === idx;
                const isBest = idx === currentDrill.best;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={selectedOpt !== null}
                    onClick={() => {
                      setSelectedOpt(idx);
                      if (isBest) setScore((s) => s + 1);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                      selectedOpt === null
                        ? "border-[#272734] bg-[#14141b] text-slate-200 hover:border-[#a3e635]"
                        : isBest
                          ? "border-[#4ade80] bg-[#4ade80]/15 text-[#4ade80]"
                          : picked
                            ? "border-[#ec4899] bg-[#ec4899]/15 text-[#f472b6]"
                            : "border-[#272734] bg-[#14141b] text-slate-500"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {selectedOpt !== null && (
              <div className="rounded-lg bg-[#14141b] p-2.5 text-[11px] text-slate-300">
                <p className="text-[#a3e635] font-semibold">Mentor Tip:</p>
                <p>{currentDrill.tip}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDrillIdx((i) => i + 1);
                    setSelectedOpt(null);
                  }}
                  className="mt-2 font-mono font-bold text-[#ec4899] hover:underline"
                >
                  Next Prompt →
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
