module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'rd-black': '#0a0a0a',
        'rd-dark': '#0f0f0f',
        'rd-card': '#111111',
        'rd-red': '#ff1a1a',
        'rd-red-glow': '#ff3333',
        'rd-purple': '#9945FF',
        'rd-text': '#e0e0e0',
        'rd-muted': '#666666',
        'rd-border': '#1a1a1a',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'flicker': 'flicker 4s linear infinite',
        'scan': 'scan 8s linear infinite',
        'drip': 'drip 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'decode': 'decode 2s steps(1) forwards',
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
      },
    },
  },
  plugins: [],
}
