"use client";

/**
 * Onboarding flow — runs once after registration.
 * Step 1: Country selection
 * Step 2: Communication context
 * Saves to backend via POST /api/auth/onboarding, then redirects to /dashboard.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { saveOnboarding } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const COMM_CONTEXTS = [
  {
    value: "Indian English",
    label: "Indian English",
    description:
      "Conversations using Indian English norms, idioms and professional communication styles.",
  },
  {
    value: "American English",
    label: "American English",
    description:
      "Everyday and professional communication aligned with American English conventions.",
  },
  {
    value: "British English",
    label: "British English",
    description:
      "Conversations using British English vocabulary, tone and professional norms.",
  },
  {
    value: "International English",
    label: "International everyday communication",
    description:
      "Clear, neutral English suited for international contexts and cross-cultural conversations.",
  },
];

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [country, setCountry] = useState("India");
  const [otherCountry, setOtherCountry] = useState("");
  const [commContext, setCommContext] = useState("International English");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If already onboarded, redirect now
  if (!loading && user?.onboarding_completed) {
    router.replace("/dashboard");
    return null;
  }
  if (!loading && !user) {
    router.replace("/");
    return null;
  }

  const finalCountry = country === "Other" ? otherCountry.trim() || "Other" : country;

  const handleSavePreferences = async () => {
    setError("");
    setSaving(true);
    try {
      await saveOnboarding(finalCountry, commContext);
      await refresh();
      setStep(3); // Go to trial assessment invitation step
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 py-12">
      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step >= s
                  ? "border-accent bg-accent/20 text-accent-soft"
                  : "border-line text-slate-500"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 3 && <div className="h-px w-8 bg-line" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-6">
        {step === 1 && (
          <Step1Country
            country={country}
            setCountry={setCountry}
            otherCountry={otherCountry}
            setOtherCountry={setOtherCountry}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Context
            commContext={commContext}
            setCommContext={setCommContext}
            onBack={() => setStep(1)}
            onFinish={handleSavePreferences}
            saving={saving}
            error={error}
          />
        )}
        {step === 3 && (
          <Step3TrialAssessment
            commContext={commContext}
            onStart={() => router.push("/conversation?scenario=introduce_classmate")}
            onSkip={() => router.push("/dashboard")}
          />
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Country ──────────────────────────────────────────────────────────

function Step1Country({
  country,
  setCountry,
  otherCountry,
  setOtherCountry,
  onNext,
}: {
  country: string;
  setCountry: (c: string) => void;
  otherCountry: string;
  setOtherCountry: (c: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-slate-100">Where are you from?</h2>
        <p className="text-xs text-slate-500">
          This helps us understand your context — it does not determine your English level.
        </p>
      </div>

      <div className="space-y-2.5">
        {[
          { value: "India", label: "🇮🇳 India" },
          { value: "Other", label: "🌍 Other country" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setCountry(opt.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
              country === opt.value
                ? "border-accent/60 bg-accent/10 text-slate-100"
                : "border-line bg-surface-2 text-slate-300 hover:border-accent/30 hover:text-slate-100"
            }`}
          >
            {opt.label}
          </button>
        ))}

        {country === "Other" && (
          <input
            type="text"
            placeholder="Type your country…"
            value={otherCountry}
            onChange={(e) => setOtherCountry(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
        )}
      </div>

      <div className="rounded-lg bg-surface-2 px-4 py-3 text-xs text-slate-500 leading-relaxed">
        💡 Your country is not used to assume your English proficiency level.
        Your actual ability is measured through real conversations.
      </div>

      <Button
        className="w-full"
        onClick={onNext}
        disabled={country === "Other" && !otherCountry.trim()}
      >
        Continue →
      </Button>
    </div>
  );
}

// ─── Step 2: Communication context ───────────────────────────────────────────

function Step2Context({
  commContext,
  setCommContext,
  onBack,
  onFinish,
  saving,
  error,
}: {
  commContext: string;
  setCommContext: (c: string) => void;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-200 transition-colors text-sm"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            What do you want to practise?
          </h2>
          <p className="text-xs text-slate-500">
            Choose a communication context to start with.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {COMM_CONTEXTS.map((ctx) => (
          <button
            key={ctx.value}
            onClick={() => setCommContext(ctx.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
              commContext === ctx.value
                ? "border-accent/60 bg-accent/10"
                : "border-line bg-surface-2 hover:border-accent/30"
            }`}
          >
            <p className="text-sm font-medium text-slate-100">{ctx.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{ctx.description}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-surface-2 px-4 py-3 text-xs text-slate-500 leading-relaxed">
        These are language and communication contexts, not proficiency levels.
        You can change this later in your profile.
      </div>

      {error && (
        <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">
          {error}
        </p>
      )}

      <Button className="w-full" onClick={onFinish} disabled={saving}>
        {saving ? <Spinner size="sm" /> : "Save & Continue →"}
      </Button>
    </div>
  );
}

// ─── Step 3: Trial Speaking Assessment ────────────────────────────────────────

function Step3TrialAssessment({
  commContext,
  onStart,
  onSkip,
}: {
  commContext: string;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs text-mint font-medium">
          Profile Ready
        </div>
        <h2 className="text-xl font-bold text-slate-100">Let's understand how you communicate</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Take a short, natural trial conversation (3–4 minutes) with an AI partner.
          This will establish your initial CORE baseline and personalized practice plan.
        </p>
      </div>

      <div className="rounded-xl border border-line/60 bg-surface-2/60 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trial Activity</p>
        <p className="text-sm font-bold text-slate-200">Meet a New Classmate</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Introduce yourself, discuss your interests, and answer simple follow-up questions in {commContext}.
        </p>
      </div>

      <div className="space-y-2.5">
        <Button className="w-full" size="lg" onClick={onStart}>
          Begin Initial Speaking Assessment →
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          Skip to dashboard for now
        </button>
      </div>
    </div>
  );
}
