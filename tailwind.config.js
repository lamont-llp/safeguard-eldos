/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emergency: {
          50: '#fef2f2',
          500: '#dc2626',
          600: '#dc2626',
          700: '#b91c1c',
        },
        safe: {
          50: '#f0fdf4',
          500: '#059669',
          600: '#047857',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        community: {
          50: '#eff6ff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};