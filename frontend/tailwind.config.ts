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
    },
  },
  plugins: [],
};
export default config;