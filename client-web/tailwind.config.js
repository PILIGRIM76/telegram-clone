/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#229ED9',
        dark: '#1c1c1e',
        darker: '#000000',
      },
    },
  },
  plugins: [],
}