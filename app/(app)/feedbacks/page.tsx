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
  X
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
      alert('Status atualizado com sucesso!')
    } else {
      alert('Erro ao atualizar status.')
    }
    setUpdatingId(null)
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
      case 'resolvido': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
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
          <h1 className="text-white text-3xl font-bold tracking-tight">Gerenciamento de Feedbacks</h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe sugestões e bugs enviados pelos colaboradores.</p>
        </div>
        <button 
          onClick={fetchFeedbacks}
          className="p-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-gray-400 hover:text-white hover:border-emerald-500/50 transition-all"
          title="Recarregar"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
          <Filter size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo:</span>
          <select 
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos</option>
            <option value="sugestao">Sugestão</option>
            <option value="bug">Bug</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
          <Clock size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status:</span>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em Análise</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw size={32} className="animate-spin text-emerald-500" />
          <p className="text-gray-500 text-sm">Carregando feedbacks...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-20 text-center">
          <MessageSquare size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-medium text-lg">Nenhum feedback encontrado</h3>
          <p className="text-gray-500 text-sm mt-1">Ajuste os filtros ou aguarde novos envios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFeedbacks.map((f) => (
            <div key={f.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-emerald-500/30 transition-all group shadow-lg">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      f.tipo === 'bug' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    }`}>
                      {f.tipo === 'bug' ? 'Bug' : 'Sugestão'}
                    </span>
                    <h3 className="text-white font-bold text-lg">{f.titulo}</h3>
                  </div>

                  <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{f.descricao}</p>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-2">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <User size={14} className="text-emerald-500" />
                      <span className="font-medium">{f.profiles?.name || f.profiles?.email || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Calendar size={14} className="text-emerald-500" />
                      <span>{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {f.anexo_url && (
                      <button 
                        onClick={() => setSelectedImage(f.anexo_url)}
                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors"
                      >
                        <ExternalLink size={14} />
                        Ver Anexo
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end gap-4 min-w-[160px]">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${getStatusColor(f.status)}`}>
                    {getStatusIcon(f.status)}
                    <span className="capitalize">{f.status.replace('_', ' ')}</span>
                  </div>

                  <div className="w-full">
                    <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Alterar Status</label>
                    <select 
                      value={f.status}
                      disabled={updatingId === f.id}
                      onChange={(e) => handleStatusChange(f.id, e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_analise">Em Análise</option>
                      <option value="resolvido">Resolvido</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Imagem */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)} />
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-all"
            >
              <X size={32} />
            </button>
            <img 
              src={selectedImage} 
              alt="Anexo do Feedback" 
              className="w-full h-full object-contain rounded-2xl shadow-2xl border border-emerald-500/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
