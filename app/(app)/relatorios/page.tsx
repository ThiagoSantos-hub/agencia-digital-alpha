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
  Loader2
} from 'lucide-react'
import { useRelatorios, Report, ReportHistory } from '@/hooks/useRelatorios'

export default function RelatoriosPage() {
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

  const handleSendNow = async (report: Report) => {
    setSendingId(report.id)
    setActionMenuId(null)
    try {
      const response = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id })
      })
      const data = await response.json()
      if (response.ok) {
        alert(`✅ Relatório "${report.nome}" enviado com sucesso!`)
      } else {
        alert(`❌ Erro ao enviar: ${data.error || 'Erro desconhecido'}`)
      }
    } catch (error: any) {
      alert(`❌ Erro ao enviar: ${error.message}`)
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="text-[#6366f1]" />
            Relatórios
          </h1>
          <p className="text-gray-400 text-sm">Gerencie seus relatórios automáticos de anúncios</p>
        </div>
        <button 
          onClick={() => router.push('/relatorios/criar')}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
        >
          <Plus size={18} />
          Criar Relatório
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] p-6 rounded-2xl">
          <p className="text-gray-400 text-sm mb-1">Relatórios Ativos</p>
          <p className="text-3xl font-bold text-[#6366f1]">{stats.ativos}</p>
        </div>
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] p-6 rounded-2xl">
          <p className="text-gray-400 text-sm mb-1">Total de Relatórios</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] p-6 rounded-2xl">
          <p className="text-gray-400 text-sm mb-1">Próximo Envio</p>
          <p className="text-3xl font-bold text-[#10b981]">{stats.proximoEnvio}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 bg-[#0a0a0f] border border-[#1a1a2e] px-3 py-2 rounded-lg">
          <Filter size={16} className="text-gray-400" />
          <select 
            className="bg-transparent outline-none text-sm text-gray-300"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-[#0a0a0f] border border-[#1a1a2e] px-3 py-2 rounded-lg">
          <Globe size={16} className="text-gray-400" />
          <select 
            className="bg-transparent outline-none text-sm text-gray-300"
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
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1a1a2e] bg-[#0d0d14]">
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Canal</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Frequência</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximo Envio</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a2e]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="p-4">
                    <div className="h-10 bg-[#1a1a2e] rounded-lg w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <BarChart2 size={48} className="text-gray-600" />
                    <div>
                      <p className="text-gray-300 font-medium">Nenhum relatório criado ainda</p>
                      <p className="text-gray-500 text-sm">Comece criando seu primeiro relatório automático.</p>
                    </div>
                    <button 
                      onClick={() => router.push('/relatorios/criar')}
                      className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                    >
                      <Plus size={16} />
                      Criar primeiro relatório
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-[#0d0d14] transition-colors group">
                  <td className="p-4">
                    <button 
                      onClick={() => toggleAtivo(report.id, !report.ativo)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${report.ativo ? 'bg-[#6366f1]' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${report.ativo ? 'right-1' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-200">{report.nome}</div>
                    <div className="text-xs text-gray-500">Criado em {formatDate(report.created_at)}</div>
                  </td>
                  <td className="p-4">
                    {report.canal === 'meta' ? (
                      <span className="flex items-center gap-1.5 text-blue-400 text-sm">
                        <Facebook size={14} /> Meta
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-sm">
                        <Globe size={14} /> Google
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-300 capitalize">{report.frequencia}</span>
                    <div className="text-[10px] text-gray-500 uppercase">{report.periodo.replace('_', ' ')}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-300">
                      {report.proximo_envio ? formatDateTime(report.proximo_envio) : '--'}
                    </div>
                  </td>
                  <td className="p-4 text-right relative">
                    <button 
                      onClick={() => setActionMenuId(actionMenuId === report.id ? null : report.id)}
                      className="p-2 hover:bg-[#1a1a2e] rounded-lg text-gray-400 transition-colors"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {actionMenuId === report.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActionMenuId(null)} 
                        />
                        <div className="absolute right-4 top-12 w-48 bg-[#0d0d14] border border-[#1a1a2e] rounded-xl shadow-2xl z-20 overflow-hidden">
                          <button 
                            onClick={() => handleSendNow(report)}
                            disabled={sendingId === report.id}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sendingId === report.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Send size={14} />
                            )}
                            Enviar agora
                          </button>
                          <button 
                            onClick={() => router.push(`/relatorios/criar?id=${report.id}`)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a2e] transition-colors"
                          >
                            <Edit2 size={14} /> Editar
                          </button>
                          <button 
                            onClick={() => handleDuplicate(report)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a2e] transition-colors"
                          >
                            <Copy size={14} /> Duplicar
                          </button>
                          <button 
                            onClick={() => handleOpenHistory(report)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a2e] transition-colors"
                          >
                            <Clock size={14} /> Histórico
                          </button>
                          <button 
                            onClick={() => handleDelete(report.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setHistoryReport(null)}
          />
          <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-[#050508] border-l border-[#1a1a2e] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[#1a1a2e] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Histórico de Envios</h2>
                <p className="text-xs text-gray-400">{historyReport.nome}</p>
              </div>
              <button 
                onClick={() => setHistoryReport(null)}
                className="p-2 hover:bg-[#1a1a2e] rounded-lg text-gray-400"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-[#6366f1]" size={32} />
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                historyData.map((item) => (
                  <div key={item.id} className="relative pl-6 border-l border-[#1a1a2e]">
                    <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${item.status === 'enviado' ? 'bg-[#10b981]' : 'bg-red-500'}`} />
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase ${item.status === 'enviado' ? 'text-[#10b981]' : 'text-red-500'}`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {formatHistoryDate(item.created_at)}
                      </span>
                    </div>
                    {item.erro_detalhe && (
                      <p className="text-xs text-red-400/80 mt-1 bg-red-400/5 p-2 rounded border border-red-400/10">
                        {item.erro_detalhe}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-gray-400 bg-[#0d0d14] p-3 rounded-lg border border-[#1a1a2e] whitespace-pre-wrap font-mono">
                      {item.mensagem_enviada}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
