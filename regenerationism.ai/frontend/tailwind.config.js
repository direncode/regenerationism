/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Bloomberg Terminal inspired colors
        'terminal': {
          bg: '#000000',
          panel: '#0d1117',
          border: '#21262d',
          highlight: '#161b22',
        },
        // Bloomberg accent colors
        'bb': {
          orange: '#ff6600',
          amber: '#ff9500',
          green: '#00d26a',
          red: '#ff3b30',
          blue: '#007aff',
          cyan: '#00c7be',
          yellow: '#ffd60a',
          white: '#f0f6fc',
          gray: '#8b949e',
          muted: '#484f58',
        },
        // Regen colors (now orange-based for Bloomberg style)
        'regen': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6600',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Alert colors (Bloomberg style)
        'alert': {
          normal: '#00d26a',
          elevated: '#ffd60a',
          warning: '#ff9500',
          critical: '#ff3b30',
        },
        // Dark theme (pure black Bloomberg style)
        'dark': {
          900: '#000000',
          800: '#0d1117',
          700: '#161b22',
          600: '#21262d',
          500: '#30363d',
          400: '#484f58',
          300: '#8b949e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'blink': 'blink 1s step-end infinite',
        'ticker': 'ticker 20s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgb(255 102 0 / 0.3)' },
          '100%': { boxShadow: '0 0 20px rgb(255 102 0 / 0.6)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      boxShadow: {
        'terminal': 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
        'terminal-lg': '0 0 0 1px rgba(255,102,0,0.1), 0 4px 16px rgba(0,0,0,0.4)',
        'panel': '0 0 0 1px rgba(33,38,45,1)',
      }
    },
  },
  plugins: [],
}
