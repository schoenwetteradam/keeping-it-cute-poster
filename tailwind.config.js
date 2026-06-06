/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        salon: {
          pink: '#E91E8C',
          gold: '#C9A84C',
          dark: '#1a1a2e',
          light: '#fdf4f9',
        }
      }
    },
  },
  plugins: [],
}
