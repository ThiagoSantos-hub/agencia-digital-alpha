'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Sparkles, RefreshCw, Calendar, X } from 'lucide-react'

interface Novidade {
  id: string
  titulo: string
  descricao: string
  created_at: string
  lida_por: string[]
}

export default function NovidadesCollaboratorPage() {
  const [novidades, setNovidades] = useState<Novidade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNovidade, setSelectedNovidade] = useState<Novidade | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchNovidades = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('novidades')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setNovidades(data)
    }
    setLoading(false)
  }

  const marcarComoLida = async (novidade: Novidade) => {
    if (!user?.id) return
    if (novidade.lida_por?.includes(user.id)) return
    
    console.log('Marcando novidade como lida:', novidade.id)
    
    const novaLista = [...(novidade.lida_por || []), user.id]
    
    const { error } = await supabase
      .from('novidades')
      .update({ lida_por: novaLista })
      .eq('id', novidade.id)

    if (error) {
      console.error(`Erro ao marcar novidade ${novidade.id} como lida:`, error)
    } else {
      // Atualização otimista do estado local
      setNovidades(prev => prev.map(n => 
        n.id === novidade.id ? { ...n, lida_por: novaLista } : n
      ))
    }
  }

  const handleOpenNovidade = (n: Novidade) => {
    setSelectedNovidade(n)
    marcarComoLida(n)
  }

  useEffect(() => {
    fetchNovidades()

    // Configurar Tempo Real
    const channel = supabase
      .channel('novidades_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'novidades' },
        (payload) => {
          const novaNovidade = payload.new as Novidade
          setNovidades(prev => [novaNovidade, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Novidades</h1>
        <p className="text-gray-400 text-sm mt-1">Fique por dentro das últimas atualizações do sistema.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={32} className="animate-spin text-emerald-500" />
            <p className="text-gray-500 text-sm">Carregando novidades...</p>
          </div>
        ) : novidades.length === 0 ? (
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-3xl p-20 text-center">
            <Sparkles size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-white font-medium text-lg">Nenhuma novidade no momento</h3>
            <p className="text-gray-500 text-sm mt-1">Volte em breve para conferir as atualizações.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {novidades.map((n) => {
              const lida = n.lida_por?.includes(user?.id || '')
              return (
                <div 
                  key={n.id} 
                  onClick={() => handleOpenNovidade(n)}
                  className="bg-[#0f1a14] border border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/60 transition-all shadow-lg relative overflow-hidden group cursor-pointer"
                >
                  {!lida && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-[#0a0f0c] text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter z-10">
                      Nova
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 text-yellow-400 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Sparkles size={20} />
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${!lida ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/5 text-gray-600'}`}>
                      <Sparkles size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-base text-white">{n.titulo}</h3>
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <Calendar size={12} />
                          {new Date(n.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-300 line-clamp-2">
                        {n.descricao}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedNovidade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedNovidade(null)} />
          <div className="relative w-full max-w-2xl bg-[#0f1a14] border border-emerald-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">{selectedNovidade.titulo}</h2>
                  <p className="text-emerald-400 text-xs font-medium">
                    Publicado em {new Date(selectedNovidade.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNovidade(null)}
                className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                {selectedNovidade.descricao}
              </p>
            </div>

            <div className="px-8 py-6 border-t border-emerald-500/10 flex justify-end">
              <button
                onClick={() => setSelectedNovidade(null)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
