'use client'

import { Bell, Plus, Edit2, Copy, Trash2, CheckCircle2, Facebook, Globe, Wallet, DollarSign, AlertTriangle } from 'lucide-react'
import type { Alert } from '@/hooks/useAlertas'

const fmtData = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—')
const hojeISO = () => new Date().toISOString().split('T')[0]
const isVencido = (alert: Alert) => alert.tipo === 'fundo_cliente' && !!alert.proximo_vencimento && alert.proximo_vencimento <= hojeISO()

const PERIODICIDADE_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  anual: 'Anual',
}

// Visão em tabela dos alertas, alternativa aos cards, mesma lista e ações,
// só compacta os detalhes (que variam por tipo: saldo mínimo, erro de conta
// ou fundo de cliente) numa única coluna.
export function AlertsTable({
  alerts,
  loading,
  accentActive,
  marcandoId,
  onToggleAtivo,
  onEdit,
  onDuplicate,
  onDelete,
  onMarcarFundo,
  onCreateFirst,
}: {
  alerts: Alert[]
  loading: boolean
  accentActive: string
  marcandoId: string | null
  onToggleAtivo: (id: string, ativo: boolean) => void
  onEdit: (alert: Alert) => void
  onDuplicate: (alert: Alert) => void
  onDelete: (alert: Alert) => void
  onMarcarFundo: (alert: Alert) => void
  onCreateFirst: () => void
}) {
  const btnAction = 'p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50'

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[720px]">
        <thead>
          <tr className="border-b border-border bg-hover-bg">
            <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
            <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Nome</th>
            <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Tipo</th>
            <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Detalhes</th>
            <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td colSpan={5} className="p-4">
                  <div className="h-10 bg-hover-bg rounded-lg w-full"></div>
                </td>
              </tr>
            ))
          ) : alerts.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Bell size={48} className="text-text-disabled" />
                  <p className="text-text-main font-medium">Nenhum alerta encontrado</p>
                  <button
                    onClick={onCreateFirst}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-sm"
                  >
                    <Plus size={16} /> Criar alerta
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            alerts.map((alert) => {
              const vencido = isVencido(alert)
              return (
                <tr key={alert.id} className="hover:bg-hover-bg transition-colors">
                  <td className="p-4">
                    <button
                      onClick={() => onToggleAtivo(alert.id, !alert.ativo)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${alert.ativo ? accentActive : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${alert.ativo ? 'right-1' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-text-main">{alert.nome}</div>
                    <div className="text-xs text-text-muted">Criado por: {alert.creator?.name || alert.creator?.email || 'Desconhecido'}</div>
                  </td>
                  <td className="p-4">
                    {alert.tipo === 'saldo_minimo' ? (
                      <span className="flex items-center gap-1.5 text-amber-600 text-xs font-bold uppercase"><DollarSign size={12} /> Saldo Mínimo</span>
                    ) : alert.tipo === 'erro_conta' ? (
                      <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold uppercase"><AlertTriangle size={12} /> Erro na Conta</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-cta text-xs font-bold uppercase"><Wallet size={12} /> Fundo de Cliente</span>
                    )}
                    {alert.tipo !== 'fundo_cliente' && (
                      <span className="flex items-center gap-1 mt-1 text-text-muted text-xs">
                        {alert.canal === 'meta' ? <Facebook size={11} /> : <Globe size={11} />} {alert.canal === 'meta' ? 'Meta' : 'Google'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-text-main">
                    {alert.tipo === 'fundo_cliente' ? (
                      <div className="space-y-0.5">
                        <p>Cliente: <span className="font-medium">{alert.client?.name ?? '—'}</span></p>
                        <p>
                          <span className="text-cta font-bold">R$ {Number(alert.valor_fundo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          {' · '}{alert.forma_pagamento === 'boleto' ? 'Boleto' : alert.forma_pagamento === 'pix' ? 'Pix' : '—'}
                          {' · '}{alert.periodicidade ? PERIODICIDADE_LABELS[alert.periodicidade] : '—'} às {alert.horario_envio || '—'}
                        </p>
                        <p>Vencimento: <span className={vencido ? 'text-red-600 font-bold' : ''}>{fmtData(alert.proximo_vencimento)}</span> {vencido && <span className="ml-1 text-[10px] font-bold uppercase bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Vencido</span>}</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p>Conta: {alert.conta_anuncio}</p>
                        {alert.tipo === 'saldo_minimo' && <p>Saldo mínimo: <span className="text-amber-600 font-bold">R$ {alert.saldo_minimo}</span></p>}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {alert.tipo === 'fundo_cliente' && (
                        <button
                          onClick={() => onMarcarFundo(alert)}
                          disabled={marcandoId === alert.id}
                          title="Marcar fundo colocado"
                          className="p-2 rounded-lg border border-cta/30 bg-cta/10 text-cta hover:bg-cta/20 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      <button onClick={() => onEdit(alert)} title="Editar" className={btnAction}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => onDuplicate(alert)} title="Duplicar" className={btnAction}>
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(alert)}
                        title="Excluir"
                        className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
