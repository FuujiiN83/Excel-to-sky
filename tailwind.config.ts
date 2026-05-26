import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'sans-serif'],
        ui: ['Geist', 'ui-sans-serif', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        sky: { DEFAULT: 'var(--sky)', soft: 'var(--sky-soft)' },
        mint: { DEFAULT: 'var(--mint)', soft: 'var(--mint-soft)' },
        coral: { DEFAULT: 'var(--coral)', soft: 'var(--coral-soft)' },
        plum: { DEFAULT: 'var(--plum)', soft: 'var(--plum-soft)' },
        amber: { DEFAULT: 'var(--amber)', soft: 'var(--amber-soft)' },
        rose: { DEFAULT: 'var(--rose)', soft: 'var(--rose-soft)' },
        lime: { DEFAULT: 'var(--lime)', soft: 'var(--lime-soft)' },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}

export default config
