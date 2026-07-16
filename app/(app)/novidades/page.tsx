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
        <h1 className="text-text-main text-3xl font-bold tracking-tight">Novidades do Sistema</h1>
        <p className="text-text-muted text-sm mt-1">Gerencie as atualizações que aparecem para os colaboradores.</p>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className={`bg-surface border rounded-xl p-5 transition-all ${editingId ? 'border-primary' : 'border-border'}`}>
        <h2 className="text-text-main font-semibold text-lg mb-4 flex items-center gap-2">
          {editingId ? (
            <>
              <Pencil size={20} className="text-primary" />
              Editar Novidade
            </>
          ) : (
            <>
              <Plus size={20} className="text-cta" />
              Publicar Nova Atualização
            </>
          )}
        </h2>
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Novo módulo de relatórios disponível"
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-main text-sm focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva os detalhes da novidade..."
              rows={4}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-main text-sm focus:outline-none focus:border-primary transition-all resize-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white ${editingId ? 'bg-primary hover:bg-primary-hover' : 'bg-cta hover:bg-cta-hover'}`}
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : editingId ? <Check size={18} /> : <Sparkles size={18} />}
              {saving ? 'Salvando...' : editingId ? 'Salvar Alteração' : 'Publicar Novidade'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelarEdicao}
                className="px-6 py-3 bg-hover-bg hover:bg-border text-text-muted font-bold rounded-lg transition-all flex items-center gap-2"
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
        <h2 className="text-text-muted text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-[8px]">●</span> Histórico de Novidades
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
            <p className="text-text-muted text-sm">Carregando novidades...</p>
          </div>
        ) : novidades.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow p-20 text-center">
            <Sparkles size={48} className="text-text-disabled mx-auto mb-4" />
            <h3 className="text-text-main font-medium text-lg">Nenhuma novidade cadastrada</h3>
            <p className="text-text-muted text-sm mt-1">Publique sua primeira atualização acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {novidades.map((n) => (
              <div
                key={n.id}
                className={`bg-surface border rounded-xl overflow-hidden transition-all ${
                  isOpen(n.id)
                    ? 'border-primary shadow-sm'
                    : 'border-border hover:border-active-border'
                }`}
              >
                {/* Cabeçalho clicável */}
                <button
                  onClick={() => toggleExpand(n.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-hover-bg transition-colors"
                >
                  <Sparkles
                    size={18}
                    className={`flex-shrink-0 transition-colors ${
                      isOpen(n.id) ? 'text-primary' : 'text-text-disabled'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-main font-semibold text-sm truncate">{n.titulo}</h3>
                  </div>
                  <span className="text-text-disabled text-xs flex-shrink-0">
                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${
                      isOpen(n.id) ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Conteúdo expandido */}
                {isOpen(n.id) && (
                  <div className="border-t border-border px-5 pb-4 pt-4 space-y-4">
                    <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                      {n.descricao}
                    </p>
                    
                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditar(n)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary hover:bg-active-bg border border-active-border transition-all text-xs font-bold"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExcluir(n.id)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 border border-red-200 transition-all text-xs font-bold"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
