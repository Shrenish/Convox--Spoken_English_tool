import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "CONVOX — Speak. Learn. Conquer.",
  description:
    "Voice-first adaptive communication simulator: talk to AI partners, get a CORE evaluation, and become a confident communicator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4">
              <NavBar />
              <main className="flex-1 pb-16">{children}</main>
              <footer className="py-6 text-center text-[11px] text-slate-500">
                CONVOX v0.2 · speak, learn, conquer.
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
