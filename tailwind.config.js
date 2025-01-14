// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      height: {
        '15': '3.75rem', // Defines h-15 as 3.75rem (adjust if needed)
      },
    },
  },
  plugins: [],
};
