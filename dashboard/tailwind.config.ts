import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'rd-red': '#ff1a1a',
        'rd-red-bright': '#ff4444',
        'rd-red-dim': '#cc1414',
        'rd-red-glow': '#ff3333',
        'rd-black': '#030303',
        'rd-black-2': '#0a0a0a',
        'rd-dark': '#0f0f0f',
        'rd-card': '#111111',
        'rd-card-2': '#161616',
        'rd-card-3': '#1a1a1a',
        'rd-text': '#ffffff',
        'rd-text-2': '#e0e0e0',
        'rd-text-3': '#b0b0b0',
        'rd-muted': '#999999',
        'rd-muted-2': '#666666',
        'rd-muted-3': '#444444',
        'rd-border': '#222222',
        'rd-border-2': '#2a2a2a',
        'rd-purple': '#a855f7',
        'rd-purple-bright': '#c084fc',
        'rd-cyan': '#06b6d4',
        'rd-green': '#00ff88',
      },
      fontFamily: {
        grotesk: ['var(--font-grotesk)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', '"Space Mono"', 'Menlo', 'monospace'],
        sans: ['var(--font-grotesk)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'flicker': 'flicker 4s linear infinite',
        'scan': 'scan 8s linear infinite',
        'drip': 'drip 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'decode': 'decode 2s steps(1) forwards',
        'typing': 'typing 3.5s steps(40) 1s forwards, blink-caret 0.75s step-end infinite',
        'matrix-fall': 'matrixFall linear infinite',
        'scan-line': 'scanLine 8s linear infinite',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
          '52%': { opacity: '0.3' },
          '54%': { opacity: '1' },
        },
        scan: {
          '0%': { top: '-10%' },
          '100%': { top: '110%' },
        },
        drip: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.8' },
          '50%': { transform: 'translateY(8px)', opacity: '0.3' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(3deg)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 26, 26, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 26, 26, 0.5)' },
        },
        decode: {
          '0%': { opacity: '0', filter: 'blur(10px)' },
          '50%': { opacity: '0.5', filter: 'blur(5px)' },
          '100%': { opacity: '1', filter: 'blur(0px)' },
        },
        typing: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        'blink-caret': {
          'from, to': { borderColor: 'transparent' },
          '50%': { borderColor: '#ff1a1a' },
        },
        matrixFall: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
