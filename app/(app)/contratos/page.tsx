'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, Column } from '@/components/ui/Table'
import { Settings2, Download, RotateCcw, Ban, Loader2 } from 'lucide-react'

interface Contract {
  id: string
  contract_type: 'completo' | 'crm' | 'trafego'
  status: 'rascunho' | 'aguardando_assinatura' | 'assinado' | 'expirado' | 'cancelado'
  nome_completo: string
  razao_social: string | null
  email: string
  currency_snapshot: 'BRL' | 'USD'
  setup_fee_snapshot: number
  monthly_fee_snapshot: number
  extra_config_snapshot: Record<string, number>
  created_at: string
  sent_at: string | null
  signed_at: string | null
}

const statusConfig: Record<Contract['status'], { label: string; className: string }> = {
  rascunho:              { label: 'Rascunho',              className: 'text-text-muted bg-slate-100 border-slate-200' },
  aguardando_assinatura: { label: 'Aguardando assinatura', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  assinado:              { label: 'Assinado',              className: 'text-cta bg-cta/10 border-cta/30' },
  expirado:              { label: 'Expirado',               className: 'text-red-600 bg-red-50 border-red-200' },
  cancelado:             { label: 'Cancelado',              className: 'text-text-disabled bg-slate-100 border-slate-200' },
}

const typeLabel: Record<Contract['contract_type'], string> = {
  completo: 'Completo',
  crm: 'CRM',
  trafego: 'Tráfego Pago',
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchContracts = async () => {
    setLoading(true)
    const res = await fetch('/api/contracts')
    if (res.ok) setContracts(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchContracts() }, [])

  const handleView = async (id: string) => {
    setActingId(id)
    const res = await fetch(`/api/contracts/${id}`)
    const data = await res.json()
    setActingId(null)
    if (data.pdf_url) window.open(data.pdf_url, '_blank')
  }

  const handleResend = async (id: string) => {
    setActingId(id)
    await fetch(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend' }),
    })
    await fetchContracts()
    setActingId(null)
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este contrato?')) return
    setActingId(id)
    await fetch(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    await fetchContracts()
    setActingId(null)
  }

  const columns: Column<Contract>[] = [
    { key: 'nome', header: 'Cliente', render: (c) => (
      <div>
        <p className="font-semibold">{c.razao_social || c.nome_completo}</p>
        <p className="text-xs text-text-muted">{c.email}</p>
      </div>
    )},
    { key: 'contract_type', header: 'Tipo', render: (c) => typeLabel[c.contract_type] },
    { key: 'valor', header: 'Valor', render: (c) => {
      const cifrao = c.currency_snapshot === 'USD' ? 'US$' : 'R$'
      if (c.contract_type === 'trafego') {
        return <span>{cifrao} {Number(c.setup_fee_snapshot).toFixed(2)} ({Number(c.extra_config_snapshot?.prazo_dias ?? 30)} dias)</span>
      }
      return <span>{cifrao} {Number(c.monthly_fee_snapshot).toFixed(2)}/mês</span>
    }},
    { key: 'status', header: 'Status', render: (c) => (
      <span className={`inline-block px-2 py-1 rounded-lg border text-xs font-semibold ${statusConfig[c.status].className}`}>
        {statusConfig[c.status].label}
      </span>
    )},
    { key: 'created_at', header: 'Criado em', render: (c) => new Date(c.created_at).toLocaleDateString('pt-BR') },
    { key: 'actions', header: 'Ações', render: (c) => (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleView(c.id)}
          disabled={actingId === c.id}
          title="Ver/Baixar PDF"
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-hover-bg disabled:opacity-50"
        >
          {actingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        </button>
        {(c.status === 'rascunho' || c.status === 'aguardando_assinatura') && (
          <button
            onClick={() => handleResend(c.id)}
            disabled={actingId === c.id}
            title="Reenviar"
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-hover-bg disabled:opacity-50"
          >
            <RotateCcw size={15} />
          </button>
        )}
        {c.status !== 'assinado' && c.status !== 'cancelado' && (
          <button
            onClick={() => handleCancel(c.id)}
            disabled={actingId === c.id}
            title="Cancelar"
            className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Ban size={15} />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-main text-2xl font-bold">Contratos</h1>
          <p className="text-text-muted text-sm mt-1">Acompanhe os contratos gerados automaticamente pelos formulários públicos.</p>
        </div>
        <Link href="/contratos/modelos">
          <Button variant="secondary" icon={<Settings2 size={16} />}>Modelos de Contrato</Button>
        </Link>
      </div>

      <Card padding="sm" animate={false}>
        <CardHeader title="Todos os contratos" description={`${contracts.length} registro(s)`} />
        <Table columns={columns} data={contracts} keyExtractor={(c) => c.id} loading={loading} />
      </Card>
    </div>
  )
}
