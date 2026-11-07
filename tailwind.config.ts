import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef7f6", 100: "#d5ecea", 500: "#0f9690", 600: "#00807c", 700: "#006a67" },
        ink: { 900: "#1e2a3a", 600: "#536075", 400: "#8a96a8" },
        cdh: { cyan: "#0fbcdc", navy: "#1b0fa0", red: "#ff3535" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(30,42,58,.04), 0 4px 16px rgba(30,42,58,.04)" },
    },
  },
  plugins: [],
} satisfies Config;
