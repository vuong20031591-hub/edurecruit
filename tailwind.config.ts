import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/shared/components/**/*.{ts,tsx}',
    './src/modules/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Brand - từ Figma
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#1e6dff',   // active menu
          600: '#1a5ce0',   // primary button
          700: '#1748b8',
          900: '#0d2a6b'
        },
        // Slate - sidebar & text
        slate: {
          50:  '#f8fafc',   // main content bg
          100: '#f1f5f9',   // page bg
          200: '#e2e8f0',   // borders
          300: '#cbd5e1',
          400: '#94a3b8',   // text tertiary
          500: '#64748b',   // text secondary
          600: '#475569',
          700: '#334155',
          800: '#1d293d',   // bottom status bar
          900: '#0f172b',   // sidebar bg
          950: '#0a0f1c'    // deeper
        },
        // Status (giữ nguyên từ trước)
        status: {
          success: '#16a34a',
          warning: '#f59e0b',
          danger:  '#dc2626',
          info:    '#0ea5e9',
          neutral: '#6b7280'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        '2xs': ['0.6875rem', '1rem']
      },
      spacing: {
        13: '3.25rem',   // 52px (TopBar height theo Figma)
        '4.5': '1.125rem'
      }
    }
  },
  plugins: []
};

export default config;
