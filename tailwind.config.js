// tailwind.config.js
const tailwindConfig = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom color system that works with CSS variables
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark': 'var(--color-primary-dark)',
        
        surface: 'var(--color-surface)',
        'surface-variant': 'var(--color-surface-variant)',
        'surface-secondary': 'var(--color-surface-secondary)',
        
        background: 'var(--color-bg)',
        
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        
        border: 'var(--color-border)',
        
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        error: 'var(--color-error)',
        
        // Dark mode colors for compatibility
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
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)'
      },
      spacing: {
        '15': '3.75rem',
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      }
    },
  },
  plugins: [],
};

export default tailwindConfig;