/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F19',
          surface: '#151C2C',
          border: '#242F46',
          red: '#FF0050',
          blue: '#1877F2',
          accent: '#6366F1',
          accentHover: '#4F46E5',
        },
      },
    },
  },
  plugins: [],
};
