/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        epson: {
          blue: '#003087',
          'blue-mid': '#0047BB',
          'blue-light': '#1a5fd4',
          'blue-sidebar': '#002F87',
          'blue-card': '#EEF3FF',
          accent: '#3B73D8',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,48,135,0.08)',
        'card-hover': '0 4px 24px rgba(0,48,135,0.14)',
      },
    },
  },
  plugins: [],
};
