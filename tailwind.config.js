/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Used across components (calibrate, reward-task, patient-portal);
        // without this definition the class silently does nothing.
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
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
