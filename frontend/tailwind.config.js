import tailwindcssAnimate from "tailwindcss-animate"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [tailwindcssAnimate],
}
