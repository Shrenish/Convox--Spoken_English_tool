"use client";

import Link from "next/link";
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isLandingPage = pathname === "/" && !user;

  return (
    <header className="flex items-center justify-between py-5 border-b border-line/40 mb-6 sticky top-0 z-30 backdrop-blur-md"
      style={{ backgroundColor: "var(--header-bg)" }}>
      <Link
        href={user ? "/dashboard" : "/"}
        className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight group"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-accent-soft text-white shadow-md shadow-accent/30 transition-transform group-hover:scale-105">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12v4c0 1.66 1.34 3 3 3h1v-7H4v-2c0-4.41 3.59-8 8-8s8 3.59 8 8v2h-2v7h1c1.66 0 3-1.34 3-3v-4c0-5.52-4.48-10-10-10zm-5 13H5v-4h2v4zm12 0h-2v-4h2v4z"/>
          </svg>
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
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-slate-300 transition-colors hover:border-accent/40 hover:text-slate-100"
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4 fill-amber" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-4 w-4 fill-accent" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {!loading && user && (
          <div className="flex items-center gap-2 border-l border-line pl-2">
            <span className="text-xs text-slate-400 hidden md:block max-w-[100px] truncate font-medium">
              {user.display_name}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-lg px-2.5 py-1 text-slate-400 transition-colors hover:bg-rose/10 hover:text-rose text-xs font-medium"
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
  );
}
