/** @type {import('tailwindcss').Config} */
// Huisstijl Oma Coby's Oliebollenbar; zie docs/huisstijl-regels.md.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Merkkleuren uit het design system.
        meel: "#f9f3d9",
        krent: { DEFAULT: "#261f1f", hover: "#3a2f2f" },
        oliebol: { DEFAULT: "#5c4238", 50: "#f1e7df" },
        feest: { DEFAULT: "#d05438", 50: "#fbe5dd", hover: "#bf4a30", ink: "#9a3219" },
        kerst: { DEFAULT: "#69873c", 50: "#e7efd8", ink: "#3c561b" },
        gouwe: { DEFAULT: "#dcc05d", 50: "#fbf3cf", 100: "#f4e5a6", hover: "#d2b44b", ink: "#5b480b" },
        // Afgeleid voor schermen.
        papier: "#fffdf6",
        muted: "#6d5a4f",
        lijn: { DEFAULT: "#ebe1bf", 2: "#d8c998" },
        vul: { DEFAULT: "rgba(92, 66, 56, 0.07)", 2: "rgba(92, 66, 56, 0.12)" }
      },
      fontFamily: {
        sans: ["Arvo", "Rockwell", "Georgia", "serif"],
        serif: ["Vollkorn", "Georgia", "serif"],
        display: ["VTC SuperMarket", "Impact", "Arial Narrow", "sans-serif"]
      },
      borderRadius: {
        kaart: "10px"
      },
      boxShadow: {
        zacht: "0 1px 2px rgba(38, 31, 31, 0.06), 0 2px 6px rgba(38, 31, 31, 0.04)",
        zwevend: "0 4px 16px rgba(38, 31, 31, 0.10), 0 1px 3px rgba(38, 31, 31, 0.06)"
      }
    }
  },
  plugins: []
};
