/** Tailwind v3 wired to @driverhub/ui design tokens (--dh-* CSS vars). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--dh-bg)',
        surface: 'var(--dh-surface)',
        'surface-2': 'var(--dh-surface-2)',
        'surface-3': 'var(--dh-surface-3)',
        line: 'var(--dh-border)',
        'line-strong': 'var(--dh-border-strong)',
        text: 'var(--dh-text)',
        'text-2': 'var(--dh-text-secondary)',
        'text-muted': 'var(--dh-text-muted)',
        accent: 'var(--dh-accent)',
        'accent-2': 'var(--dh-accent-2)',
        info: 'var(--dh-info)',
        warning: 'var(--dh-warning)',
        danger: 'var(--dh-danger)',
      },
      fontFamily: {
        sans: ["'Inter'", '-apple-system', "'Segoe UI'", 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}