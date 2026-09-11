/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vignan: {
          red: '#E31B23',
          navy: '#0E2A47',
          blue: '#1E6091',
          accent: '#2A75D3',
          light: '#F4F7FB',
          border: '#D9E2EC',
        },
        bolt: {
          primary: '#2563EB',
          glow: '#60A5FA',
          cyan: '#06B6D4',
          dark: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(14, 42, 71, 0.08)',
        'glow': '0 0 25px rgba(37, 99, 235, 0.25)',
      }
    },
  },
  plugins: [],
}
