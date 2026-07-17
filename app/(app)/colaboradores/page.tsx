'use client'

import { useState, useMemo, useEffect } from 'react'
import { useColaboradores, ColaboradorInput } from '@/hooks/useColaboradores'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

// Interface estendida para incluir password localmente no formulário
interface ColaboradorFormInput extends ColaboradorInput {
  password?: string
}

const EMPTY_FORM: ColaboradorFormInput = {
  name: '',
  role: '',
  email: '',
  phone: '',
  status: 'ativo',
  salary: undefined,
  salary_frequency: undefined,
  salary_day: undefined,
  password: '',
}

export default function ColaboradoresPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const {
    colaboradores,
    loading,
    createColaborador,
    updateColaborador,
    deleteColaborador,
    toggleStatus,
  } = useColaboradores()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ColaboradorFormInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [authLoading, profile, router])

  // Limpar toast após 5 segundos
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const filtered = useMemo(() => {
    return colaboradores.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.role.toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        filterStatus === 'todos' ? true : c.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [colaboradores, search, filterStatus])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowPassword(false)
    setModalOpen(true)
  }

  const openEdit = (c: typeof colaboradores[0]) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      role: c.role,
      email: c.email ?? '',
      phone: c.phone ?? '',
      status: c.status,
      salary: c.salary ?? undefined,
      salary_frequency: c.salary_frequency ?? undefined,
      salary_day: c.salary_day ?? undefined,
      password: '', // Não usado na edição
    })
    setFormError(null)
    setShowPassword(false)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return }
    if (!form.role.trim()) { setFormError('Cargo é obrigatório.'); return }
    if (!editingId && !form.password?.trim()) { setFormError('Senha é obrigatória para novos colaboradores.'); return }
    
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        // Separar senha dos dados do colaborador
        const { password, ...updateData } = form
        await updateColaborador(editingId, updateData)
        
        // Atualizar senha se preenchida
        if (password?.trim()) {
          const resp = await fetch('/api/collaborators/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: form.name,
              email: form.email,
              password: password
            })
          })
          if (!resp.ok) {
            const data = await resp.json()
            throw new Error(data.error || 'Erro ao atualizar senha.')
          }
        }
        
        setToast({ message: 'Colaborador atualizado com sucesso!', type: 'success' })
      } else {
        // 1. Criar no banco (tabela collaborators) — sem a senha
        const { password, ...dbData } = form
        await createColaborador(dbData as ColaboradorInput)
        
        // 2. Chamar API de convite (Auth + Email)
        const inviteRes = await fetch('/api/collaborators/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            cargo: form.role
          })
        })
        
        const inviteData = await inviteRes.json()
        
        if (!inviteRes.ok) {
          throw new Error(inviteData.error || 'Erro ao enviar convite.')
        }
        
        setToast({ message: 'Colaborador convidado! Email enviado com as credenciais de acesso.', type: 'success' })
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar.'
      setFormError(msg)
      setToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Chamar a API server-side que remove Auth, profiles e collaborators
      const resp = await fetch('/api/collaborators/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data.error || 'Erro ao excluir colaborador.')
      }
      setDeleteConfirmId(null)
      setToast({ message: 'Colaborador excluído com sucesso!', type: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir.'
      alert(msg)
      setToast({ message: msg, type: 'error' })
    }
  }

  if (authLoading || (profile && profile.role !== 'admin')) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-text-main p-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-3 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-right ${
          toast.type === 'success' 
            ? 'bg-cta/10 border-cta/50 text-cta' 
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Colaboradores</h1>
          <p className="text-text-muted text-sm mt-1">
            Gerencie a equipe da agência
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-cta hover:bg-cta-hover text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Novo Colaborador
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nome ou cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            {search || filterStatus !== 'todos'
              ? 'Nenhum colaborador encontrado.'
              : 'Nenhum colaborador cadastrado ainda.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">E-mail</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Telefone</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-hover-bg transition-colors">
                  <td className="px-6 py-4 font-medium text-text-main">{c.name}</td>
                  <td className="px-6 py-4 text-text-main">{c.role}</td>
                  <td className="px-6 py-4 text-text-muted hidden md:table-cell">
                    {c.email || <span className="text-text-disabled">—</span>}
                  </td>
                  <td className="px-6 py-4 text-text-muted hidden md:table-cell">
                    {c.phone || <span className="text-text-disabled">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(c.id, c.status)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        c.status === 'ativo'
                          ? 'bg-cta/10 text-cta hover:bg-cta/20'
                          : 'bg-hover-bg text-text-muted hover:bg-border'
                      }`}
                    >
                      {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs text-text-muted hover:text-text-main border border-border hover:border-primary px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Counter */}
      {!loading && (
        <p className="text-xs text-text-disabled mt-3">
          {filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''} exibido{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-bold text-text-main">
                {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">
                  Cargo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Ex: Designer, Copywriter, Gestor de Tráfego"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Ex: maria@agencia.com"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">
                  Senha {editingId ? <span className="text-text-muted">(deixe em branco para manter a atual)</span> : <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? "Nova senha (opcional)" : "Defina uma senha de acesso"}
                    className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">
                  Telefone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (85) 99999-0000"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                />
              </div>

              {/* Campos de Salário (Fase 2) */}
              <div className="pt-4 border-t border-border space-y-4">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Informações Financeiras</h3>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">
                    Salário
                  </label>
                  <input
                    type="number"
                    value={form.salary || ''}
                    onChange={(e) => setForm({ ...form, salary: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Ex: 2500.00"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">
                    Frequência
                  </label>
                  <select
                    value={form.salary_frequency || ''}
                    onChange={(e) => setForm({ ...form, salary_frequency: (e.target.value as any) || undefined })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="">Selecione...</option>
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">
                    Dia de pagamento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.salary_day || ''}
                    onChange={(e) => setForm({ ...form, salary_day: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Ex: 5"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'ativo' | 'inativo' })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              )}
              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-main border border-border hover:border-primary rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold bg-cta hover:bg-cta-hover disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving ? 'Processando...' : editingId ? 'Salvar alterações' : 'Convidar Colaborador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-bold text-text-main mb-2">Excluir colaborador?</h2>
            <p className="text-sm text-text-muted mb-6">
              Esta ação não pode ser desfeita. O colaborador será removido permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-main border border-border rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-text-main rounded-lg transition-colors"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
