/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./static/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        bread: {
          50: '#fefdfb',
          100: '#fffaf5',
          200: '#fbeedb',
          300: '#f6d9b4',
          400: '#eeb87d',
          500: '#e49449',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#451a03',
        }
      }
    }
  },
  plugins: [],
}
