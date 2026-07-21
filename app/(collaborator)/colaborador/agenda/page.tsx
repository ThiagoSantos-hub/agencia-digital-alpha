'use client'

import { Suspense } from 'react'
import { AgendaView } from '@/components/agenda/AgendaView'

export default function AgendaColaboradorPage() {
  return (
    <Suspense fallback={null}>
      <AgendaView />
    </Suspense>
  )
}
