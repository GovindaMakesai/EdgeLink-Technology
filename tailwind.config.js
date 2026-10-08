/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070a12',
          900: '#0c1220',
          800: '#141c2f',
          700: '#1c2740',
        },
        violet: {
          glow: '#8d7cff',
        },
        lagoon: '#6ee4ea',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(109, 94, 252, 0.18)',
      },
    },
  },
  plugins: [],
};
