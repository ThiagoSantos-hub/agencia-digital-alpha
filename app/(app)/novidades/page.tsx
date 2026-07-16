'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Sparkles, Trash2, Plus, RefreshCw, Pencil, Check, X, ChevronDown } from 'lucide-react'

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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Estados para Cadastro/Edição
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!titulo || !descricao) return

    setSaving(true)
    
    if (editingId) {
      // Atualizar
      const { error } = await supabase
        .from('novidades')
        .update({ titulo, descricao })
        .eq('id', editingId)

      if (!error) {
        alert('Novidade atualizada com sucesso!')
        setExpandedId(null)
        setEditingId(null)
        setTitulo('')
        setDescricao('')
        fetchNovidades()
      } else {
        alert('Erro ao atualizar novidade.')
      }
    } else {
      // Inserir
      const { error } = await supabase
        .from('novidades')
        .insert([{ titulo, descricao }])

      if (!error) {
        alert('Novidade publicada com sucesso!')
        setTitulo('')
        setDescricao('')
        fetchNovidades()
      } else {
        alert('Erro ao publicar novidade.')
      }
    }
    setSaving(false)
  }

  const handleEditar = (n: Novidade) => {
    setExpandedId(null)
    setEditingId(n.id)
    setTitulo(n.titulo)
    setDescricao(n.descricao)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelarEdicao = () => {
    setEditingId(null)
    setTitulo('')
    setDescricao('')
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta novidade?')) return

    const { error } = await supabase
      .from('novidades')
      .delete()
      .eq('id', id)

    if (!error) {
      if (expandedId === id) setExpandedId(null)
      setNovidades(novidades.filter(n => n.id !== id))
    } else {
      alert('Erro ao excluir novidade.')
    }
  }

  const isOpen = (id: string) => expandedId === id

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Novidades do Sistema</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie as atualizações que aparecem para os colaboradores.</p>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className={`bg-[#1a1a1a] border rounded-xl p-5 transition-all ${editingId ? 'border-indigo-500' : 'border-[#2a2a2a]'}`}>
        <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          {editingId ? (
            <>
              <Pencil size={20} className="text-indigo-400" />
              Editar Novidade
            </>
          ) : (
            <>
              <Plus size={20} className="text-emerald-500" />
              Publicar Nova Atualização
            </>
          )}
        </h2>
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Novo módulo de relatórios disponível"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
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
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : editingId ? <Check size={18} /> : <Sparkles size={18} />}
              {saving ? 'Salvando...' : editingId ? 'Salvar Alteração' : 'Publicar Novidade'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelarEdicao}
                className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            )}
          </div>
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
            {novidades.map((n) => {
              const open = isOpen(n.id)
              return (
                <div
                  key={n.id}
                  className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all ${
                    open
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'border-[#2a2a2a] hover:border-emerald-500/30'
                  }`}
                >
                  {/* Cabeçalho clicável */}
                  <button
                    onClick={() => toggleExpand(n.id)}
                    className="w-full text-left px-6 py-5 flex items-center gap-4 transition-colors hover:bg-[#222]"
                  >
                    <Sparkles
                      size={20}
                      className={`flex-shrink-0 transition-colors ${
                        open ? 'text-emerald-400' : 'text-gray-700'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-lg truncate">{n.titulo}</h3>
                    </div>
                    <span className="text-gray-600 text-xs font-medium flex-shrink-0">
                      {new Date(n.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 flex-shrink-0 transition-transform duration-300 ${
                        open ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {/* Conteúdo expandido */}
                  {open && (
                    <div className="border-t border-[#2a2a2a] px-6 pb-6 pt-5 bg-[#1f1f1f]/50">
                      <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                        {n.descricao}
                      </p>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-3 mt-6">
                        <button
                          onClick={() => handleEditar(n)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-blue-400 hover:bg-blue-400/10 border border-blue-400/20 transition-all text-xs font-bold"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(n.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all text-xs font-bold"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
