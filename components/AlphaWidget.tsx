'use client'

import { useEffect } from 'react'

export function AlphaWidget() {
  useEffect(() => {
    // Cria o elemento PRIMEIRO
    const widget = document.createElement('elevenlabs-convai')
    widget.setAttribute('agent-id', 'agent_0101kwhjn4ymf3warnf5k6ktfb4y')
    document.body.appendChild(widget)

    // Só depois carrega o script
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = false  // <- mudança aqui, garante ordem de execução
    script.type = 'text/javascript'
    document.body.appendChild(script) // <- no body, não no head

    return () => {
      if (document.body.contains(widget)) document.body.removeChild(widget)
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [])

  return null
}
