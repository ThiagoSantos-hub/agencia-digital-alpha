'use client'

import { useEffect } from 'react'

export function AlphaWidget() {
  useEffect(() => {
    const AGENT_ID = 'agent_0101kwhjn4ymf3warnf5k6ktfb4y'

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    
    script.onload = () => {
      const widget = document.createElement('elevenlabs-convai')
      widget.setAttribute('agent-id', AGENT_ID)
      document.body.appendChild(widget)
    }

    document.head.appendChild(script)

    return () => {
      const widget = document.querySelector('elevenlabs-convai')
      if (widget) widget.remove()
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  return null
}
