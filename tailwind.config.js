/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
          // Rosa de marca actualizado (referencia: logo "Latineo" aportado por el cliente) —
          // magenta vivo, un punto más saturado/vibrante que el rosa anterior.
          pink: '#E5127D',
          'pink-dark': '#C00E68',
          'pink-light': '#FAD3E9',
          magenta: '#E91E8C',
          'hot-pink': '#FF1493',
          black: '#0A0A0A',
          'dark': '#111111',
          gray: '#F5F5F5',
          // Legacy aliases for compatibility
          orange: '#E5127D',
          'orange-dark': '#C00E68',
          'orange-light': '#FAD3E9',
        },
        sidebar: '#0A0A0A',
        // ── Design tokens (ver DESIGN_AUDIT.md / DESIGN_CHANGELOG.md) ──
        // Resuelven a variables CSS definidas en src/index.css, con valores
        // distintos bajo `.dark` — así una sola clase (`bg-surface`,
        // `text-ink-secondary`...) funciona en ambos modos sin `dark:`.
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          'elevated-2': 'rgb(var(--surface-elevated-2) / <alpha-value>)',
        },
        ink: {
          primary: 'rgb(var(--ink-primary) / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--ink-tertiary) / <alpha-value>)',
        },
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          warm: 'rgb(var(--accent-warm) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'gradient-orange': 'linear-gradient(#E5127D, #E5127D)',
        'gradient-pink': 'linear-gradient(#E5127D, #E5127D)',
        'gradient-nightlife': 'linear-gradient(#E5127D, #E5127D)',
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
        'orange': '0 4px 14px rgba(229,18,125,0.35)',
        'pink': '0 4px 14px rgba(229,18,125,0.35)',
        'neon': '0 0 20px rgba(229,18,125,0.5), 0 0 40px rgba(229,18,125,0.2)',
        // ── Escala de elevación premium (3 niveles, tintada, nunca negro puro) ──
        'elevation-1': '0 1px 2px rgb(var(--shadow-tint) / 0.06), 0 1px 1px rgb(var(--shadow-tint) / 0.04)',
        'elevation-2': '0 4px 16px rgb(var(--shadow-tint) / 0.10), 0 2px 6px rgb(var(--shadow-tint) / 0.06)',
        'elevation-3': '0 12px 32px rgb(var(--shadow-tint) / 0.16), 0 4px 12px rgb(var(--shadow-tint) / 0.08)',
      },
      fontSize: {
        // ── Escala tipográfica fija — nada fuera de esta escala ──
        xs: ['0.75rem', { lineHeight: '1.5' }],     // 12
        sm: ['0.875rem', { lineHeight: '1.5' }],    // 14
        base: ['1rem', { lineHeight: '1.6' }],      // 16
        lg: ['1.25rem', { lineHeight: '1.4' }],     // 20
        xl: ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],   // 24
        '2xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }], // 32
        '3xl': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }], // 44
        '4xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }], // 60
      },
      // Nota: la escala de espaciado base-4 de Tailwind por defecto (4/8/12/16/24/32/48/64/96px)
      // ya cumple el requisito del brief — no se sobreescribe. El trabajo pendiente es eliminar,
      // componente a componente, los valores arbitrarios sueltos (`p-[13px]`, `gap-[18px]`, etc.)
      // detectados en DESIGN_AUDIT.md y sustituirlos por esta escala.
    },
  },
  plugins: [],
}
