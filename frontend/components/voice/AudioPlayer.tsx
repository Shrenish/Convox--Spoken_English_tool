"use client";

import { useEffect, useRef, useState } from "react";
import { playAudio } from "@/lib/audio";
import { resolveAudioUrl } from "@/lib/api";

/** Small play/pause toggle for an AI voice clip. Auto-plays once when it mounts. */
export function AudioPlayer({ url, label = "Play voice" }: { url?: string | null; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const cleanup = useRef<(() => void) | null>(null);
  const src = resolveAudioUrl(url);

  useEffect(() => {
    if (src) {
      cleanup.current = playAudio(src);
      setPlaying(true);
    }
    return () => cleanup.current?.();
  }, [src]);

  const toggle = () => {
    if (!src) return;
    if (playing) {
      cleanup.current?.();
      setPlaying(false);
    } else {
      cleanup.current = playAudio(src);
      setPlaying(true);
    }
  };

  if (!url) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-accent/60"
    >
      {playing ? (
        <span className="flex h-3 items-end gap-0.5">
          {[0.6, 1, 0.8].map((h, i) => (
            <span
              key={i}
              className="w-0.5 rounded-sm bg-accent"
              style={{ height: 4, animation: `eq 0.8s ease-in-out ${i * 0.12}s infinite` }}
            />
          ))}
        </span>
      ) : (
        <span className="text-[11px]">▶</span>
      )}
      {label}
      <style>{`@keyframes eq { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(3)} }`}</style>
    </button>
  );
}