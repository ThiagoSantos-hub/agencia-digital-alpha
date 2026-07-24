'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AcompanhamentoCliente } from '@/components/clients/AcompanhamentoCliente'
import { Loader2, TrendingUp } from 'lucide-react'

interface ClienteOption {
  id: string
  name: string
  company: string | null
  meta_ad_account_id: string | null
}

export default function AcompanhamentoPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<ClienteOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('clients')
        .select('id, name, company, meta_ad_account_id')
        .neq('status', 'inativo')
        .order('name', { ascending: true })
      setClients(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const selected = clients.find((c) => c.id === selectedId)

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-text-main text-xl font-bold flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" /> Acompanhamento do Cliente
        </h1>
        <p className="text-text-muted text-sm mt-1">Escolha um cliente pra ver crescimento, métricas e diagnóstico com IA.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-text-muted" /></div>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full max-w-md bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary/50"
          >
            <option value="">Selecione um cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
            ))}
          </select>

          {selected && (
            selected.meta_ad_account_id ? (
              <AcompanhamentoCliente clientId={selected.id} clientName={selected.name} />
            ) : (
              <div className="bg-surface border border-border rounded-xl p-6">
                <p className="text-text-muted text-sm">
                  Esse cliente ainda não tem o ID da Conta de Anúncios configurado (em Clientes → Editar).
                </p>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
