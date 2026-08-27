/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f7f9',
          border: '#e3e6ea',
        },
        night: {
          DEFAULT: '#0f1218',
          muted: '#151a22',
          border: '#262d38',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(-4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in 150ms ease-out' },
    },
  },
  plugins: [],
};
