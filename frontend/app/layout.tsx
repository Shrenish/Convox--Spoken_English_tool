import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CONVOX — Speak. Learn. Conquer.",
  description:
    "Voice-first adaptive communication simulator for Indian college students: talk to AI partners, get a CORE evaluation, and travel the world in English.",
};

const NAV = [
  { href: "/", label: "Practice" },
  { href: "/travel", label: "Travel" },
  { href: "/progress", label: "Progress" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-slate-100 antialiased">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4">
          <header className="flex items-center justify-between py-5">
            <a href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-100">
              <span className="text-xl">🎧</span> CONVOX
            </a>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-slate-300 transition-colors hover:bg-surface-2 hover:text-slate-100"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
          <main className="flex-1 pb-16">{children}</main>
          <footer className="py-6 text-center text-[11px] text-slate-500">
            CONVOX v0.1 · speak, learn, conquer.
          </footer>
        </div>
      </body>
    </html>
  );
}