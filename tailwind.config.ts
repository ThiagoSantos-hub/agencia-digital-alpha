import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background:        'var(--color-background, #F8FAFC)',
        surface:           'var(--color-sidebar, #FFFFFF)',
        border:            '#E2E8F0',
        primary:           'var(--color-primary, #1A56DB)',
        'primary-hover':   '#1E40AF',
        cta:               'var(--color-cta, #16A34A)',
        'cta-hover':       '#15803D',
        'text-main':       'var(--color-text-main, #1E293B)',
        'text-muted':      'var(--color-text-muted, #64748B)',
        'text-disabled':   '#94A3B8',
        'active-bg':       '#EFF6FF',
        'active-border':   '#BFDBFE',
        'hover-bg':        '#F1F5F9',
      },
    },
  },
  plugins: [],
}

export default config
