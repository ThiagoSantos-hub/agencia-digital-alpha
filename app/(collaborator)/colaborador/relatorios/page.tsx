'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  BarChart2, 
  Filter, 
  Send, 
  Edit2, 
  Copy, 
  Clock, 
  Trash2, 
  Globe,
  ChevronRight,
  Loader2,
  Facebook,
  Search
} from 'lucide-react'
import { useRelatorios, Report, ReportHistory } from '@/hooks/useRelatorios'
import { useWhatsApp } from '@/hooks/useWhatsApp'

export default function ColaboradorRelatoriosPage() {
  const router = useRouter()
  const {
    reports,
    loading,
    toggleAtivo,
    deleteRelatorio,
    createRelatorio,
    fetchHistorico
  } = useRelatorios()
  const { groups: ownGroups } = useWhatsApp('own')
  const { groups: agencyGroups } = useWhatsApp('agency')

  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [filterCanal, setFilterCanal] = useState<'todos' | 'meta' | 'google'>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [historyReport, setHistoryReport] = useState<Report | null>(null)
  const [historyData, setHistoryData] = useState<ReportHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [confirmSendReport, setConfirmSendReport] = useState<Report | null>(null)
  const [previewMensagem, setPreviewMensagem] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<Report | null>(null)
  const [deletingReport, setDeletingReport] = useState(false)

  const destinatarioLabel = (report: Report) => {
    if (report.recebedor_tipo !== 'grupo') return report.recebedor_numero
    const pool = report.enviar_via_agencia ? agencyGroups : ownGroups
    return pool.find(g => g.group_id === report.recebedor_numero)?.name ?? report.recebedor_numero
  }

  const handleOpenConfirm = async (report: Report) => {
    setConfirmSendReport(report)
    setPreviewMensagem(null)
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id, preview: true })
      })
      const data = await res.json()
      setPreviewMensagem(res.ok ? data.mensagem : 'Não foi possível gerar a pré-visualização.')
    } catch {
      setPreviewMensagem('Não foi possível gerar a pré-visualização.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString)).replace(',', ' às')
  }

  const formatHistoryDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString)).replace(',', ' às')
  }

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return reports.filter(report => {
      const matchStatus = filterStatus === 'todos' || (filterStatus === 'ativo' ? report.ativo : !report.ativo)
      const matchCanal = filterCanal === 'todos' || report.canal === filterCanal
      const matchSearch = !query || report.nome.toLowerCase().includes(query)
      return matchStatus && matchCanal && matchSearch
    })
  }, [reports, filterStatus, filterCanal, searchQuery])

  const stats = useMemo(() => {
    const ativos = reports.filter(r => r.ativo).length
    const total = reports.length
    const proximos = reports
      .filter(r => r.ativo && r.proximo_envio)
      .map(r => new Date(r.proximo_envio!))
      .sort((a, b) => a.getTime() - b.getTime())
    
    const proximoEnvio = proximos.length > 0 
      ? formatDateTime(proximos[0].toISOString())
      : '--'

    return { ativos, total, proximoEnvio }
  }, [reports])

  const handleOpenHistory = async (report: Report) => {
    setHistoryReport(report)
    setLoadingHistory(true)
    try {
      const data = await fetchHistorico(report.id)
      setHistoryData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDuplicate = async (report: Report) => {
    const { id, user_id, created_at, updated_at, ...rest } = report
    try {
      await createRelatorio({
        ...rest,
        nome: `${rest.nome} (Cópia)`
      })
    } catch (error) {
      console.error(error)
    }
  }

  const confirmDeleteReport = async () => {
    if (!deleteConfirmReport) return
    setDeletingReport(true)
    await deleteRelatorio(deleteConfirmReport.id)
    setDeletingReport(false)
    setDeleteConfirmReport(null)
  }

  const handleSendNow = async (reportId: string) => {
    setConfirmSendReport(null)
    setSendingId(reportId)
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao enviar relatório.')
      } else {
        alert('Relatório enviado com sucesso!')
      }
    } catch {
      alert('Erro ao enviar relatório.')
    } finally {
      setSendingId(null)
    }
  }

  const btnAction = 'p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50'

  return (
    <div className="min-h-full text-text-main">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-text-main">
            <BarChart2 className="text-primary" />
            Relatórios
          </h1>
          <p className="text-text-muted text-sm">Gerencie seus relatórios automáticos de anúncios</p>
        </div>
        <button 
          onClick={() => router.push('/colaborador/relatorios/criar')}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
        >
          <Plus size={18} />
          Criar Relatório
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
          <p className="text-text-muted text-sm mb-1">Relatórios Ativos</p>
          <p className="text-3xl font-bold text-cta">{stats.ativos}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
          <p className="text-text-muted text-sm mb-1">Total de Relatórios</p>
          <p className="text-3xl font-bold text-text-main">{stats.total}</p>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
          <p className="text-text-muted text-sm mb-1">Próximo Envio</p>
          <p className="text-3xl font-bold text-primary">{stats.proximoEnvio}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-2 rounded-xl flex-1 min-w-[220px]">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar relatório pelo nome..."
            className="bg-transparent outline-none text-sm text-text-main placeholder:text-text-disabled w-full"
          />
        </div>
        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-2 rounded-xl">
          <Filter size={16} className="text-text-muted" />
          <select 
            className="bg-transparent outline-none text-sm text-text-main"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-2 rounded-xl">
          <Globe size={16} className="text-text-muted" />
          <select 
            className="bg-transparent outline-none text-sm text-text-main"
            value={filterCanal}
            onChange={(e) => setFilterCanal(e.target.value as any)}
          >
            <option value="todos">Todos os Canais</option>
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
          </select>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-hover-bg">
              <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Nome</th>
              <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Canal</th>
              <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Frequência</th>
              <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Próximo Envio</th>
              <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="p-4">
                    <div className="h-10 bg-hover-bg rounded-lg w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <BarChart2 size={48} className="text-text-disabled" />
                    <div>
                      <p className="text-text-main font-medium">Nenhum relatório criado ainda</p>
                      <p className="text-text-muted text-sm">Comece criando seu primeiro relatório automático.</p>
                    </div>
                    <button 
                      onClick={() => router.push('/colaborador/relatorios/criar')}
                      className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm"
                    >
                      <Plus size={16} />
                      Criar primeiro relatório
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-hover-bg transition-colors group">
                  <td className="p-4">
                    <button 
                      onClick={() => toggleAtivo(report.id, !report.ativo)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${report.ativo ? 'bg-cta' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${report.ativo ? 'right-1' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-text-main">{report.nome}</div>
                    <div className="text-xs text-text-muted">Criado em {formatDate(report.created_at)}</div>
                  </td>
                  <td className="p-4">
                    {report.canal === 'meta' ? (
                      <span className="flex items-center gap-1.5 text-primary text-sm">
                        <Facebook size={14} /> Meta
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-500 text-sm">
                        <Globe size={14} /> Google
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-text-main capitalize">{report.frequencia}</span>
                    <div className="text-[10px] text-text-muted uppercase">{report.periodo.replace('_', ' ')}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-text-main">
                      {report.proximo_envio ? formatDateTime(report.proximo_envio) : '--'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenConfirm(report)}
                        disabled={sendingId === report.id}
                        title="Enviar agora"
                        className={btnAction}
                      >
                        {sendingId === report.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      </button>
                      <button
                        onClick={() => router.push(`/colaborador/relatorios/criar?id=${report.id}`)}
                        title="Editar"
                        className={btnAction}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(report)}
                        title="Duplicar"
                        className={btnAction}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenHistory(report)}
                        title="Histórico"
                        className={btnAction}
                      >
                        <Clock size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmReport(report)}
                        title="Excluir"
                        className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {historyReport && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setHistoryReport(null)}
          />
          <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-surface border-l border-border z-50 shadow-2xl flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-text-main">Histórico de Envios</h2>
                <p className="text-xs text-text-muted">{historyReport.nome}</p>
              </div>
              <button 
                onClick={() => setHistoryReport(null)}
                className="p-2 hover:bg-hover-bg rounded-lg text-text-muted"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                historyData.map((item) => (
                  <div key={item.id} className="relative pl-6 border-l border-border">
                    <div className={`absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full ${
                      item.status === 'enviado' ? 'bg-cta' : 'bg-red-500'
                    }`} />
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-text-main">
                        {item.status === 'enviado' ? 'Enviado com sucesso' : 'Falha no envio'}
                      </span>
                      <span className="text-[10px] text-text-muted">{formatHistoryDate(item.enviado_em)}</span>
                    </div>
                    {item.status === 'erro' && item.erro_detalhe && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-2">
                        {item.erro_detalhe}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {confirmSendReport && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setConfirmSendReport(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-text-main mb-1">Enviar relatório agora?</h2>
              <p className="text-sm text-text-muted mb-4">Confirme o que será enviado antes de disparar.</p>
              <div className="bg-hover-bg border border-border rounded-lg p-3 text-sm space-y-1 mb-3">
                <p><span className="text-text-muted">Relatório:</span> <span className="font-medium text-text-main">{confirmSendReport.nome}</span></p>
                <p><span className="text-text-muted">Canal:</span> <span className="font-medium text-text-main">{confirmSendReport.canal === 'meta' ? 'Meta Ads' : 'Google Ads'}</span></p>
                <p><span className="text-text-muted">Enviar para:</span> <span className="font-medium text-text-main">{confirmSendReport.recebedor_tipo === 'grupo' ? 'Grupo' : 'Contato privado'} — {destinatarioLabel(confirmSendReport)}</span></p>
              </div>
              <div className="mb-5">
                <p className="text-xs text-text-muted mb-1">Mensagem que será enviada:</p>
                <div className="bg-hover-bg border border-border rounded-lg p-3 text-xs text-text-main whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                  {loadingPreview ? (
                    <span className="flex items-center gap-2 text-text-muted"><Loader2 size={14} className="animate-spin" /> Gerando pré-visualização...</span>
                  ) : previewMensagem}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSendReport(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium"
                >
                  Não
                </button>
                <button
                  onClick={() => handleSendNow(confirmSendReport.id)}
                  disabled={loadingPreview}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Sim, enviar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteConfirmReport && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setDeleteConfirmReport(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-text-main mb-1">Excluir relatório?</h2>
              <p className="text-sm text-text-muted mb-5">
                Isso vai apagar "<span className="font-medium text-text-main">{deleteConfirmReport.nome}</span>" pra sempre, incluindo a configuração de envio. Não dá pra desfazer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmReport(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium"
                >
                  Não
                </button>
                <button
                  onClick={confirmDeleteReport}
                  disabled={deletingReport}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {deletingReport ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
