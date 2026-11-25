"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assessment", label: "Assessment" },
  { href: "/travel", label: "Travel" },
  { href: "/progress", label: "Progress" },
];

export function NavBar() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard?.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isLandingPage = pathname === "/" && !user;

  return (
    <>
    <header className="flex items-center justify-between py-3 border-b border-line/60 mb-4 sticky top-0 z-30 backdrop-blur-md"
      style={{ backgroundColor: "var(--header-bg)" }}>
      <Link
        href={user ? "/dashboard" : "/"}
        className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-mint text-xl shadow-md shadow-accent/30 transition-transform group-hover:scale-105">
          🎧
        </div>
        <div className="flex flex-col">
          <span className="font-black leading-none tracking-wider" style={{ color: "var(--text-main)" }}>CONVOX</span>
          <span className="text-[9px] font-semibold tracking-widest text-accent-soft uppercase">Speak · Learn · Conquer</span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {!loading && user && (
          <nav className="flex items-center gap-1 text-sm mr-2">
            {APP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                  pathname === item.href
                    ? "bg-accent/15 text-accent-soft shadow-sm border border-accent/25"
                    : "hover:bg-surface-2/80 hover:text-accent-soft"
                }`}
                style={{ color: pathname === item.href ? undefined : "var(--text-muted)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-base transition-colors hover:border-accent/40"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {!loading && user && (
          <div className="flex items-center gap-2 border-l border-line pl-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-accent-soft transition hover:border-accent hover:bg-accent/10"
              title="Profile, User ID, Friends & App Settings"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">{user.display_name}</span>
              <span className="sm:hidden">Menu</span>
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-lg px-2.5 py-1 text-slate-400 transition-colors hover:bg-rose/15 hover:text-rose text-xs font-medium"
            >
              Sign out
            </button>
          </div>
        )}

        {!loading && !user && !isLandingPage && (
          <Link
            href="/"
            className="rounded-xl border border-line bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-accent/40"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>

    {menuOpen && user && (
      <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/75 p-4 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
        <div
          className="w-full max-w-sm rounded-2xl border border-accent/30 bg-[#0c0c10] p-5 text-sm text-slate-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-accent to-rose font-bold text-black">
                {user.display_name?.slice(0, 2).toUpperCase() || "CX"}
              </div>
              <div>
                <p className="font-semibold text-white">{user.display_name}</p>
                <p className="text-[11px] text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                <span>User ID</span>
                <button type="button" onClick={handleCopyId} className="font-semibold text-accent-soft hover:underline">
                  {copiedId ? "Copied!" : "Copy ID"}
                </button>
              </div>
              <p className="truncate font-mono text-xs text-mint">{user.id}</p>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                <span>Friends &amp; Cohort Peers</span>
                <span className="rounded bg-rose/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose">3 Online</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {[
                  { name: "Aarav Sharma", status: "In Practice Arena", dot: "bg-accent" },
                  { name: "Priya Nair", status: "Travel Stage 4", dot: "bg-mint" },
                  { name: "Rohan Verma", status: "CORE 14 Ready", dot: "bg-rose" },
                ].map((f) => (
                  <div key={f.name} className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5">
                    <span className="flex items-center gap-2 text-slate-200">
                      <span className={`h-2 w-2 rounded-full ${f.dot}`} />
                      {f.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{f.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Application Settings</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Theme Mode</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-lg border border-accent/40 bg-black/50 px-2.5 py-1 font-mono text-[11px] text-accent-soft"
                >
                  {theme === "dark" ? "Acid Dark" : "Light"}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Quick Links</span>
                <div className="flex gap-2">
                  <Link href="/progress" onClick={() => setMenuOpen(false)} className="text-mint hover:underline">Progress</Link>
                  <Link href="/conversation" onClick={() => setMenuOpen(false)} className="text-rose hover:underline">Arena</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
