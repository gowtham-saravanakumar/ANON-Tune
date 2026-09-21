/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Light, neutral, Google-style palette.
        ink: "#FFFFFF",
        elevated: "#F8F9FA",
        card: "#FFFFFF",
        border: "#DADCE0",
        warm: "#1A73E8",
        warmsoft: "rgba(26,115,232,0.08)",
        cool: "#188038",
        coolsoft: "rgba(24,128,56,0.08)",
        ptext: "#202124",
        muted: "#5F6368",
        success: "#188038",
        danger: "#D93025",
      },
      fontFamily: {
        display: ["'Roboto'", "sans-serif"],
        body: ["'Roboto'", "sans-serif"],
        mono: ["'Roboto Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 1px 2px 0 rgba(60,64,67,0.30), 0 1px 3px 1px rgba(60,64,67,0.15)",
        glowcool: "0 1px 2px 0 rgba(60,64,67,0.30), 0 1px 3px 1px rgba(60,64,67,0.15)",
      },
      keyframes: {
        pulseline: {
          "0%, 100%": { opacity: 0.5 },
          "50%": { opacity: 1 },
        },
        floatin: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        pulseline: "pulseline 3s ease-in-out infinite",
        floatin: "floatin 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
