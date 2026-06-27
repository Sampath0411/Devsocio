/** @type {import('tailwindcss').Config} */
// DevSocio design tokens — "Dark Command" palette.
//   Black         #000000  · deepest background
//   Prussian Blue #14213D  · primary surface, cards, nav
//   Orange        #FCA311  · brand accent, CTAs, highlights
//   Alabaster     #E5E5E5  · text, borders, muted elements
//   White         #FFFFFF  · headings, primary text
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: '#FCA311',       // Orange — main CTA / accent
        'primary-soft': '#FDB340',
        'primary-dark': '#E8920A',
        accent: '#FCA311',        // alias

        // Surfaces
        bg: '#000000',            // Pure black
        surface: '#14213D',       // Prussian Blue — panels
        'surface-2': '#1A2B4E',   // Lighter prussian — raised panels
        'surface-3': '#0D1628',   // Darker prussian — deep sections
        border: '#1E2F4A',
        'border-light': '#263C60',

        // Text
        'text-primary': '#FFFFFF',      // White
        'text-secondary': '#E5E5E5',    // Alabaster
        'text-muted': '#A0ADC0',        // Muted blue-grey

        // Semantic
        success: '#22C55E',
        warning: '#FCA311',       // Orange doubles as warning
        danger: '#EF4444',
        info: '#60A5FA',

        // Named tokens for direct use
        prussian: '#14213D',
        alabaster: '#E5E5E5',
        orange: '#FCA311',
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
        // Orange → Prussian gradient (brand)
        'brand-gradient': 'linear-gradient(135deg, #FCA311 0%, #14213D 100%)',
        'brand-gradient-r': 'linear-gradient(135deg, #14213D 0%, #FCA311 100%)',
        // Orange glow for CTAs
        'orange-gradient': 'linear-gradient(120deg, #FCA311, #FDB340)',
        // Hero background
        'hero-glow': 'radial-gradient(ellipse at 50% 0%, rgba(252,163,17,0.15) 0%, transparent 70%)',
        // Prussian gradient for surfaces
        'prussian-gradient': 'linear-gradient(135deg, #14213D, #0D1628)',
        // Card shine
        'card-shine': 'linear-gradient(135deg, rgba(252,163,17,0.08) 0%, transparent 50%)',
      },
      boxShadow: {
        glow: '0 0 32px -8px rgba(252,163,17,0.5)',
        'glow-sm': '0 0 16px -4px rgba(252,163,17,0.4)',
        'glow-lg': '0 0 48px -12px rgba(252,163,17,0.6)',
        card: '0 8px 32px -8px rgba(0,0,0,0.6)',
        'card-hover': '0 16px 40px -8px rgba(0,0,0,0.8), 0 0 24px -8px rgba(252,163,17,0.15)',
        nav: '0 4px 24px -4px rgba(0,0,0,0.5)',
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
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'heart-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'particle': {
          '0%': { transform: 'translateY(0) translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) translateX(var(--tx, 20px)) scale(0)', opacity: '0' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'onboard-enter': {
          '0%': { transform: 'scale(0.9) translateY(20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'nav-indicator': {
          '0%': { width: '0%', opacity: '0' },
          '100%': { width: '100%', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'float-up': 'float-up 0.6s ease-out forwards',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        'pulse-ring': 'pulse-ring 1.2s ease-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'spin-slow': 'spin-slow 8s linear infinite',
        'heart-pop': 'heart-pop 0.3s ease-out',
        'count-up': 'count-up 0.4s ease-out',
        'particle': 'particle 0.6s ease-out forwards',
        'confetti-fall': 'confetti-fall 2s ease-in forwards',
        'onboard-enter': 'onboard-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'nav-indicator': 'nav-indicator 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
