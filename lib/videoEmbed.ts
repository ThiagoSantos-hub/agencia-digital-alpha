// Converte um link de YouTube/Vimeo colado pelo superadmin num src de iframe
// embutível. Retorna null se o formato não for reconhecido, pro chamador
// mostrar um aviso em vez de tentar embutir um link quebrado.
export function toEmbedUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return url
      }
      return null
    }

    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }

    if (host === 'player.vimeo.com') {
      return parsed.pathname.startsWith('/video/') ? url : null
    }

    return null
  } catch {
    return null
  }
}
