/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Obsidiana y Titanio (Ultra-Lujo)
        'obsidian': {
          DEFAULT: '#050507',
          deep: '#030304',
          card: '#0A0A0F',
          surface: '#111118',
          elevated: '#171722',
        },
        // Acento Neón Volt Signature
        'volt': {
          DEFAULT: '#D4FF00',
          hover: '#E2FF33',
          glow: 'rgba(212, 255, 0, 0.4)',
          dim: 'rgba(212, 255, 0, 0.12)',
        },
        // Metales y Acentos de Telemetría
        'titanium': {
          DEFAULT: '#F1F5F9',
          muted: '#94A3B8',
          dark: '#334155',
        },
        'neon': {
          cyan: '#00F5FF',
          purple: '#B347FF',
          amber: '#FFB800',
          rose: '#FF2A55',
          emerald: '#00FFA3',
        },
      },
      boxShadow: {
        'specular': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.14), 0 12px 32px -8px rgba(0, 0, 0, 0.85)',
        'specular-volt': 'inset 0 1px 1px 0 rgba(212, 255, 0, 0.4), 0 0 25px -4px rgba(212, 255, 0, 0.3)',
        'volt-glow': '0 0 35px rgba(212, 255, 0, 0.35)',
        'volt-glow-sm': '0 0 15px rgba(212, 255, 0, 0.25)',
        'glass-dock': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15), 0 20px 40px -10px rgba(0, 0, 0, 0.95)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'obsidian-mesh': 'radial-gradient(circle at 50% -20%, rgba(212, 255, 0, 0.08) 0%, transparent 60%), radial-gradient(circle at 100% 100%, rgba(179, 71, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 0% 50%, rgba(0, 245, 255, 0.02) 0%, transparent 50%)',
        'card-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'volt-gradient': 'linear-gradient(135deg, #E5FF33 0%, #D4FF00 50%, #B8E600 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};