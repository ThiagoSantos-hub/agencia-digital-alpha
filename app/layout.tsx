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

  // Só aceita cor hexadecimal válida — esses valores vão parar num <style>
  // renderizado como HTML bruto, então um valor fora desse formato (vindo do
  // banco) poderia escapar da tag e injetar HTML/CSS arbitrário.
  const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

  if (data) {
    data.forEach(item => {
      if (item.key in settings && HEX_COLOR.test(item.value)) {
        settings[item.key] = item.value
      }
    })
  }

  return settings
}

// Script inline, roda antes do React hidratar, pra já aplicar o tema salvo
// (ou o do sistema operacional) sem piscar a tela errada por uma fração de
// segundo. Precisa ser uma string crua (não pode depender de nenhum import).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('digital-alpha-theme');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getAgencySettings()

  // A personalização de cor por empresa só vale no modo claro — no escuro,
  // usamos a paleta escura padrão (definida em globals.css), senão a cor
  // customizada (pensada pra fundo claro) ficaria ilegível no fundo escuro.
  const brandCss = `
    html:not([data-theme="dark"]) {
      --color-primary: ${settings.color_primary};
      --color-cta: ${settings.color_cta};
      --color-background: ${settings.color_background};
      --color-sidebar: ${settings.color_sidebar};
      --color-header: ${settings.color_header};
      --color-text-main: ${settings.color_text_main};
      --color-text-muted: ${settings.color_text_muted};
    }
  `

  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCss }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-background text-text-main antialiased">
        {children}
      </body>
    </html>
  )
}
