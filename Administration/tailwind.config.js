/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Palette alignée sur ClientApp/src/theme/colors.ts
      colors: {
        ink: { DEFAULT: '#14142B', 900: '#0A0A18', 800: '#14142B', 700: '#22223F', 600: '#2E2E52' },
        accent: {
          50: '#EBEEFE', 100: '#D9DFFD', 200: '#B4C0FB', 300: '#8FA0F7', 400: '#6F86FF',
          500: '#3652E0', 600: '#2A40B8', 700: '#22349A', 800: '#1B297A', 900: '#141F5C',
        },
        success: { DEFAULT: '#1FAA59', soft: '#E4F7EC' },
        danger: { DEFAULT: '#E5484D', soft: '#FDECEC' },
        warning: { DEFAULT: '#F5A524', soft: '#FDF3E0' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,43,0.04), 0 1px 3px rgba(20,20,43,0.06)',
        pop: '0 12px 32px -8px rgba(20,20,43,0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(6px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'pop-in': 'pop-in .18s ease-out',
        'slide-in': 'slide-in .22s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
