'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Sparkles, RefreshCw, Calendar } from 'lucide-react'


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
      
      // Marcar como lidas se houver usuário logado
      if (user?.id) {
        const idsParaMarcar = data
          .filter(n => !n.lida_por?.includes(user.id))
          .map(n => n.id)

        if (idsParaMarcar.length > 0) {
          for (const id of idsParaMarcar) {
            const novidade = data.find(n => n.id === id)
            const novaLista = [...(novidade?.lida_por || []), user.id]
            
            await supabase
              .from('novidades')
              .update({ lida_por: novaLista })
              .eq('id', id)
          }
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNovidades()
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
                <div key={n.id} className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-6 hover:border-emerald-500/30 transition-all shadow-lg relative overflow-hidden group">
                  {!lida && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-[#0a0f0c] text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                      Nova
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${!lida ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/5 text-gray-600'}`}>
                      <Sparkles size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-bold text-lg ${!lida ? 'text-white' : 'text-gray-400'}`}>{n.titulo}</h3>
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs font-medium">
                          <Calendar size={12} />
                          {new Date(n.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!lida ? 'text-gray-300' : 'text-gray-500'}`}>
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
    </div>
  )
}
