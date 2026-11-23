// Browser voice helpers — MediaRecorder capture and playback.
// Turn-based on purpose: tap-hold to record, release to send, then wait for the
// AI reply. `startCapture` hands back a controller so the UI can map hold/release
// onto record/stop precisely.

export interface Recording {
  blob: Blob;
  ext: string; // webm / ogg / mp4 — whatever the browser's MediaRecorder produced
}

interface CaptureController {
  stop: () => Promise<Recording>;
  cancel: () => void;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

export function recordingExt(mime: string): string {
  const match = /audio\/([\w.+-]+)/.exec(mime);
  if (!match) return "webm";
  const raw = match[1].toLowerCase();
  if (raw.includes("ogg")) return "ogg";
  if (raw.includes("mp4") || raw.includes("mpeg")) return "m4a";
  if (raw.includes("wav")) return "wav";
  return "webm";
}

/** Ask for the mic and start an in-progress recording. */
export async function startCapture(): Promise<CaptureController> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let resolved = false;
  let resolvePromise: ((rec: Recording) => void) | null = null;
  const completionPromise = new Promise<Recording>((resolve) => {
    resolvePromise = resolve;
  });

  const finish = () => {
    if (resolved) return;
    resolved = true;
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
    if (resolvePromise) {
      resolvePromise({ blob, ext: recordingExt(recorder.mimeType || mime || "") });
    }
  };

  // Register onstop before anything can trigger it
  recorder.onstop = () => {
    finish();
  };

  const hardStop = window.setTimeout(() => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    } else {
      finish();
    }
  }, 15_000);

  const stop = () => {
    window.clearTimeout(hardStop);
    if (recorder.state !== "inactive") {
      recorder.stop();
    } else {
      finish();
    }
    return completionPromise;
  };

  const cancel = () => {
    window.clearTimeout(hardStop);
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    stream.getTracks().forEach((t) => t.stop());
  };

  recorder.start(250);
  return { stop, cancel };
}

/** Play an absolute audio URL once; invokes onEnd when playback finishes or on error. */
export function playAudio(url: string, onEnd?: () => void): () => void {
  const audio = new Audio(url);
  if (onEnd) {
    audio.onended = () => onEnd();
    audio.onerror = () => onEnd();
  }
  audio.play().catch(() => {
    /* autoplay may be blocked until a user gesture — the toggle button retries */
    if (onEnd) onEnd();
  });
  return () => {
    audio.pause();
    if (onEnd) onEnd();
  };
}