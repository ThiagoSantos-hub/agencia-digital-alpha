'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Sparkles, 
  Trash2, 
  Pencil, 
  RefreshCw, 
  Check, 
  X, 
  ChevronDown 
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface Novidade {
  id: string
  titulo: string
  descricao: string
  created_at: string
}

export default function NovidadesPage() {
  const [novidades, setNovidades] = useState<Novidade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form states
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchNovidades = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('novidades')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setNovidades(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNovidades()
  }, [fetchNovidades])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !descricao) return

    setSaving(true)
    const supabase = createClient()

    if (editingId) {
      const { error } = await supabase
        .from('novidades')
        .update({ titulo, descricao })
        .eq('id', editingId)
      
      if (!error) {
        setEditingId(null)
        setTitulo('')
        setDescricao('')
        fetchNovidades()
      }
    } else {
      const { error } = await supabase
        .from('novidades')
        .insert([{ titulo, descricao }])

      if (!error) {
        setTitulo('')
        setDescricao('')
        fetchNovidades()
      } else {
        alert(`Erro ao publicar novidade: ${error.message}`)
      }
    }
    setSaving(false)
  }

  const handleEditar = (n: Novidade) => {
    setEditingId(n.id)
    setTitulo(n.titulo)
    setDescricao(n.descricao)
    setExpandedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta novidade?')) return
    
    const supabase = createClient()
    const { error } = await supabase.from('novidades').delete().eq('id', id)
    
    if (!error) {
      if (expandedId === id) setExpandedId(null)
      fetchNovidades()
    }
  }

  const handleCancelarEdicao = () => {
    setEditingId(null)
    setTitulo('')
    setDescricao('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-text-main tracking-tight">Novidades do Sistema</h1>
        <p className="text-text-muted text-sm font-medium">Gerencie as atualizações e comunicados para os usuários.</p>
      </div>

      {/* Formulário de Criação/Edição */}
      <Card className={editingId ? 'border-primary/30 bg-active-bg/30' : ''}>
        <form onSubmit={handlePublicar} className="space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingId ? 'bg-primary/10 text-primary' : 'bg-cta/10 text-cta'}`}>
              {editingId ? <Pencil size={16} /> : <Sparkles size={16} />}
            </div>
            <h2 className="text-text-main font-bold text-sm uppercase tracking-widest">
              {editingId ? 'Editar Novidade' : 'Nova Atualização'}
            </h2>
          </div>

          <Input
            label="Título da Novidade"
            placeholder="Ex: Novo módulo de relatórios disponível"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-text-main">Descrição Detalhada</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva as mudanças ou o comunicado..."
              required
              className="w-full min-h-[120px] p-4 bg-surface border border-border rounded-lg text-text-main placeholder-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              variant={editingId ? 'primary' : 'cta'}
              loading={saving}
              icon={editingId ? <Check size={18} /> : <Sparkles size={18} />}
            >
              {editingId ? 'Salvar Alterações' : 'Publicar Novidade'}
            </Button>
            
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelarEdicao}
                icon={<X size={18} />}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Listagem com Accordion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-text-disabled text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Histórico de Novidades
          </h2>
          <span className="text-text-disabled text-[10px] font-bold">{novidades.length} publicações</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={32} className="animate-spin text-primary opacity-20" />
            <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Sincronizando...</p>
          </div>
        ) : novidades.length === 0 ? (
          <Card className="py-20 text-center border-dashed">
            <Sparkles size={48} className="text-text-disabled mx-auto mb-4 opacity-20" />
            <h3 className="text-text-main font-bold text-lg">Nenhuma novidade ainda</h3>
            <p className="text-text-muted text-sm font-medium">As atualizações que você publicar aparecerão aqui.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {novidades.map((n) => {
              const open = expandedId === n.id
              return (
                <div
                  key={n.id}
                  className={`group bg-surface border transition-all duration-200 rounded-xl overflow-hidden ${
                    open
                      ? 'border-primary shadow-md ring-1 ring-primary/10'
                      : 'border-border hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  {/* Cabeçalho do Accordion */}
                  <button
                    onClick={() => toggleExpand(n.id)}
                    className={`w-full text-left px-6 py-5 flex items-center gap-4 transition-colors ${
                      open ? 'bg-active-bg/30' : 'hover:bg-hover-bg/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      open ? 'bg-primary text-white' : 'bg-hover-bg text-text-muted group-hover:text-primary'
                    }`}>
                      <Sparkles size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base truncate transition-colors ${
                        open ? 'text-text-main' : 'text-text-main'
                      }`}>
                        {n.titulo}
                      </h3>
                      <p className="text-text-disabled text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        Publicado em {new Date(n.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <ChevronDown
                      size={20}
                      className={`text-text-disabled transition-transform duration-300 ${
                        open ? 'rotate-180 text-primary' : 'group-hover:text-text-muted'
                      }`}
                    />
                  </button>

                  {/* Conteúdo do Accordion */}
                  {open && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="pl-14">
                        <div className="h-px bg-border w-full mb-5" />
                        <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {n.descricao}
                        </p>
                        
                        {/* Ações */}
                        <div className="flex items-center gap-3 mt-8">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditar(n)}
                            icon={<Pencil size={14} />}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleExcluir(n.id)}
                            icon={<Trash2 size={14} />}
                          >
                            Excluir
                          </Button>
                        </div>
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
