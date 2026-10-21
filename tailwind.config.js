import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: { DEFAULT: '#080b11', 950: '#05070c', 900: '#080b11', 800: '#0b0e14' },
        surface: { DEFAULT: '#0f172a', 2: '#131c33', 3: '#1a2542' },
        gold: { 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
        neon: { cyan: '#06B6D4', emerald: '#10B981', red: '#EF4444' },
      },
      fontFamily: {
        display: ['"Barlow Semi Condensed"', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(245, 158, 11, 0.55)',
        'glow-lg': '0 0 48px -6px rgba(245, 158, 11, 0.6)',
        cyan: '0 0 24px -4px rgba(6, 182, 212, 0.55)',
        emerald: '0 0 24px -4px rgba(16, 185, 129, 0.55)',
        red: '0 0 24px -4px rgba(239, 68, 68, 0.6)',
        card: '0 10px 40px -12px rgba(0, 0, 0, 0.7)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FDE68A 0%, #FBBF24 35%, #F59E0B 65%, #B45309 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #67E8F9 0%, #06B6D4 50%, #0E7490 100%)',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'pulse-live': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.85)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.6)' },
          '100%': { boxShadow: '0 0 0 14px rgba(239, 68, 68, 0)' },
        },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'glow-breathe': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(251,191,36,.45))' },
          '50%': { filter: 'drop-shadow(0 0 16px rgba(251,191,36,.9))' },
        },
      },
      animation: {
        marquee: 'marquee 50s linear infinite',
        'pulse-live': 'pulse-live 1.2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out both',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'glow-breathe': 'glow-breathe 3s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};
