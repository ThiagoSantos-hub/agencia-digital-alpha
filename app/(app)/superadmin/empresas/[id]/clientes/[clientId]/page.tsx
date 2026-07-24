'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AcompanhamentoCliente } from '@/components/clients/AcompanhamentoCliente'
import { ArrowLeft, Loader2 } from 'lucide-react'

interface ClienteResumo {
  id: string
  name: string
  company: string | null
  meta_ad_account_id: string | null
}

export default function EmpresaClienteDetalhePage() {
  const { id, clientId } = useParams<{ id: string; clientId: string }>()
  const router = useRouter()
  const [client, setClient] = useState<ClienteResumo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/superadmin/clients/${clientId}`)
      .then((res) => res.json())
      .then((data) => setClient(data?.id ? data : null))
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-text-muted text-sm">Cliente não encontrado.</p>
        <button onClick={() => router.push(`/superadmin/empresas/${id}/clientes`)} className="text-primary text-sm hover:underline">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/superadmin/empresas/${id}/clientes`)}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-text-main text-xl font-bold">{client.name}</h1>
          {client.company && <p className="text-text-muted text-sm">{client.company}</p>}
        </div>
      </div>

      {client.meta_ad_account_id ? (
        <AcompanhamentoCliente clientId={clientId} clientName={client.name} />
      ) : (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-text-main text-lg font-bold mb-1">Acompanhamento do Cliente</h2>
          <p className="text-text-muted text-sm">Este cliente ainda não tem o ID da Conta de Anúncios configurado.</p>
        </div>
      )}
    </div>
  )
}
