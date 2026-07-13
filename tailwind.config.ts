import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: '#FF8FA3',
        mint: '#7DD3C0',
        warm: { 50: '#FFF8F0', 100: '#FFF0E0', 200: '#FFE0CC' },
        ink: { 900: '#2D2D2D', 600: '#888888' },
        warn: '#FFB74D'
      },
      fontSize: {
        'fluid-xs': 'clamp(0.75rem, 1.2vw, 0.875rem)',
        'fluid-base': 'clamp(0.9rem, 1.5vw, 1rem)',
        'fluid-lg': 'clamp(1.1rem, 2vw, 1.5rem)',
        'fluid-xl': 'clamp(1.5rem, 3vw, 2.5rem)',
        'fluid-2xl': 'clamp(2rem, 4vw, 3.5rem)'
      }
    }
  },
  plugins: []
}
export default config
