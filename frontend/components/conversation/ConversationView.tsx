"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { endConversation, getTurns, sendTurn, startConversation } from "@/lib/api";
import type { EventOut } from "@/lib/types";
import type { Recording } from "@/lib/audio";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { MicrophoneButton } from "@/components/voice/MicrophoneButton";
import { AudioPlayer } from "@/components/voice/AudioPlayer";

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

export function ConversationView({
  conversationId: initialId,
  scenarioKey,
  mode = "conversation",
  title,
  onFinished,
}: Props) {
  const [conversationId, setConversationId] = useState(initialId ?? null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<"starting" | "idle" | "busy" | "ended">("starting");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title ?? "Practice conversation"}</h2>
          {mode === "travel" && <Badge tone="cool" className="mt-1">Travel stage</Badge>}
          {status === "ended" && <Badge tone="good" className="mt-1">Session complete — see the autopsy ↓</Badge>}
        </div>
        {conversationId && status === "idle" && (
          <Button variant="ghost" size="sm" onClick={() => void handleEnd()}>
            End session
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-xl border border-rose/30 bg-rose/10 px-4 py-2 text-xs text-rose">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>dismiss</button>
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {turns.map((t) => (
          <div
            key={`${t.speaker}-${t.sequence}-${t.transcript.slice(0, 8)}`}
            className={`flex ${t.speaker === "ai" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                t.speaker === "ai"
                  ? "rounded-tl-sm bg-surface-2 text-slate-100"
                  : "rounded-tr-sm bg-accent text-white"
              }`}
            >
              <p>{t.transcript}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {t.speaker === "ai" && t.audioUrl && <AudioPlayer url={t.audioUrl} />}
                {t.event && t.event.event_type && (
                  <Badge tone="warn">⚡ {EVENT_LABEL[t.event.event_type] ?? t.event.event_type}</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
        {status === "busy" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface-2 px-4 py-2.5">
              <Spinner label="Your partner is replying…" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <MicrophoneButton onCapture={(rec) => void handleSend({ audio: rec })} busy={status === "busy"} disabled={status !== "idle"} />
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