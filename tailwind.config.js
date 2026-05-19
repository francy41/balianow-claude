/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          pink: '#EC4899',
          'pink-dark': '#DB2777',
          'pink-light': '#FBCFE8',
          magenta: '#E91E8C',
          'hot-pink': '#FF1493',
          black: '#0A0A0A',
          'dark': '#111111',
          gray: '#F5F5F5',
          // Legacy aliases for compatibility
          orange: '#EC4899',
          'orange-dark': '#DB2777',
          'orange-light': '#FBCFE8',
        },
        sidebar: '#0A0A0A',
      },
      backgroundImage: {
        'gradient-orange': 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
        'gradient-pink': 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
        'gradient-nightlife': 'linear-gradient(135deg, #EC4899 0%, #9333EA 100%)',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-dot': 'pulse 2s infinite',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
        'orange': '0 4px 14px rgba(236,72,153,0.35)',
        'pink': '0 4px 14px rgba(236,72,153,0.35)',
        'neon': '0 0 20px rgba(236,72,153,0.5), 0 0 40px rgba(236,72,153,0.2)',
      }
    },
  },
  plugins: [],
}
