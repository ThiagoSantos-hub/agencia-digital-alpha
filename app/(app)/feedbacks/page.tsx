'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  MessageSquare, 
  Bug, 
  Filter, 
  Calendar, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Search,
  User,
  X,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react'

interface Feedback {
  id: string
  colaborador_id: string
  tipo: 'sugestao' | 'bug'
  titulo: string
  descricao: string
  anexo_url: string | null
  status: 'pendente' | 'em_analise' | 'resolvido'
  created_at: string
  profiles?: {
    name: string | null
    email: string
  }
}

export default function FeedbacksAdminPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  
  const supabase = createClient()

  const fetchFeedbacks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*, profiles:colaborador_id(name, email)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFeedbacks(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    const { error } = await supabase
      .from('feedbacks')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, status: newStatus as any } : f))
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, status: newStatus as any })
      }
    } else {
      alert('Erro ao atualizar status.')
    }
    setUpdatingId(null)
  }

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `feedback-anexo-${new Date().getTime()}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Erro ao baixar o arquivo.')
    }
  }

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchTipo = filterTipo === 'todos' || f.tipo === filterTipo
    const matchStatus = filterStatus === 'todos' || f.status === filterStatus
    return matchTipo && matchStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
      case 'em_analise': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      case 'resolvido': return 'text-cta bg-cta/10 border-cta/20'
      default: return 'text-text-muted bg-gray-400/10 border-gray-400/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock size={14} />
      case 'em_analise': return <AlertCircle size={14} />
      case 'resolvido': return <CheckCircle2 size={14} />
      default: return null
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-text-main text-3xl font-bold tracking-tight">Gerenciamento de Feedbacks</h1>
          <p className="text-text-muted text-sm mt-1">Acompanhe sugestões e bugs enviados pelos colaboradores.</p>
        </div>
        <button 
          onClick={fetchFeedbacks}
          className="p-2.5 bg-surface border border-border rounded-xl text-text-muted hover:text-text-main hover:border-primary/50 transition-all"
          title="Recarregar"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-surface border border-border rounded-xl shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-xl">
          <Filter size={16} className="text-cta" />
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Tipo:</span>
          <select 
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-transparent text-text-main text-sm focus:outline-none cursor-pointer"
          >
            <option value="todos" className="bg-surface text-text-main">Todos</option>
            <option value="sugestao" className="bg-surface text-text-main">Sugestão</option>
            <option value="bug" className="bg-surface text-text-main">Bug</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-xl">
          <Clock size={16} className="text-cta" />
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Status:</span>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-text-main text-sm focus:outline-none cursor-pointer"
          >
            <option value="todos" className="bg-surface text-text-main">Todos</option>
            <option value="pendente" className="bg-surface text-text-main">Pendente</option>
            <option value="em_analise" className="bg-surface text-text-main">Em Análise</option>
            <option value="resolvido" className="bg-surface text-text-main">Resolvido</option>
          </select>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw size={32} className="animate-spin text-cta" />
          <p className="text-text-muted text-sm">Carregando feedbacks...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-20 text-center">
          <MessageSquare size={48} className="text-text-disabled mx-auto mb-4" />
          <h3 className="text-text-main font-medium text-lg">Nenhum feedback encontrado</h3>
          <p className="text-text-muted text-sm mt-1">Ajuste os filtros ou aguarde novos envios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFeedbacks.map((f) => (
            <div 
              key={f.id} 
              onClick={() => setSelectedFeedback(f)}
              className="bg-surface border border-border rounded-xl p-6 hover:border-primary/30 transition-all group shadow-lg cursor-pointer"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      f.tipo === 'bug' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-cta bg-cta/10 border-cta/20'
                    }`}>
                      {f.tipo === 'bug' ? 'Bug' : 'Sugestão'}
                    </span>
                    <h3 className="text-text-main font-bold text-lg flex-1">{f.titulo}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                    <div className="flex items-center gap-2 text-text-muted text-xs">
                      <User size={14} className="text-cta" />
                      <span className="font-medium">{f.profiles?.name || f.profiles?.email || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted text-xs">
                      <Calendar size={14} className="text-cta" />
                      <span>{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {f.anexo_url && (
                      <div className="flex items-center gap-2 text-cta text-xs font-bold">
                        <ExternalLink size={14} />
                        Possui Anexo
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${getStatusColor(f.status)}`}>
                    {getStatusIcon(f.status)}
                    <span className="capitalize">{f.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes do Feedback */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedFeedback(null)} />
          <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedFeedback.tipo === 'bug' ? 'bg-red-400/10 text-red-400' : 'bg-cta/10 text-cta'}`}>
                  {selectedFeedback.tipo === 'bug' ? <Bug size={20} /> : <MessageSquare size={20} />}
                </div>
                <div>
                  <h2 className="text-text-main font-bold text-lg">{selectedFeedback.titulo}</h2>
                  <p className="text-text-muted text-xs">
                    Por {selectedFeedback.profiles?.name || selectedFeedback.profiles?.email} em {new Date(selectedFeedback.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-hover-bg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-text-muted text-[10px] font-black uppercase tracking-widest">Descrição</label>
                <p className="text-text-main text-base leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                  {selectedFeedback.descricao}
                </p>
              </div>

              {selectedFeedback.anexo_url && (
                <div className="space-y-2">
                  <label className="text-text-muted text-[10px] font-black uppercase tracking-widest">Anexo</label>
                  <div className="relative group cursor-pointer" onClick={() => setSelectedImage(selectedFeedback.anexo_url)}>
                    <img 
                      src={selectedFeedback.anexo_url} 
                      alt="Anexo" 
                      className="w-full rounded-xl border border-border hover:border-primary/50 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <Search size={32} className="text-text-main" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-text-muted text-[10px] font-black uppercase tracking-widest">Status:</span>
                <select 
                  value={selectedFeedback.status}
                  disabled={updatingId === selectedFeedback.id}
                  onChange={(e) => handleStatusChange(selectedFeedback.id, e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-text-main text-xs focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                >
                  <option value="pendente" className="bg-surface text-text-main">Pendente</option>
                  <option value="em_analise" className="bg-surface text-text-main">Em Análise</option>
                  <option value="resolvido" className="bg-surface text-text-main">Resolvido</option>
                </select>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="w-full md:w-auto px-6 py-2.5 bg-cta hover:bg-cta-hover text-text-main font-bold rounded-xl transition-all shadow-lg shadow-cta/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem (Zoom) */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedImage(null)} />
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <div className="absolute -top-12 right-0 flex items-center gap-4">
              <button 
                onClick={() => handleDownload(selectedImage)}
                className="flex items-center gap-2 px-4 py-2 bg-cta text-white rounded-xl font-bold text-sm hover:bg-cta-hover transition-all shadow-lg"
              >
                <Download size={18} />
                Baixar
              </button>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-2 text-text-muted hover:text-text-main transition-all"
              >
                <X size={32} />
              </button>
            </div>
            <img 
              src={selectedImage} 
              alt="Anexo do Feedback" 
              className="w-full h-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
