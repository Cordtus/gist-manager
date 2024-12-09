module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      height: {
        15: '3.75rem', // Custom height utility
      },
      width: {
        120: '30rem', // Example for a custom width
      },
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          light: '#7c8df7',
          dark: '#3b39cc',
        },
        secondary: {
          DEFAULT: '#6366f1',
          light: '#9ba3fc',
          dark: '#4c51d8',
        },
      },
      fontSize: {
        '2xs': '0.625rem', // Extra small font size
      },
      borderRadius: {
        xl: '1rem', // Custom border radius
      },
      spacing: {
        buttonPadding: '10px', // Custom spacing utility
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/line-clamp'),
  ],
};
