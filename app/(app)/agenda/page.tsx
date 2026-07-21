'use client'

import { Suspense } from 'react'
import { AgendaView } from '@/components/agenda/AgendaView'

export default function AgendaPage() {
  return (
    <Suspense fallback={null}>
      <AgendaView />
    </Suspense>
  )
}
