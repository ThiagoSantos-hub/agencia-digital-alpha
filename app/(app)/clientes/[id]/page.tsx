'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Client } from '@/hooks/useClientes'
import {
  ArrowLeft, Pencil, Trash2, Loader2, X,
  Building2, Mail, Phone, CalendarDays, DollarSign, CreditCard, Clock, Target, Eye, EyeOff
} from 'lucide-react'

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
  inativo:   { label: 'Inativo',   className: 'text-text-muted bg-gray-500/10 border-gray-500/30'         },
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-text-muted">{icon}</div>
      <div>
        <p className="text-xs text-text-muted mb-0.5">{label}</p>
        <p className="text-sm text-text-main">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function ModalConfirmarExclusao({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-text-main font-semibold text-base">Excluir Cliente</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors p-1 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-text-muted text-sm">
          Tem certeza que deseja excluir <span className="text-text-main font-medium">{name}</span>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-muted bg-background border border-border hover:text-text-main transition-colors">
            Cancelar
          </button>
          <button onClick={async () => { setLoading(true); await onConfirm() }} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-text-main flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Excluindo...</> : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()
      
      if (!clientData) {
        setLoading(false)
        return
      }

      let finalStatus = clientData.status
      let diasAtraso = 0

      if (clientData.status !== 'inativo') {
        const { data: finances } = await supabase
          .from('finances')
          .select('data_vencimento, status')
          .eq('client_id', id)
          .eq('tipo', 'receita')
          .in('status', ['pendente', 'atrasado'])
        
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        finances?.forEach(f => {
          const vencimento = new Date(f.data_vencimento)
          vencimento.setHours(0, 0, 0, 0)
          if (vencimento < hoje || f.status === 'atrasado') {
            finalStatus = 'atrasado'
            const diffDays = Math.ceil(Math.abs(hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays > diasAtraso) diasAtraso = diffDays
          }
        })
      }

      setClient({
        ...clientData,
        status: finalStatus,
        dias_atraso: diasAtraso
      })
      setLoading(false)
    }
    fetch()
  }, [id, supabase])

  const handleDelete = async () => {
    await supabase.from('clients').delete().eq('id', id)
    router.push('/clientes')
  }

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
        <button onClick={() => router.push('/clientes')}
          className="text-indigo-400 text-sm hover:underline">
          Voltar para Clientes
        </button>
      </div>
    )
  }

  const statusInfo = statusConfig[client.status]

  return (
    <>
      {confirmDelete && (
        <ModalConfirmarExclusao
          name={client.name}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/clientes')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-text-main text-xl font-bold flex-1">Perfil do Cliente</h1>
          <button
            onClick={() => router.push(`/clientes/${id}/editar`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-text-muted bg-surface border border-border hover:text-text-main transition-colors">
            <Pencil size={14} /> Editar
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
            <Trash2 size={14} /> Excluir
          </button>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-text-main text-lg font-semibold">{client.name}</h2>
              {client.company && <p className="text-text-muted text-sm mt-0.5">{client.company}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              {client.status === 'atrasado' && client.dias_atraso && (
                <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                  <Clock size={12} /> {client.dias_atraso} dias de atraso
                </span>
              )}
            </div>
          </div>

          <InfoRow icon={<Building2 size={15} />} label="Empresa" value={client.company} />
          <InfoRow icon={<Mail size={15} />} label="E-mail" value={client.email} />
          <InfoRow icon={<Phone size={15} />} label="Telefone" value={client.phone} />
          <InfoRow icon={<CalendarDays size={15} />} label="Data de entrada"
            value={client.start_date
              ? new Date(client.start_date + 'T00:00:00').toLocaleDateString('pt-BR')
              : null} />
          {client.status === 'inativo' && (
            <InfoRow icon={<CalendarDays size={15} />} label="Data de inativação"
              value={client.inativo_em
                ? new Date(client.inativo_em).toLocaleDateString('pt-BR')
                : null} />
          )}
          <InfoRow icon={<DollarSign size={15} />} label="Mensalidade"
            value={client.monthly_fee != null
              ? `R$ ${client.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : null} />
          <InfoRow icon={<CreditCard size={15} />} label="Dia de pagamento"
            value={client.payment_day != null ? `Dia ${client.payment_day}` : null} />
        </div>

        {/* Meta Ads Integration Info */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-text-main font-semibold text-sm flex items-center gap-2">
            <Target size={16} className="text-indigo-400" />
            Integração Meta Ads
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">ID da Conta de Anúncios</p>
              <p className="text-sm text-text-main font-mono">{client.meta_ad_account_id || 'Não configurado'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Visibilidade em Campanhas</p>
              <div className="flex items-center gap-2">
                {client.show_campaigns ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <Eye size={14} /> Visível
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <EyeOff size={14} /> Oculto
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-text-main font-medium text-sm mb-3">Campanhas Ativas</h3>
          <p className="text-text-muted text-sm">Use a aba de Campanhas para ver os dados reais do Meta Ads.</p>
        </div>
      </div>
    </>
  )
}
