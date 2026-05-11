/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './ui/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ExpressoTS brand green (matches expresso-ts.com Radix "base" scale)
        primary: {
          50: '#fbfefc',
          100: '#effdf4',
          200: '#dafee5',
          300: '#b8face',
          400: '#80f5a8',
          500: '#3de678',
          600: '#19ce59',
          700: '#0eab46',
          800: '#0f8639',
          900: '#116a32',
          950: '#10572b',
        },
        // Brand neutral scale (dark theme background / text)
        brand: {
          50: '#fcfcfc',
          100: '#f8f8f8',
          200: '#f3f3f3',
          300: '#ededed',
          400: '#e8e8e8',
          500: '#dbdbdb',
          600: '#c7c7c7',
          700: '#ababab',
          800: '#858585',
          900: '#606060',
          950: '#2f2f2f',
          975: '#171717',
        },
        accent: {
          50: '#effdf4',
          100: '#dafee5',
          200: '#b8face',
          300: '#80f5a8',
          400: '#3de678',
          500: '#19ce59',
          600: '#0eab46',
          700: '#0f8639',
          800: '#116a32',
          900: '#10572b',
          950: '#082413',
        },
        success: {
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
