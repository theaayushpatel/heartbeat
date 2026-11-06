/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        heartbeat: {
          crimson: '#e11d48',
          rose: '#f43f5e',
          pulse: '#ff0055',
          obsidian: '#0a0d14',
          slate: '#121722',
          card: '#161d2d',
          border: '#242e42',
          emerald: '#10b981',
          cyan: '#06b6d4',
          amber: '#f59e0b',
        },
        paladin: {
          blue: '#0d131f',
          silver: '#cbd5e1',
          gold: '#f43f5e',
          'blue-light': '#1e293b',
          'blue-dark': '#070a10',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
