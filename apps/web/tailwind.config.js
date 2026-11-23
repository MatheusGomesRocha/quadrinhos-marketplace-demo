/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: { 50: '#fff4ed', 100: '#ffe4d1', 200: '#ffc6a3', 500: '#ff5a1f', 600: '#ee430a', 700: '#c43309' },
        tinta: { 900: '#17141f', 800: '#231f2e', 700: '#342e45' },
        papel: '#faf7f2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: { suave: '0 1px 2px rgba(23,20,31,.04), 0 8px 24px -12px rgba(23,20,31,.18)', cartao: '0 1px 2px rgba(23,20,31,.05)' },
      keyframes: { subir: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } }, brilho: { '100%': { transform: 'translateX(100%)' } } },
      animation: { subir: 'subir .35s ease-out both' },
    },
  },
  plugins: [],
};
