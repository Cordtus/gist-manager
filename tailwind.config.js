// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      height: {
        '15': '3.75rem',
      },
      colors: {
        dark: {
          bg: {
            primary: '#1a202c',
            secondary: '#2d3748',
            tertiary: '#4a5568',
          },
          text: {
            primary: '#f7fafc',
            secondary: '#e2e8f0',
            tertiary: '#a0aec0',
          }
        }
      }
    },
  },
  plugins: [],
};