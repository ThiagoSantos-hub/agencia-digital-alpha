'use client'

import { useEffect } from 'react'

export function AlphaWidget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <elevenlabs-convai agent-id="agent_0101kwhjn4ymf3warnf5k6ktfb4y"></elevenlabs-convai>
  ) as unknown as JSX.Element
}
