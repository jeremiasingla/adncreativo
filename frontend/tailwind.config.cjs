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
          DEFAULT: "#EA3019",
          dark: "#A91D0B",
          medium: "#C8240F",
          light: "#FA351D",
          foreground: "#fff",
        },
        secondary: {
          DEFAULT: "#121212",
          foreground: "#fff",
        },
        gray: {
          darkest: "#121212",
          dark: "#2B2B2B",
          medium: "#3D3D3D",
          light: "#545454",
        },
        neutral: {
          lightest: "#FFFFFF",
          light: "#F7F7F7",
          medium: "#F4F4F4",
          dark: "#ECECEC",
        },
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "scale-in": "scale-in 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
      },
      transitionDuration: {
        150: "150ms",
        250: "250ms",
        350: "350ms",
      },
      fontFamily: {
        sans: [
          "var(--font-geist)",
          "Geist",
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
          "var(--font-geist-mono)",
          "Geist Mono",
          "ui-monospace",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
