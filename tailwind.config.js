/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mjm: {
          bg: "var(--mjm-bg)",
          surface: "var(--mjm-surface)",
          border: "var(--mjm-border)",
          text: "var(--mjm-text)",
          muted: "var(--mjm-muted)",
          income: "var(--mjm-income)",
          expense: "var(--mjm-expense)",
          accent: "var(--mjm-accent)",
          warn: "var(--mjm-warn)",
          danger: "var(--mjm-danger)"
        }
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};
