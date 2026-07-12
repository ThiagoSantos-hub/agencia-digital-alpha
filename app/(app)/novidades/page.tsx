'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Sparkles, Trash2, Plus, RefreshCw, Pencil, Check, X } from 'lucide-react'

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

  const handleSalvar = async (e: React.FormEvent) => {
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
      setNovidades(novidades.filter(n => n.id !== id))
    } else {
      alert('Erro ao excluir novidade.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[#1E293B] text-3xl font-bold tracking-tight">Novidades do Sistema</h1>
        <p className="text-[#64748B] text-sm mt-1">Gerencie as atualizações que aparecem para os colaboradores.</p>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className={`bg-[#1a1a1a] border rounded-2xl p-6 shadow-xl transition-all ${editingId ? 'border-blue-500/50' : 'border-[#2a2a2a]'}`}>
        <h2 className="text-[#1E293B] font-semibold text-lg mb-4 flex items-center gap-2">
          {editingId ? (
            <>
              <Pencil size={20} className="text-blue-500" />
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
              className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] rounded-xl px-4 py-3 text-[#1E293B] text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
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
              className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] rounded-xl px-4 py-3 text-[#1E293B] text-sm focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700 text-[#1E293B]' : 'bg-emerald-600 hover:bg-emerald-700 text-[#1E293B]'}`}
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
            <p className="text-[#64748B] text-sm">Carregando novidades...</p>
          </div>
        ) : novidades.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-3xl p-20 text-center">
            <Sparkles size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-[#1E293B] font-medium text-lg">Nenhuma novidade cadastrada</h3>
            <p className="text-[#64748B] text-sm mt-1">Publique sua primeira atualização acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {novidades.map((n) => (
              <div key={n.id} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 hover:border-emerald-500/30 transition-all group shadow-lg">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-[#1E293B] font-semibold text-lg">{n.titulo}</h3>
                      <span className="text-gray-600 text-xs font-medium">
                        {new Date(n.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[#64748B] text-sm leading-relaxed whitespace-pre-wrap">{n.descricao}</p>
                  </div>
                  
                  {/* Botões de Ação no Lado Esquerdo */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditar(n)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 border border-blue-400/20 transition-all text-xs font-bold"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(n.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all text-xs font-bold"
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
