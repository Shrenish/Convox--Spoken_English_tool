"use client";

import { useRef, useState } from "react";
import { startCapture, type Recording } from "@/lib/audio";

interface Props {
  onCapture: (recording: Recording) => void;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * Hold-to-talk mic. Pointer down starts capture, release stops it and hands the
 * clip to `onCapture`. Short/failed clips and missing permissions become an
 * inline hint. The parent stays in control of what happens after capture.
 */
export function MicrophoneButton({ onCapture, busy = false, disabled = false }: Props) {
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState("");
  const controller = useRef<Awaited<ReturnType<typeof startCapture>> | null>(null);

  const begin = async () => {
    if (busy || disabled || controller.current) return;
    setHint("");
    try {
      controller.current = await startCapture();
      setRecording(true);
    } catch {
      setHint("Microphone unavailable — check browser permissions, or type below.");
    }
  };

  const end = async () => {
    const current = controller.current;
    if (!current) return;
    controller.current = null;
    setRecording(false);
    try {
      const rec = await current.stop();
      if (rec.blob.size > 1200) onCapture(rec);
      else setHint("That was too short to hear — try again.");
    } catch {
      setHint("Recording failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={recording ? "Release to send" : "Hold to record"}
        onPointerDown={(e) => {
          e.preventDefault();
          void begin();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          void end();
        }}
        onPointerLeave={(e) => {
          if (recording) {
            e.preventDefault();
            void end();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        disabled={busy || disabled}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full
          border-2 transition-all select-none touch-none
          ${recording
            ? "scale-90 border-rose bg-rose/25 shadow-lg shadow-rose/30"
            : "border-accent bg-accent/15 hover:bg-accent/25 active:scale-95"}
          ${busy || disabled ? "opacity-40" : ""}`}
      >
        {busy ? (
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
        ) : recording ? (
          <span className="h-4 w-4 animate-pulse rounded-sm bg-rose" />
        ) : (
          <span className="text-2xl">🎙️</span>
        )}
        {recording && (
          <span className="absolute -top-2 right-0 flex h-4 items-center gap-1 rounded-full bg-rose px-2 text-[10px] font-semibold text-white">
            REC
            <span className="h-2 w-2 animate-ping rounded-full bg-white" />
          </span>
        )}
      </button>
      <span className="text-[11px] text-slate-400">
        {recording ? "Release to send" : busy ? "AI speaking…" : "Hold to talk"}
      </span>
      {hint && <span className="max-w-[260px] text-center text-[11px] text-amber">{hint}</span>}
    </div>
  );
}