/** @type {import('tailwindcss').Config} */
// Design tokens mirror PRD §6.2 (color palette) and §6.3 (typography).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        accent: '#00E5FF',
        bg: '#0D0D0D',
        surface: '#16161E',
        border: '#2A2A3D',
        'text-primary': '#EEEEFF',
        'text-muted': '#8888AA',
        success: '#00C896',
        warning: '#FFB800',
        danger: '#FF4C4C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        btn: '24px',
        pill: '999px',
      },
      maxWidth: {
        feed: '680px',
      },
      spacing: {
        sidebar: '260px',
        rightpanel: '320px',
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
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'float-up': 'float-up 0.6s ease-out forwards',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        'pulse-ring': 'pulse-ring 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
