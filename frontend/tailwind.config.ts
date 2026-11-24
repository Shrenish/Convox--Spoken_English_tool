import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--bg-ink)",
        surface: "var(--bg-surface)",
        "surface-2": "var(--bg-surface-2)",
        line: "var(--border-line)",
        accent: "#5b8cff",
        "accent-soft": "#9db9ff",
        mint: "#3dd68c",
        amber: "#ffb454",
        rose: "#ff6b8b",
      },
      borderRadius: { xl2: "1.25rem" },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.35s ease-out both",
        "float-up": "float-up 3s ease-in-out infinite",
        "spin-slow": "spin-slow 12s linear infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.92)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "float-up": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(91, 140, 255, 0)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(91, 140, 255, 0.2)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
