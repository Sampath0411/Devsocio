/** @type {import('tailwindcss').Config} */
// DevSocio design tokens — "Coastal Dev" palette.
//   Space Indigo  #222e50  · deep navy base
//   Cerulean      #007991  · primary brand / actions
//   Seagrass      #439a86  · secondary accent / success
//   Celadon       #bcd8c1  · soft surfaces / light accent
//   Light Gold    #e9d985  · highlights / CTA / rewards
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: '#007991',      // Cerulean
        'primary-soft': '#0a8fab',
        accent: '#439a86',        // Seagrass
        celadon: '#bcd8c1',       // Celadon
        gold: '#e9d985',          // Light Gold
        indigo: '#222e50',        // Space Indigo

        // Surfaces (derived from Space Indigo)
        bg: '#0b1020',            // near-black navy
        surface: '#141d33',       // panel
        'surface-2': '#1b2742',   // raised panel
        border: '#2a3a5c',
        'border-light': '#36497099',

        // Text
        'text-primary': '#eef3f8',
        'text-secondary': '#c4d0e0',
        'text-muted': '#8497b4',

        // Semantic
        success: '#439a86',       // Seagrass
        warning: '#e9d985',       // Light Gold
        danger: '#e2607a',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        input: '10px',
        btn: '24px',
        pill: '999px',
      },
      maxWidth: {
        feed: '760px',
      },
      spacing: {
        sidebar: '260px',
        rightpanel: '320px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg,#007991,#439a86)',
        'gold-gradient': 'linear-gradient(120deg,#e9d985,#d4bf5a)',
        'hero-glow': 'radial-gradient(closest-side, rgba(0,121,145,0.35), transparent)',
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(0,121,145,0.55)',
        'glow-gold': '0 0 24px -6px rgba(233,217,133,0.55)',
        card: '0 8px 30px -12px rgba(0,0,0,0.5)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-48px) scale(0.4)', opacity: '0' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'float-up': 'float-up 0.6s ease-out forwards',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        'pulse-ring': 'pulse-ring 1.2s ease-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
    },
  },
  plugins: [],
}
