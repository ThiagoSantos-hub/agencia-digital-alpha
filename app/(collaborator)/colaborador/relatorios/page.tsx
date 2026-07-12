'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  BarChart2, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Send, 
  Edit2, 
  Copy, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Facebook,
  Globe,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react'
import { useRelatorios, Report, ReportHistory } from '@/hooks/useRelatorios'

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

  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [filterCanal, setFilterCanal] = useState<'todos' | 'meta' | 'google'>('todos')
  const [historyReport, setHistoryReport] = useState<Report | null>(null)
  const [historyData, setHistoryData] = useState<ReportHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Formatação de data nativa
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

  // Filtragem dos relatórios
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchStatus = filterStatus === 'todos' || (filterStatus === 'ativo' ? report.ativo : !report.ativo)
      const matchCanal = filterCanal === 'todos' || report.canal === filterCanal
      return matchStatus && matchCanal
    })
  }, [reports, filterStatus, filterCanal])

  // Estatísticas
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

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este relatório?')) {
      await deleteRelatorio(id)
    }
  }

  const handleSendNow = async (reportId: string) => {
    setSendingId(reportId)
    setActionMenuId(null)
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

  return (
    <div className="min-h-full bg-[#F8FAFC] text-[#1E293B]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-[#1E293B]">
            <BarChart2 className="text-[#1A56DB]" />
            Relatórios
          </h1>
          <p className="text-[#64748B] text-sm">Gerencie seus relatórios automáticos de anúncios</p>
        </div>
        <button 
          onClick={() => router.push('/colaborador/relatorios/criar')}
          className="bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
        >
          <Plus size={18} />
          Criar Relatório
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[#64748B] text-sm mb-1">Relatórios Ativos</p>
          <p className="text-3xl font-semibold text-[#1A56DB]">{stats.ativos}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[#64748B] text-sm mb-1">Total de Relatórios</p>
          <p className="text-3xl font-semibold text-[#1E293B]">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[#64748B] text-sm mb-1">Próximo Envio</p>
          <p className="text-3xl font-semibold text-[#16A34A]">{stats.proximoEnvio}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg shadow-sm">
          <Filter size={16} className="text-[#64748B]" />
          <select 
            className="bg-transparent outline-none text-sm text-[#1E293B] font-medium"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg shadow-sm">
          <Globe size={16} className="text-[#64748B]" />
          <select 
            className="bg-transparent outline-none text-sm text-[#1E293B] font-medium"
            value={filterCanal}
            onChange={(e) => setFilterCanal(e.target.value as any)}
          >
            <option value="todos">Todos os Canais</option>
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Nome</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Canal</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Frequência</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Próximo Envio</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="p-4">
                    <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <BarChart2 size={48} className="text-gray-200" />
                    <div>
                      <p className="text-[#1E293B] font-medium">Nenhum relatório criado ainda</p>
                      <p className="text-[#64748B] text-sm">Comece criando seu primeiro relatório automático.</p>
                    </div>
                    <button 
                      onClick={() => router.push('/colaborador/relatorios/criar')}
                      className="bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-sm"
                    >
                      <Plus size={16} />
                      Criar primeiro relatório
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-[#F8FAFC] transition-colors group">
                  <td className="p-4">
                    <button 
                      onClick={() => toggleAtivo(report.id, !report.ativo)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${report.ativo ? 'bg-[#1A56DB]' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${report.ativo ? 'right-1' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-[#1E293B]">{report.nome}</div>
                    <div className="text-xs text-[#64748B]">Criado em {formatDate(report.created_at)}</div>
                  </td>
                  <td className="p-4">
                    {report.canal === 'meta' ? (
                      <span className="flex items-center gap-1.5 text-blue-600 text-sm font-medium">
                        <Facebook size={14} /> Meta
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                        <Globe size={14} /> Google
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-[#1E293B] font-medium capitalize">{report.frequencia}</span>
                    <div className="text-[10px] text-[#64748B] font-semibold uppercase">{report.periodo.replace('_', ' ')}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-[#1E293B] font-medium">
                      {report.proximo_envio ? formatDateTime(report.proximo_envio) : '--'}
                    </div>
                  </td>
                  <td className="p-4 text-right relative">
                    <button 
                      onClick={() => setActionMenuId(actionMenuId === report.id ? null : report.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-[#64748B] transition-colors"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {actionMenuId === report.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActionMenuId(null)} 
                        />
                        <div className="absolute right-4 bottom-12 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-20 overflow-hidden">
                          <button
                            onClick={() => handleSendNow(report.id)}
                            disabled={sendingId === report.id}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {sendingId === report.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Send size={14} />
                            )}
                            Enviar agora
                          </button>
                          <button 
                            onClick={() => router.push(`/colaborador/relatorios/criar?id=${report.id}`)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors font-medium"
                          >
                            <Edit2 size={14} /> Editar
                          </button>
                          <button 
                            onClick={() => handleDuplicate(report)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors font-medium"
                          >
                            <Copy size={14} /> Duplicar
                          </button>
                          <button 
                            onClick={() => handleOpenHistory(report)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors font-medium"
                          >
                            <Clock size={14} /> Histórico
                          </button>
                          <button 
                            onClick={() => handleDelete(report.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* History Drawer */}
      {historyReport && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setHistoryReport(null)}
          />
          <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l border-[#E2E8F0] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Histórico de Envios</h2>
                <p className="text-sm text-[#64748B]">{historyReport.nome}</p>
              </div>
              <button 
                onClick={() => setHistoryReport(null)}
                className="p-2 hover:bg-gray-200 rounded-lg text-[#64748B] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-[#1A56DB]" size={32} />
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="text-gray-100 mx-auto mb-4" />
                  <p className="text-[#64748B]">Nenhum envio registrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyData.map((item) => (
                    <div key={item.id} className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                          item.status === 'enviado' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-xs text-[#64748B] font-medium">
                          {formatHistoryDate(item.enviado_em)}
                        </span>
                      </div>
                      <p className="text-sm text-[#1E293B] font-medium">
                        {item.status === 'enviado' ? 'Enviado com sucesso' : 'Falha no envio'}
                      </p>
                      {item.erro_detalhe && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{item.erro_detalhe}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
