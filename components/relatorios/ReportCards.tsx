'use client'

import { useRouter } from 'next/navigation'
import { BarChart2, Plus, Send, Edit2, Copy, Clock, Trash2, Facebook, Globe, Loader2 } from 'lucide-react'
import { FeatureLock } from '@/components/ui/FeatureLock'
import type { Report } from '@/hooks/useRelatorios'

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString))

const formatDateTime = (dateString: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    .format(new Date(dateString))
    .replace(',', ' às')

// Visão em cards dos relatórios, alternativa à tabela, mesmas ações, num
// grid de cartões (mesmo padrão visual já usado no painel de Alertas).
export function ReportCards({
  reports,
  loading,
  basePath,
  accentActive,
  sendingId,
  onToggleAtivo,
  onSend,
  onDuplicate,
  onHistory,
  onDelete,
}: {
  reports: Report[]
  loading: boolean
  basePath: string
  accentActive: string
  sendingId: string | null
  onToggleAtivo: (id: string, ativo: boolean) => void
  onSend: (report: Report) => void
  onDuplicate: (report: Report) => void
  onHistory: (report: Report) => void
  onDelete: (report: Report) => void
}) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface border border-border h-48 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border rounded-xl shadow-sm">
        <BarChart2 size={48} className="text-text-disabled mb-4" />
        <p className="text-text-main font-medium">Nenhum relatório encontrado</p>
        <button
          onClick={() => router.push(`${basePath}/criar`)}
          className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> Criar relatório
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {reports.map((report) => (
        <div key={report.id} className="bg-surface border border-border p-6 rounded-xl flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-lg text-text-main break-words pr-2">{report.nome}</h3>
              {report.canal === 'meta' ? (
                <Facebook size={18} className="text-primary shrink-0" />
              ) : (
                <Globe size={18} className="text-red-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-text-muted mb-1">Criado em {formatDate(report.created_at)}</p>
            <p className="text-xs text-text-muted mb-4">Criado por: {report.creator?.name || report.creator?.email || 'Desconhecido'}</p>

            <div className="space-y-1 text-sm text-text-muted">
              <p>Frequência: <span className="text-text-main capitalize">{report.frequencia}</span> <span className="text-text-disabled text-xs uppercase">({report.periodo.replace('_', ' ')})</span></p>
              <p>Próximo envio: <span className="text-text-main">{report.proximo_envio ? formatDateTime(report.proximo_envio) : '—'}</span></p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
            <FeatureLock featureKey="relatorios.envio_automatico" variant="replace">
              <button
                onClick={() => onToggleAtivo(report.id, !report.ativo)}
                className={`w-10 h-5 rounded-full relative transition-colors ${report.ativo ? accentActive : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${report.ativo ? 'right-1' : 'left-1'}`} />
              </button>
            </FeatureLock>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSend(report)}
                disabled={sendingId === report.id}
                title="Enviar agora"
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {sendingId === report.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
              <button
                onClick={() => router.push(`${basePath}/criar?id=${report.id}`)}
                title="Editar"
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
              >
                <Edit2 size={15} />
              </button>
              <FeatureLock featureKey="relatorios.duplicar" variant="replace">
                <button onClick={() => onDuplicate(report)} title="Duplicar" className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
                  <Copy size={15} />
                </button>
              </FeatureLock>
              <FeatureLock featureKey="relatorios.historico" variant="replace">
                <button onClick={() => onHistory(report)} title="Histórico" className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
                  <Clock size={15} />
                </button>
              </FeatureLock>
              <button onClick={() => onDelete(report)} title="Excluir" className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
