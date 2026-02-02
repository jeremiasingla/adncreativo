module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "#1e9df1",
          foreground: "#fff",
        },
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter Tight",
          "ui-sans-serif",
          "sans-serif",
          "system-ui",
        ],
        serif: [
          "var(--font-instrument-serif)",
          "Instrument Serif",
          "ui-serif",
          "serif",
        ],
        "instrument-serif": [
          "var(--font-instrument-serif)",
          "Instrument Serif",
          "ui-serif",
          "serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
