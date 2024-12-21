// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      height: {
        '15': '3.75rem', // Add a custom class for height
      },
    },
  },
  content: ['./src/**/*.{js.jsx,ts,tsx}', './public/index.html'], // Adjust content paths
  plugins: [],
};
