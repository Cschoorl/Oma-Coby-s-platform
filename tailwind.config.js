/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coby: {
          50: "#fff8ed",
          100: "#ffedd1",
          200: "#ffd6a0",
          300: "#ffbd6c",
          400: "#f8a13f",
          500: "#ea8421",
          600: "#cc6717",
          700: "#a14a14",
          800: "#7f3917",
          900: "#672f16"
        }
      },
      boxShadow: {
        card: "0 8px 24px rgba(88, 46, 9, 0.1)"
      }
    }
  },
  plugins: []
};
