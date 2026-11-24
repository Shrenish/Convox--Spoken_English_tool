"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/travel", label: "Travel" },
  { href: "/progress", label: "Progress" },
];

export function NavBar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // On the welcome/landing page, show a minimal logo-only header
  const isLandingPage = pathname === "/" && !user;

  return (
    <header className="flex items-center justify-between py-5">
      <Link
        href={user ? "/dashboard" : "/"}
        className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-100"
      >
        <span className="text-xl">🎧</span>
        <span>CONVOX</span>
      </Link>

      {!loading && (
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              {APP_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 transition-colors hover:bg-surface-2 hover:text-slate-100 ${
                    pathname === item.href
                      ? "bg-surface-2 text-slate-100"
                      : "text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="ml-3 flex items-center gap-2 border-l border-line pl-3">
                <span className="text-xs text-slate-400 hidden sm:block">
                  {user.display_name}
                </span>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-surface-2 hover:text-slate-100 text-xs"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : !isLandingPage ? (
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-slate-300 transition-colors hover:bg-surface-2 hover:text-slate-100"
            >
              Sign in
            </Link>
          ) : null}
        </nav>
      )}
    </header>
  );
}
