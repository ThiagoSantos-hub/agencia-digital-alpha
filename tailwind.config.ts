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
        background:        'var(--color-background, #F1F5F9)',
        surface:           'var(--color-surface, #FFFFFF)',
        border:            'var(--color-border, #E2E8F0)',
        primary:           'var(--color-primary, #1A56DB)',
        'primary-hover':   'var(--color-primary-hover, #1E40AF)',
        ai:                'var(--color-ai, #4C3ABF)',
        'ai-hover':        'var(--color-ai-hover, #3B2F9B)',
        cta:               'var(--color-cta, #16A34A)',
        'cta-hover':       'var(--color-cta-hover, #15803D)',
        'text-main':       'var(--color-text-main, #1E293B)',
        'text-muted':      'var(--color-text-muted, #64748B)',
        'text-disabled':   'var(--color-text-disabled, #94A3B8)',
        'active-bg':       '#EFF6FF',
        'active-border':   '#BFDBFE',
        'hover-bg':        'var(--color-hover-bg, #F1F5F9)',
      },
      // Elevação 3D global — qualquer shadow-sm/md/lg do sistema
      boxShadow: {
        sm: 'var(--shadow-elevated-sm)',
        DEFAULT: 'var(--shadow-elevated-sm)',
        md: 'var(--shadow-elevated-md)',
        lg: 'var(--shadow-elevated-lg)',
        xl: 'var(--shadow-elevated-lg)',
        '2xl': 'var(--shadow-elevated-lg)',
        'elevated-sm': 'var(--shadow-elevated-sm)',
        'elevated-md': 'var(--shadow-elevated-md)',
        'elevated-lg': 'var(--shadow-elevated-lg)',
        btn: 'var(--shadow-btn)',
        'btn-hover': 'var(--shadow-btn-hover)',
      },
    },
  },
  plugins: [],
}

export default config
