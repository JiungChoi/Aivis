/** @type {import('tailwindcss').Config} */
// Tokens live in src/index.css (:root). Here we only re-expose them to
// Tailwind utilities as var() references — no literal values.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: 'var(--bg-0)',
        bg1: 'var(--bg-1)',
        bg2: 'var(--bg-2)',
        bg3: 'var(--bg-3)',
        sunken: 'var(--bg-sunken)',
        'border-1': 'var(--border-1)',
        'border-2': 'var(--border-2)',
        'border-3': 'var(--border-3)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-bg': 'var(--accent-bg)',
        'accent-border': 'var(--accent-border)',
        'on-accent': 'var(--on-accent)',
        ok: 'var(--ok)',
        'ok-bg': 'var(--ok-bg)',
        'ok-border': 'var(--ok-border)',
        warn: 'var(--warn)',
        'warn-bg': 'var(--warn-bg)',
        'warn-border': 'var(--warn-border)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        'danger-border': 'var(--danger-border)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        full: 'var(--r-full)',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
        modal: 'var(--shadow-modal)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.25,0.1,0.25,1)',
      },
    },
  },
  plugins: [],
};
