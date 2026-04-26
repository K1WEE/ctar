/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-dark': '#0B1120',
        'brand-card': 'rgba(30, 41, 59, 0.7)',
        'brand-accent': '#3b82f6',
      }
    },
  },
  plugins: [],
}
