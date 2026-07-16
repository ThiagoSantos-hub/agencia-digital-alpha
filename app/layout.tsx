import type { Metadata } from 'next'
import './globals.css'
import { createServerClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Agência Digital Alpha',
  description: 'Plataforma de gestão para agências digitais',
}

async function getAgencySettings() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('agency_settings')
    .select('key, value')
  
  const settings: Record<string, string> = {
    color_primary: '#1A56DB',
    color_cta: '#16A34A',
    color_background: '#F8FAFC',
    color_sidebar: '#FFFFFF',
    color_header: '#FFFFFF',
    color_text_main: '#1E293B',
    color_text_muted: '#64748B',
  }

  if (data) {
    data.forEach(item => {
      settings[item.key] = item.value
    })
  }

  return settings
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getAgencySettings()

  const dynamicStyles = {
    '--color-primary': settings.color_primary,
    '--color-cta': settings.color_cta,
    '--color-background': settings.color_background,
    '--color-sidebar': settings.color_sidebar,
    '--color-header': settings.color_header,
    '--color-text-main': settings.color_text_main,
    '--color-text-muted': settings.color_text_muted,
  } as React.CSSProperties

  return (
    <html lang="pt-BR" style={dynamicStyles}>
      <body className="bg-background text-text-main antialiased">
        {children}
      </body>
    </html>
  )
}
