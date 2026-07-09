'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Sparkles, Trash2, Plus, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Novidade {
  id: string
  titulo: string
  descricao: string
  created_at: string
}

export default function NovidadesAdminPage() {
  const [novidades, setNovidades] = useState<Novidade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
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

  useEffect(() => {
    fetchNovidades()
  }, [])

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !descricao) return

    setSaving(true)
    const { error } = await supabase
      .from('novidades')
      .insert([{ titulo, descricao }])

    if (!error) {
      setTitulo('')
      setDescricao('')
      fetchNovidades()
      // Toast de sucesso simulado por alerta ou estado (já que não há biblioteca de toast instalada visível)
      alert('Novidade publicada com sucesso!')
    } else {
      alert('Erro ao publicar novidade.')
    }
    setSaving(false)
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta novidade?')) return

    const { error } = await supabase
      .from('novidades')
      .delete()
      .eq('id', id)

    if (!error) {
      setNovidades(novidades.filter(n => n.id !== id))
    } else {
      alert('Erro ao excluir novidade.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Novidades do Sistema</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie as atualizações que aparecem para os colaboradores.</p>
      </div>

      {/* Formulário de Cadastro */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Plus size={20} className="text-emerald-500" />
          Publicar Nova Atualização
        </h2>
        <form onSubmit={handlePublicar} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Novo módulo de relatórios disponível"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva os detalhes da novidade..."
              rows={4}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {saving ? 'Publicando...' : 'Publicar Novidade'}
          </button>
        </form>
      </div>

      {/* Listagem */}
      <div className="space-y-4">
        <h2 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-[8px]">●</span> Histórico de Novidades
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={32} className="animate-spin text-emerald-500" />
            <p className="text-gray-500 text-sm">Carregando novidades...</p>
          </div>
        ) : novidades.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-20 text-center">
            <Sparkles size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-white font-medium text-lg">Nenhuma novidade cadastrada</h3>
            <p className="text-gray-500 text-sm mt-1">Publique sua primeira atualização acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {novidades.map((n) => (
              <div key={n.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-emerald-500/30 transition-all group shadow-lg">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-bold text-lg">{n.titulo}</h3>
                      <span className="text-gray-600 text-xs font-medium">
                        {format(new Date(n.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{n.descricao}</p>
                  </div>
                  <button
                    onClick={() => handleExcluir(n.id)}
                    className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
