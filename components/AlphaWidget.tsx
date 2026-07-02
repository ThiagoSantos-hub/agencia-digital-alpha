'use client'

import { useEffect } from 'react'

export function AlphaWidget() {
  useEffect(() => {
    // Cria o elemento do widget
    const widget = document.createElement('elevenlabs-convai')
    widget.setAttribute('agent-id', 'agent_0101kwhjn4ymf3warnf5k6ktfb4y')
    document.body.appendChild(widget)

    // Carrega o script
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    document.head.appendChild(script)

    return () => {
      if (document.body.contains(widget)) document.body.removeChild(widget)
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  return null
}
