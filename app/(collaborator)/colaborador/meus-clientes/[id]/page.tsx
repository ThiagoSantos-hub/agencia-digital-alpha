'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Client } from '@/hooks/useClientes'
import { AcompanhamentoCliente } from '@/components/clients/AcompanhamentoCliente'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function MeuClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('clients').select('*').eq('id', id).single()
      setClient(data ?? null)
      setLoading(false)
    }
    fetch()
  }, [id, supabase])

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
        <button onClick={() => router.push('/colaborador/meus-clientes')} className="text-primary text-sm hover:underline">
          Voltar para Meus Clientes
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/colaborador/meus-clientes')}
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
        <AcompanhamentoCliente clientId={id} clientName={client.name} />
      ) : (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-text-main text-lg font-bold mb-1">Acompanhamento do Cliente</h2>
          <p className="text-text-muted text-sm">
            Este cliente ainda não tem o ID da Conta de Anúncios configurado. Peça pro admin configurar em Editar.
          </p>
        </div>
      )}
    </div>
  )
}
