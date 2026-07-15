/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo principal y variantes
        'app-bg': '#09090B',
        'card-bg': '#0A0A0C',
        
        // Acento neón amarillo
        'accent': '#D4FF00',
        
        // Blancos y grises sutiles para texto y bordes
        'white-soft': '#FFFFFF',
        'zinc-400': '#A1A1AA',
        'zinc-500': '#71717A',
        'zinc-600': '#52525B',
        
        // Colores funcionales (errores, éxito)
        'red-400': '#F87171',
        'green-400': '#4ADE80',
      },
      backgroundColor: {
        'glass': 'rgba(255, 255, 255, 0.03)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.06)',
      },
      backdropBlur: {
        'xl': '20px',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(212, 255, 0, 0.15)',
        'neon-sm': '0 0 10px rgba(212, 255, 0, 0.1)',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};