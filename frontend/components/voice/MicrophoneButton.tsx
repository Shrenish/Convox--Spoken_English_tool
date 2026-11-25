"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startCapture, type Recording } from "@/lib/audio";

export type RecordMode = "auto" | "hold" | "toggle";

interface Props {
  onCapture: (recording: Recording) => void;
  busy?: boolean;
  disabled?: boolean;
  boundKey?: string;
  recordMode?: RecordMode;
  onChangeKeybind?: (key: string) => void;
}

const STORAGE_KEY = "convox_mic_keybind";

function formatKeyLabel(key: string): string {
  if (key === " ") return "Space";
  if (key === "Control") return "Ctrl";
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Hold-to-talk & Wispr Flow-style keyboard-triggered mic.
 * - Pointer hold: press & hold mic button, release to send.
 * - Bound key (default: Alt):
 *   - Hold (>250ms): push-to-talk, release to send.
 *   - Single tap (<250ms): toggles hands-free recording on/off.
 *   - Double tap (<350ms): locks hands-free recording until tapped again.
 */
export function MicrophoneButton({
  onCapture,
  busy = false,
  disabled = false,
  boundKey: controlledKey,
  recordMode = "auto",
  onChangeKeybind,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hint, setHint] = useState("");
  const [internalKey, setInternalKey] = useState<string>("Alt");
  const [bindingMode, setBindingMode] = useState(false);
  const boundKey = controlledKey ?? internalKey;

  const controller = useRef<Awaited<ReturnType<typeof startCapture>> | null>(null);
  const keyDownAt = useRef<number>(0);
  const lastTapAt = useRef<number>(0);
  const isKeyHeld = useRef<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setInternalKey(saved);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const begin = useCallback(async () => {
    if (busy || disabled || controller.current) return;
    setHint("");
    try {
      controller.current = await startCapture();
      setRecording(true);
    } catch {
      setHint("Microphone unavailable — check browser permissions, or type below.");
    }
  }, [busy, disabled]);

  const end = useCallback(async () => {
    const current = controller.current;
    if (!current) return;
    controller.current = null;
    setRecording(false);
    setLocked(false);
    try {
      const rec = await current.stop();
      if (rec.blob.size > 1200) onCapture(rec);
      else setHint("That was too short to hear — try again.");
    } catch {
      setHint("Recording failed. Please try again.");
    }
  }, [onCapture]);

  // Listen for new keybinding when user clicks the Bind button
  useEffect(() => {
    if (!bindingMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setBindingMode(false);
        return;
      }
      setInternalKey(e.key);
      onChangeKeybind?.(e.key);
      try {
        localStorage.setItem(STORAGE_KEY, e.key);
      } catch {
        // Ignore storage errors
      }
      setBindingMode(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [bindingMode]);

  // Wispr Flow-style keyboard listener
  useEffect(() => {
    if (bindingMode || busy || disabled) return;

    const isModifierOrFn =
      boundKey === "Alt" ||
      boundKey === "Control" ||
      boundKey === "Shift" ||
      boundKey === "Meta" ||
      /^F\d{1,2}$/.test(boundKey);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== boundKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping && !isModifierOrFn) return;

      e.preventDefault();
      isKeyHeld.current = true;
      keyDownAt.current = Date.now();

      const now = Date.now();
      const isDoubleTap = now - lastTapAt.current < 350;

      if (controller.current) {
        if (isDoubleTap) {
          // Double tap while recording -> lock hands-free mode
          setLocked(true);
        } else {
          // Single tap while recording -> stop & send
          void end();
        }
      } else {
        if (isDoubleTap) {
          setLocked(true);
        }
        void begin();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== boundKey || !isKeyHeld.current) return;
      e.preventDefault();
      isKeyHeld.current = false;

      const heldMs = Date.now() - keyDownAt.current;
      if (recordMode === "hold") {
        if (controller.current) void end();
      } else if (recordMode === "toggle") {
        lastTapAt.current = Date.now();
      } else if (heldMs < 250) {
        // Quick tap: record lastTapAt for double-tap detection; keep recording
        lastTapAt.current = Date.now();
      } else if (controller.current && !locked) {
        // Long hold released -> push-to-talk stop & send
        void end();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [boundKey, bindingMode, busy, disabled, locked, begin, end]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={recording ? "Stop and send" : "Hold or tap to record"}
          onPointerDown={(e) => {
            e.preventDefault();
            if (recording) {
              void end();
            } else {
              void begin();
            }
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (recording && !locked) {
              void end();
            }
          }}
          onPointerLeave={(e) => {
            if (recording && !locked) {
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
              {locked ? "LOCKED" : "REC"}
              <span className="h-2 w-2 animate-ping rounded-full bg-white" />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setBindingMode((v) => !v)}
          disabled={busy || disabled}
          title="Click to bind a custom keyboard shortcut for hands-free / push-to-talk"
          className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
            bindingMode
              ? "animate-pulse border-accent bg-accent/20 text-white"
              : "border-line bg-surface-2 text-slate-300 hover:border-accent/50 hover:text-white"
          }`}
        >
          {bindingMode ? "Press key…" : `⌨️ ${formatKeyLabel(boundKey)}`}
        </button>
      </div>

      <span className="text-center text-[11px] text-slate-400">
        {recording
          ? locked
            ? `Locked — tap ${formatKeyLabel(boundKey)} or mic to send`
            : `Recording — release or tap ${formatKeyLabel(boundKey)} to send`
          : busy
            ? "AI speaking…"
            : `Hold, tap, or double-tap ${formatKeyLabel(boundKey)}`}
      </span>
      {hint && <span className="max-w-[260px] text-center text-[11px] text-amber">{hint}</span>}
    </div>
  );
}
