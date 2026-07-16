import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agência Digital Alpha',
  description: 'Plataforma de gestão para agências digitais',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-text-main antialiased">
        {children}
      </body>
    </html>
  )
}
