import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand gold palette
        gold: {
          50: '#FFFDF5',
          100: '#FFF9E6',
          200: '#FFF0BF',
          300: '#FFE699',
          400: '#FFD54F',
          500: '#D4AF37',
          600: '#C19A00',
          700: '#9A7B00',
          800: '#735C00',
          900: '#4D3D00',
        },
        // League-specific colors (overridden via CSS variables)
        league: {
          primary: 'var(--league-primary, #D4AF37)',
          secondary: 'var(--league-secondary, #1a1a1a)',
          accent: 'var(--league-accent, #D4AF37)',
        },
        // Semantic colors
        background: 'var(--color-background)',
        foreground: 'var(--color-text-primary)',
        muted: 'var(--color-text-secondary)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)',
        surface: 'var(--color-surface)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(212, 175, 55, 0.15)',
        glow: '0 0 40px rgba(212, 175, 55, 0.2)',
        'glow-lg': '0 0 60px rgba(212, 175, 55, 0.3)',
        'league-glow': '0 0 40px var(--league-glow-color, rgba(212, 175, 55, 0.2))',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.4)' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
