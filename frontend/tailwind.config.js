/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#040f0c',
        card: '#0b1f18',
        border: 'rgba(16, 185, 129, 0.15)',
        primary: {
          DEFAULT: '#10b981',
          hover: '#059669',
          light: '#34d399',
          dark: '#047857'
        },
        neon: {
          emerald: '#10b981',
          lime: '#84cc16',
          amber: '#f59e0b',
          yellow: '#fbbf24',
          cyan: '#06b6d4',
          teal: '#14b8a6'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        glow: '0 0 30px -5px rgba(16, 185, 129, 0.45)',
        'glow-amber': '0 0 30px -5px rgba(245, 158, 11, 0.45)',
        'glow-lime': '0 0 30px -5px rgba(132, 204, 22, 0.45)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.6)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 4s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      }
    },
  },
  plugins: [],
}
