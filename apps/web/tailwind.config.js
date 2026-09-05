/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--dh-bg)',
        surface: 'var(--dh-surface)',
        surface2: 'var(--dh-surface-2)',
        surface3: 'var(--dh-surface-3)',
        line: 'var(--dh-border)',
        ink: 'var(--dh-text)',
        ink2: 'var(--dh-text-secondary)',
        ink3: 'var(--dh-text-muted)',
        accent: 'var(--dh-accent)',
        accent2: 'var(--dh-accent-2)',
        info: 'var(--dh-info)',
        warning: 'var(--dh-warning)',
        danger: 'var(--dh-danger)',
      },
    },
  },
  plugins: [],
}
