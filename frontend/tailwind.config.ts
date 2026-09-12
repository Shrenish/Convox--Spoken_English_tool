import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        surface: "#131a2e",
        "surface-2": "#1b2440",
        line: "#2a3557",
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