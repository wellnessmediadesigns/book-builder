import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS variables (see globals.css)
        paper: "hsl(var(--paper) / <alpha-value>)",
        "paper-raised": "hsl(var(--paper-raised) / <alpha-value>)",
        "paper-sunken": "hsl(var(--paper-sunken) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        "ink-soft": "hsl(var(--ink-soft) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        brass: {
          DEFAULT: "hsl(var(--brass) / <alpha-value>)",
          deep: "hsl(var(--brass-deep) / <alpha-value>)",
          soft: "hsl(var(--brass-soft) / <alpha-value>)",
        },
        muse: {
          DEFAULT: "hsl(var(--muse) / <alpha-value>)",
          deep: "hsl(var(--muse-deep) / <alpha-value>)",
          soft: "hsl(var(--muse-soft) / <alpha-value>)",
        },
        sage: "hsl(var(--sage) / <alpha-value>)",
        clay: "hsl(var(--clay) / <alpha-value>)",
        // shadcn-style aliases
        background: "hsl(var(--paper) / <alpha-value>)",
        foreground: "hsl(var(--ink) / <alpha-value>)",
        border: "hsl(var(--line) / <alpha-value>)",
        ring: "hsl(var(--muse) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["var(--font-reading)", "Georgia", "serif"],
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.25rem, 4vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.25rem)", { lineHeight: "1.12", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px hsl(var(--ink) / 0.04), 0 4px 16px hsl(var(--ink) / 0.05)",
        raised: "0 2px 4px hsl(var(--ink) / 0.05), 0 12px 32px hsl(var(--ink) / 0.08)",
        float: "0 8px 24px hsl(var(--ink) / 0.12), 0 2px 6px hsl(var(--ink) / 0.08)",
        glow: "0 0 0 1px hsl(var(--muse) / 0.25), 0 8px 28px hsl(var(--muse) / 0.22)",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) both",
        "fade-in": "fade-in 0.4s ease both",
        "scale-in": "scale-in 0.2s var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
