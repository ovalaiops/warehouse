import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Cryptix-inspired dark theme
        background: "#08070e",
        surface: "#17171d",
        "surface-elevated": "#202026",
        border: "rgba(95, 95, 113, 0.22)",
        accent: {
          DEFAULT: "#00ffb2",
          muted: "rgba(0, 255, 178, 0.04)",
          hover: "rgba(0, 255, 178, 0.12)",
        },
        critical: "#f06",
        warning: "#ffb800",
        success: "#00ffb2",
        info: "#3b82f6",
        "text-primary": "#ffffff",
        "text-secondary": "#a1a1aa",
        "text-muted": "#71717a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
        button: "8px",
        badge: "6px",
      },
      maxWidth: {
        container: "1184px",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
    },
  },
  plugins: [],
};

export default config;
