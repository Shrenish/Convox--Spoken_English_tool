"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { endConversation, getTurns, sendTurn, startConversation } from "@/lib/api";
import type { EventOut } from "@/lib/types";
import type { Recording } from "@/lib/audio";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { MicrophoneButton, type RecordMode } from "@/components/voice/MicrophoneButton";
import { AudioPlayer } from "@/components/voice/AudioPlayer";
import { TravelSceneBanner } from "@/components/travel/TravelSceneBanner";

export interface Turn {
  speaker: "user" | "ai";
  transcript: string;
  audioUrl?: string | null;
  event?: EventOut | null;
  sequence: number;
}

interface Props {
  conversationId?: string; // resume an existing session (travel stages)
  scenarioKey?: string;    // start fresh from this scenario
  mode?: "conversation" | "travel";
  title?: string;
  focus?: string;          // optional targeted dimension from dashboard
  onFinished?: (conversationId: string) => void;
}

const EVENT_LABEL: Record<string, string> = {
  misunderstanding: "Misunderstanding injected",
  disagreement: "Disagreement",
  time_pressure: "Time pressure",
  topic_shift: "Topic shift",
  vocabulary_gap: "Vocabulary gap",
  interruption: "Interruption",
  unfamiliar_context: "Unfamiliar context",
  new_information: "New information",
};

function TimePressureClock() {
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#ec4899]/50 bg-[#ec4899]/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#f472b6]">
      <span className="h-2 w-2 animate-ping rounded-full bg-[#ec4899]" />
      <span>⏱️ {mm}:{ss}</span>
      <span className="text-[#e1e2ec]">— Be concise &amp; direct</span>
    </div>
  );
}

function pickNaturalHumanVoice(preferredVoiceName?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (preferredVoiceName) {
    const exact = voices.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }

  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = enVoices.length ? enVoices : voices;

  // Prefer Natasha first, then other neural/natural human voices
  const preferredPatterns = [
    /natasha/i,
    /natural/i,
    /aria|jenny|guy|sonia|ryan|libby/i,
    /google\s+(us|uk)\s+english/i,
    /samantha|alex|daniel|karen|serena/i,
    /online/i,
  ];
  for (const pat of preferredPatterns) {
    const match = pool.find((v) => pat.test(v.name));
    if (match) return match;
  }
  return pool[0] ?? null;
}

function formatVoiceLabel(v: SpeechSynthesisVoice): string {
  const cleanName = v.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s+Online\s*\(Natural\)/i, "")
    .replace(/\s+Desktop/i, "")
    .replace(/\s*-\s*English\s*\(([^)]+)\)/i, " ($1)")
    .trim();
  return cleanName.includes("(") ? cleanName : `${cleanName} (${v.lang})`;
}

function speakText(text: string, rate = 0.98, preferredVoiceName?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickNaturalHumanVoice(preferredVoiceName);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore browser speech synthesis errors
  }
}

function BrowserSpeechButton({ text, voiceName, rate = 0.98 }: { text: string; voiceName?: string; rate?: number }) {
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  const speakOnce = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickNaturalHumanVoice(voiceName);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1.02;
    utterance.onend = () => {
      if (speakingRef.current && rate >= 2.0) {
        speakOnce();
      } else {
        speakingRef.current = false;
        setSpeaking(false);
      }
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggle = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      speakingRef.current = false;
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    speakingRef.current = true;
    setSpeaking(true);
    speakOnce();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-slate-300 transition hover:border-accent/50 hover:text-white"
      title={speaking ? "Stop speaking" : rate >= 2.0 ? "Loop at 2x speed" : "Listen to reply"}
    >
      <span>{speaking ? "⏹" : "🔊"}</span>
      <span>{speaking ? "Stop" : rate >= 2.0 ? "Loop 2x" : "Listen"}</span>
    </button>
  );
}

export function ConversationView({
  conversationId: initialId,
  scenarioKey,
  mode = "conversation",
  title,
  focus,
  onFinished,
}: Props) {
  const [conversationId, setConversationId] = useState(initialId ?? null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<"starting" | "idle" | "busy" | "ended">("starting");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [boundKey, setBoundKey] = useState("Alt");
  const [recordMode, setRecordMode] = useState<RecordMode>("auto");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingStandard, setSpeakingStandard] = useState<"indian" | "global">("indian");
  const [elapsedSec, setElapsedSec] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "ended") return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("convox_mic_keybind");
      if (savedKey) setBoundKey(savedKey);
      const saved = localStorage.getItem("convox_voice_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.recordMode) setRecordMode(parsed.recordMode);
        if (typeof parsed.autoSpeak === "boolean") setAutoSpeak(parsed.autoSpeak);
        if (typeof parsed.speechRate === "number") setSpeechRate(parsed.speechRate);
        if (typeof parsed.selectedVoice === "string") setSelectedVoice(parsed.selectedVoice);
      }
    } catch {
      // Ignore storage errors
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const list = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
        setAvailableVoices(list);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const saveVoiceSettings = (next: { recordMode?: RecordMode; autoSpeak?: boolean; speechRate?: number; selectedVoice?: string }) => {
    const merged = {
      recordMode: next.recordMode ?? recordMode,
      autoSpeak: next.autoSpeak ?? autoSpeak,
      speechRate: next.speechRate ?? speechRate,
      selectedVoice: next.selectedVoice ?? selectedVoice,
    };
    try {
      localStorage.setItem("convox_voice_settings", JSON.stringify(merged));
    } catch {
      // Ignore storage errors
    }
  };

  const append = useCallback((turn: Turn) => {
    setTurns((prev) => [...prev, turn]);
    setStatus("idle");
  }, []);

  const consume = useCallback(
    (res: {
      conversation_id: string;
      sequence: number;
      user_transcript: string;
      ai_transcript: string;
      ai_audio_url?: string | null;
      event?: EventOut | null;
      conversation_complete: boolean;
    }) => {
      const finished = res.conversation_complete;
      if (res.user_transcript) {
        setTurns((prev) => [
          ...prev,
          { speaker: "user", transcript: res.user_transcript, sequence: res.sequence - 1 },
        ]);
      }
      setTurns((prev) => [
        ...prev,
        {
          speaker: "ai",
          transcript: res.ai_transcript || "(no spoken reply)",
          audioUrl: res.ai_audio_url,
          event: res.event ?? null,
          sequence: res.sequence,
        },
      ]);
      if (!res.ai_audio_url && res.ai_transcript && autoSpeak) {
        speakText(res.ai_transcript, speechRate, selectedVoice);
      }
      if (finished) {
        setStatus("ended");
        onFinished?.(res.conversation_id);
      } else {
        setStatus("idle");
      }
    },
    [onFinished],
  );

  // Boot: hydrate an existing session or start a fresh one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (conversationId) {
          const rows = await getTurns(conversationId);
          if (cancelled) return;
          setTurns(
            rows.map((r) => ({
              speaker: r.speaker as Turn["speaker"],
              transcript: r.transcript,
              sequence: r.sequence,
            })),
          );
          setStatus("idle");
        } else if (scenarioKey) {
          const res = await startConversation(scenarioKey, mode);
          if (cancelled) return;
          setConversationId(res.conversation_id);
          setTurns([
            { speaker: "ai", transcript: res.ai_transcript || "(no spoken reply)", audioUrl: res.ai_audio_url, sequence: 0 },
          ]);
          if (!res.ai_audio_url && res.ai_transcript && autoSpeak) {
            speakText(res.ai_transcript, speechRate, selectedVoice);
          }
          setStatus("idle");
        } else {
          setError("No scenario selected — go back and choose one.");
          setStatus("idle");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not start the conversation.");
        setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const handleSend = useCallback(
    async (input: { audio?: Recording; transcript?: string }) => {
      if (!conversationId || status === "busy" || status === "ended") return;
      if (!input.audio && !input.transcript?.trim()) {
        setError("Say something or type a reply.");
        return;
      }
      setError("");
      setStatus("busy");
      setDraft("");
      try {
        const res = await sendTurn(conversationId, {
          audio: input.audio?.blob,
          filename: input.audio ? `recording.${input.audio.ext}` : undefined,
          transcript: input.transcript,
        });
        consume(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "That turn failed. Please try again.");
        setStatus("idle");
      }
    },
    [conversationId, status, consume],
  );

  const handleEnd = useCallback(async () => {
    if (!conversationId) return;
    try {
      await endConversation(conversationId);
    } finally {
      setStatus("ended");
      onFinished?.(conversationId);
    }
  }, [conversationId, onFinished]);

  const inputDisabled = status !== "idle" || !conversationId;
  const maxTurns = 14;
  const userTurnCount = turns.filter((t) => t.speaker === "user").length;
  const convProgressPct = status === "ended" ? 100 : Math.min(95, Math.round((userTurnCount / (maxTurns / 2)) * 100));

  return (
    <div className="flex h-full flex-col bg-[#050507] text-[#f8fafc]">
      {/* Executive Protocol Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#272734] bg-[#0c0c10] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#a3e635]/50 bg-gradient-to-br from-[#a3e635]/20 to-[#ec4899]/20 text-2xl shadow-inner">
            🎙️
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#4ade80] ring-2 ring-[#0c0c10]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{title ?? "CONVOX Video Arena"}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14141b] px-2.5 py-0.5 font-mono text-[11px] text-[#4ade80]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" />
                LIVE [{formatTime(elapsedSec)}]
              </span>
              <span className="rounded-full bg-[#14141b] px-2.5 py-0.5 font-mono text-[11px] text-[#a3e635]">
                CORE 14
              </span>
              {mode === "travel" && <Badge tone="cool">Travel stage</Badge>}
              {focus && <Badge tone="warn">🎯 Focus: {focus.replace(/_/g, " ")}</Badge>}
              {status === "ended" && <Badge tone="good">Complete • +50 XP</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center rounded-full border border-[#272734] bg-[#14141b] p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setSpeakingStandard("indian")}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition ${
                speakingStandard === "indian"
                  ? "bg-[#a3e635] font-bold text-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇮🇳 Indian Base
            </button>
            <button
              type="button"
              onClick={() => setSpeakingStandard("global")}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition ${
                speakingStandard === "global"
                  ? "bg-[#ec4899] font-bold text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🌐 Global
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings((v) => !v)}>
            ⚙️ Controls ({boundKey === " " ? "Space" : boundKey})
          </Button>
          {conversationId && status === "idle" && (
            <Button variant="ghost" size="sm" onClick={() => void handleEnd()}>
              End &amp; Autopsy
            </Button>
          )}
        </div>
      </div>

      {/* Per-Conversation Progress Bar */}
      <div className="border-b border-[#272734] bg-[#0c0c10] px-4 py-2">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-slate-400">
            Conversation Progress · <span className="text-[#a3e635] font-semibold">{userTurnCount}</span> replies sent
          </span>
          <span className="font-bold text-[#4ade80]">{convProgressPct}% Complete</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#14141b]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#a3e635] via-[#4ade80] to-[#ec4899] transition-all duration-500"
            style={{ width: `${Math.max(8, convProgressPct)}%` }}
          />
        </div>
      </div>

      {showSettings && (
        <div className="border-b border-line bg-surface-2/80 px-5 py-3 text-xs">
          <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block font-medium text-slate-300">Mic Keybind</span>
              <div className="flex flex-wrap gap-1.5">
                {["Alt", " ", "F9", "Control"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setBoundKey(k);
                      try {
                        localStorage.setItem("convox_mic_keybind", k);
                      } catch {}
                    }}
                    className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                      boundKey === k
                        ? "border-accent bg-accent/20 text-white"
                        : "border-line bg-surface text-slate-400 hover:text-white"
                    }`}
                  >
                    {k === " " ? "Space" : k === "Control" ? "Ctrl" : k}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block font-medium text-slate-300">Recording Mode</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["auto", "Auto (Wispr)"],
                    ["hold", "Hold Only"],
                    ["toggle", "Tap Toggle"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setRecordMode(val);
                      saveVoiceSettings({ recordMode: val });
                    }}
                    className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                      recordMode === val
                        ? "border-accent bg-accent/20 text-white"
                        : "border-line bg-surface text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => {
                    setAutoSpeak(e.target.checked);
                    saveVoiceSettings({ autoSpeak: e.target.checked });
                  }}
                  className="rounded border-line accent-accent"
                />
                Auto-speak AI replies
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Speed:</span>
                {[0.85, 1.0, 1.15, 2.0].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSpeechRate(r);
                      saveVoiceSettings({ speechRate: r });
                    }}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] transition ${
                      speechRate === r
                        ? "border-accent bg-accent/20 text-white"
                        : "border-line bg-surface text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {availableVoices.length > 0 && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <span className="shrink-0 font-medium text-slate-300">AI Voice:</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedVoice(v);
                    saveVoiceSettings({ selectedVoice: v });
                    speakText("Hi, I am your CONVOX conversation partner.", speechRate, v);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] text-slate-200 focus:border-accent focus:outline-none"
                >
                  <option value="">Auto (Natasha / Natural Human Voice)</option>
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {formatVoiceLabel(v)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => speakText("Hi, I am your CONVOX conversation partner.", speechRate, selectedVoice)}
                  className="rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent-soft hover:bg-accent/25"
                >
                  🔊 Test
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 rounded-xl border border-rose/30 bg-rose/10 px-4 py-2 text-xs text-rose">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>dismiss</button>
        </div>
      )}

      {mode === "travel" && (
        <TravelSceneBanner scenarioKey={scenarioKey} title={title} />
      )}

      {/* 2-Column Arena: Dialogue (Left) + CORE 14 Telemetry (Right) */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-12">
        {/* Transcript */}
        <div className="flex flex-col space-y-3 overflow-y-auto pr-1 lg:col-span-8">
          {turns.map((t) => (
            <div
              key={`${t.speaker}-${t.sequence}-${t.transcript.slice(0, 8)}`}
              className={`flex ${t.speaker === "ai" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                  t.speaker === "ai"
                    ? "rounded-tl-sm border border-[#464554]/40 bg-[#191b23] text-[#e1e2ec]"
                    : "rounded-tr-sm bg-[#2f2ebe] text-white"
                }`}
              >
                <p>{t.transcript}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {t.speaker === "ai" && (t.audioUrl ? <AudioPlayer url={t.audioUrl} /> : <BrowserSpeechButton text={t.transcript} voiceName={selectedVoice} rate={speechRate} />)}
                  {t.event && t.event.event_type && (
                    <Badge tone="warn">⚡ {EVENT_LABEL[t.event.event_type] ?? t.event.event_type}</Badge>
                  )}
                </div>
                {t.speaker === "ai" && t.event?.event_type === "time_pressure" && <TimePressureClock />}
              </div>
            </div>
          ))}
          {status === "busy" && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[#464554]/40 bg-[#191b23] px-4 py-2.5">
                <Spinner label="Your partner is replying…" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Right 4-Col: Video Call AI Partner + CORE 14 Live Telemetry */}
        <aside className="hidden flex-col gap-3 overflow-y-auto lg:col-span-4 lg:flex">
          {/* AI Partner Video-Call Stage */}
          <div className="relative overflow-hidden rounded-xl border border-[#a3e635]/40 bg-[#0c0c10] p-4 shadow-lg">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-[#4ade80]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#4ade80]" />
                Video Call · AI Partner
              </span>
              <span className="rounded bg-[#ec4899]/20 px-1.5 py-0.5 text-[#ec4899]">
                {status === "busy" ? "Thinking…" : "Listening"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#14141b] to-[#050507] py-6">
              <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 text-5xl ${status === "busy" ? "border-[#ec4899] shadow-[0_0_28px_rgba(236,72,153,0.45)]" : "border-[#a3e635] shadow-[0_0_24px_rgba(163,230,53,0.28)]"} bg-[#0c0c10]`}>
                <span>{status === "busy" ? "🗣️" : "👩🏽‍💼"}</span>
                {status === "busy" && (
                  <span className="absolute -inset-2 animate-ping rounded-full border border-[#ec4899]/40" />
                )}
              </div>
              <p className="mt-3 text-sm font-bold text-white">Natasha · AI Partner</p>
              <p className="font-mono text-[11px] text-[#a3e635]">
                {status === "busy" ? "✨ Speaking at " + speechRate + "x" : "🎧 Live Voice & Visual Presence"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#272734] bg-[#0c0c10] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4cd7f6]">CORE 14 Telemetry</span>
              <span className="rounded bg-[#272a32] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#4edea3]">
                {turns.length} TURNS
              </span>
            </div>
            {/* Acoustic Equalizer Graphic */}
            <div className="mb-3 flex items-center justify-between rounded-lg bg-[#10131a] px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#908fa0]">Acoustic Engine</span>
              <div className="flex h-5 items-end gap-1">
                {[10, 18, 12, 20, 14, 16, 8, 15].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${status === "busy" ? h : Math.max(4, h - 6)}px` }}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      i % 2 === 0 ? "bg-[#4cd7f6]" : "bg-[#c0c1ff]"
                    } ${status === "busy" ? "animate-pulse" : "opacity-60"}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#908fa0]">Speaking Standard</span>
                <span className="text-[#e1e2ec]">
                  {speakingStandard === "indian" ? "🇮🇳 Indian Base" : "🌐 Global"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#908fa0]">Push-to-Talk Key</span>
                <span className="rounded bg-[#272a32] px-1.5 py-0.5 text-[#c0c1ff]">
                  {boundKey === " " ? "Space" : boundKey}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#908fa0]">Voice Speed</span>
                <span className="text-[#e1e2ec]">{speechRate}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#908fa0]">Auto-Speak</span>
                <span className={autoSpeak ? "text-[#4edea3]" : "text-[#908fa0]"}>
                  {autoSpeak ? "ENABLED" : "MUTED"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#464554]/40 bg-[#191b23] p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#c0c1ff]">Live Strategic Cue</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#4edea3]" />
            </div>
            <p className="text-xs leading-relaxed text-[#c7c4d7]">
              Keep answers concise and structured. Hold, tap, or double-tap{" "}
              <span className="font-mono font-semibold text-[#4cd7f6]">
                {boundKey === " " ? "Space" : boundKey}
              </span>{" "}
              for hands-free Wispr Flow-style voice capture.
            </p>
          </div>
        </aside>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <MicrophoneButton
            onCapture={(rec) => void handleSend({ audio: rec })}
            busy={status === "busy"}
            disabled={status !== "idle"}
            boundKey={boundKey}
            recordMode={recordMode}
            onChangeKeybind={setBoundKey}
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) void handleSend({ transcript: draft });
            }}
            placeholder={inputDisabled ? (status === "ended" ? "Session ended" : "Starting…") : "…or type a reply"}
            disabled={inputDisabled}
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
          />
          <Button onClick={() => void handleSend({ transcript: draft })} disabled={!draft.trim() || inputDisabled}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}