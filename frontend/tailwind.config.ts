import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: "#f3f4f6",
          dark: "#0f172a",
        },
        surface: {
          light: "#ffffff",
          dark: "#1f2937",
        },
        accent: {
          primary: "#1d4ed8",
          secondary: "#10b981",
        },
        triage: {
          high: "#ef4444",
          medium: "#f97316",
          low: "#facc15",
        },
        sla: {
          ok: "#22c55e",
          breach: "#ef4444",
        },
      },
      boxShadow: {
        card: "0 10px 25px -15px rgba(15, 23, 42, 0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
