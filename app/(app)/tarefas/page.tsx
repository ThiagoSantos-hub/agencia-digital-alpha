'use client'

import { useState } from 'react'
import { useTarefas, Tarefa, TarefaInput } from '@/hooks/useTarefas'

const STATUS_LABELS: Record<Tarefa['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const STATUS_COLORS: Record<Tarefa['status'], string> = {
  pendente: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  em_andamento: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  concluida: 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30',
  cancelada: 'bg-red-500/20 text-red-400 border border-red-500/30',
}

const PRIORITY_COLORS: Record<Tarefa['priority'], string> = {
  baixa: 'text-gray-400',
  media: 'text-yellow-400',
  alta: 'text-orange-400',
  urgente: 'text-red-400',
}

const PRIORITY_LABELS: Record<Tarefa['priority'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

const EMPTY_FORM: TarefaInput = {
  title: '',
  description: null,
  status: 'pendente',
  priority: 'media',
  due_date: null,
  client_id: null,
  campaign_id: null,
  assignee_id: null,
}

export default function TarefasPage() {
  const { tarefas, usuarios, loading, error, createTarefa, updateTarefa, deleteTarefa } = useTarefas()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Tarefa | null>(null)
  const [form, setForm] = useState<TarefaInput>(EMPTY_FORM)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const abrirModal = (tarefa?: Tarefa) => {
    if (tarefa) {
      setEditando(tarefa)
      setForm({
        title: tarefa.title,
        description: tarefa.description,
        status: tarefa.status,
        priority: tarefa.priority,
        due_date: tarefa.due_date,
        client_id: tarefa.client_id,
        campaign_id: tarefa.campaign_id,
        assignee_id: tarefa.assignee_id,
      })
    } else {
      setEditando(null)
      setForm(EMPTY_FORM)
    }
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditando(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setSalvando(true)
    try {
      if (editando) {
        await updateTarefa(editando.id, form)
      } else {
        await createTarefa(form)
      }
      fecharModal()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return
    setDeletandoId(id)
    try {
      await deleteTarefa(id)
    } finally {
      setDeletandoId(null)
    }
  }

  const tarefasFiltradas = tarefas.filter(t => {
    const matchBusca = t.title.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'todos' || t.status === filtroStatus
    return matchBusca && matchStatus
  })

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tarefas</h1>
          <p className="text-gray-400 text-sm mt-1">{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#00ff88', color: '#0a0f0c' }}
        >
          + Nova Tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por título..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
          style={{ background: '#0f1a14', border: '1px solid #1a3a24', minWidth: 220 }}
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ background: '#0f1a14', border: '1px solid #1a3a24' }}
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a3a24' }}>
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando tarefas...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-400">Erro: {error}</div>
        ) : tarefasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {busca || filtroStatus !== 'todos'
              ? 'Nenhuma tarefa encontrada com esses filtros.'
              : 'Nenhuma tarefa ainda. Crie a primeira!'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#0f1a14', borderBottom: '1px solid #1a3a24' }}>
              <tr>
                {['Título', 'Responsável', 'Prioridade', 'Prazo', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ background: '#0a0f0c' }}>
              {tarefasFiltradas.map((t, i) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: i < tarefasFiltradas.length - 1 ? '1px solid #1a3a24' : undefined }}
                  className="hover:bg-[#0f1a14] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{t.title}</div>
                    {t.description && <div className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{t.assignee?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium text-sm ${PRIORITY_COLORS[t.priority]}`}>
                      {PRIORITY_LABELS[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(t.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirModal(t)}
                        className="text-xs px-3 py-1 rounded-lg text-gray-300 hover:text-white transition-colors"
                        style={{ background: '#1a3a24' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletandoId === t.id}
                        className="text-xs px-3 py-1 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.1)' }}
                      >
                        {deletandoId === t.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-xl p-6 space-y-4" style={{ background: '#0f1a14', border: '1px solid #1a3a24' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editando ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nome da tarefa"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
                  style={{ background: '#0a0f0c', border: '1px solid #1a3a24' }}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
                  placeholder="Detalhes da tarefa (opcional)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none resize-none"
                  style={{ background: '#0a0f0c', border: '1px solid #1a3a24' }}
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Responsável</label>
                <select
                  value={form.assignee_id || ''}
                  onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#0a0f0c', border: '1px solid #1a3a24' }}
                >
                  <option value="">— Sem responsável —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || 'Sem nome'} ({u.role === 'admin' ? 'Admin' : 'Gestor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as Tarefa['status'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#0a0f0c', border: '1px solid #1a3a24' }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as Tarefa['priority'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#0a0f0c', border: '1px solid #1a3a24' }}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Prazo</label>
                <input
                  type="date"
                  value={form.due_date || ''}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#0a0f0c', border: '1px solid #1a3a24', colorScheme: 'dark' }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={fecharModal}
                className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                style={{ background: '#0a0f0c', border: '1px solid #1a3a24' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={salvando || !form.title.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: '#00ff88', color: '#0a0f0c' }}
              >
                {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
