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
      spacing: {
        // h-18/top-18 are used for the game balloon sizing
        '18': '4.5rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-up': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        // animate-fade-in / animate-scale-up are referenced across components
        'fade-in': 'fade-in 250ms ease-out both',
        'scale-up': 'scale-up 300ms ease-out both',
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
