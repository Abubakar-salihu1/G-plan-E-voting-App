/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#04703C',
          700: '#04703C',
          900: '#03532D',
        },
        gold: {
          DEFAULT: '#C9A227',
          400: '#D9B94A',
          600: '#A9840F',
        },
        paper: '#F6F9F6',
        ink: '#16201B',
        charcoal: '#14181B',
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
