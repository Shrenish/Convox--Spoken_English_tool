"use client";

/**
 * CONVOX Welcome / Landing Page
 * - Unauthenticated users see the sign-in / register experience.
 * - Authenticated users are immediately redirected.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { login, register } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type Mode = "choose" | "signin" | "register";

export default function WelcomePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user) {
      if (!user.onboarding_completed) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (user) return null; // redirect in-flight

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10 py-12">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-widest">
          Voice-first communication learning
        </div>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-50">
          CONVOX
        </h1>
        <p className="text-lg font-semibold text-accent-soft">
          Speak. Learn. Conquer.
        </p>
        <p className="text-sm leading-relaxed text-slate-400 max-w-md mx-auto">
          Build your confidence through realistic conversations, understand your
          communication mistakes and develop the skills to communicate
          effectively in real-world situations.
        </p>
      </div>

      {/* Auth panel */}
      <div className="w-full max-w-sm">
        {mode === "choose" && <ChooseMode onMode={setMode} />}
        {mode === "signin" && (
          <SignInForm onBack={() => setMode("choose")} onSuccess={refresh} />
        )}
        {mode === "register" && (
          <RegisterForm onBack={() => setMode("choose")} onSuccess={refresh} />
        )}
      </div>

      {/* Features teaser */}
      {mode === "choose" && (
        <div className="grid grid-cols-3 gap-6 text-center max-w-xl mt-2">
          {[
            { icon: "🎙️", label: "Voice conversations", sub: "Talk to AI partners" },
            { icon: "📊", label: "CORE evaluation", sub: "14-dimension feedback" },
            { icon: "🌍", label: "Global Survival", sub: "Real-world scenarios" },
          ].map((f) => (
            <div key={f.label} className="space-y-1">
              <div className="text-2xl">{f.icon}</div>
              <p className="text-xs font-semibold text-slate-200">{f.label}</p>
              <p className="text-[11px] text-slate-500">{f.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Choose mode (initial buttons) ───────────────────────────────────────────

function ChooseMode({ onMode }: { onMode: (m: Mode) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
      <h2 className="text-center text-sm font-semibold text-slate-300">
        Get started
      </h2>

      {/* Google OAuth — shown but disabled until NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true */}
      <GoogleButton />

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-line" />
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">or</span>
        <div className="flex-1 border-t border-line" />
      </div>

      <Button
        className="w-full"
        variant="secondary"
        onClick={() => onMode("register")}
      >
        Create an account
      </Button>
      <button
        className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
        onClick={() => onMode("signin")}
      >
        Already have an account? <span className="font-semibold text-accent-soft">Sign in</span>
      </button>
    </div>
  );
}

// ─── Google OAuth placeholder ─────────────────────────────────────────────────

function GoogleButton() {
  const isEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

  if (!isEnabled) {
    return (
      <div className="relative">
        <button
          disabled
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-line bg-surface-2/50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <p className="mt-1.5 text-center text-[10px] text-slate-600">
          Google sign-in requires GOOGLE_CLIENT_ID configuration
        </p>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/google"
      className="w-full flex items-center justify-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-surface-2/80 transition-colors"
    >
      <GoogleIcon />
      Continue with Google
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Sign In form ─────────────────────────────────────────────────────────────

function SignInForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <h2 className="text-sm font-semibold text-slate-300">Sign in</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="si-email">
            Email
          </label>
          <input
            id="si-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="si-password">
            Password
          </label>
          <input
            id="si-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="Your password"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : "Sign in"}
        </Button>
      </form>

      <button
        className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
        onClick={onBack}
      >
        Don't have an account? <span className="text-accent-soft">Create one</span>
      </button>
    </div>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email) { setError("Email is required."); return; }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <h2 className="text-sm font-semibold text-slate-300">Create account</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="reg-name">
            Your name
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="Priya Sharma"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="reg-password">
            Password <span className="text-slate-600">(min 6 characters)</span>
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="Choose a password"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="reg-confirm">
            Confirm password
          </label>
          <input
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="Confirm your password"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : "Create account"}
        </Button>
      </form>

      <p className="text-center text-[10px] text-slate-600 leading-relaxed">
        Your password is securely hashed and never stored in plain text.
      </p>
    </div>
  );
}
