'use client'

import { useState, useMemo, useEffect } from 'react'
import { useColaboradores, ColaboradorInput } from '@/hooks/useColaboradores'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, X } from 'lucide-react'

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

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-colors'

export default function ColaboradoresPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const {
    colaboradores,
    loading,
    createColaborador,
    updateColaborador,
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
      password: '',
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
        const { password, ...updateData } = form
        await updateColaborador(editingId, updateData)

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
        const { password, ...dbData } = form
        await createColaborador(dbData as ColaboradorInput)

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
      setToast({ message: msg, type: 'error' })
    }
  }

  if (authLoading || (profile && profile.role !== 'admin')) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-text-main p-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-3 rounded-xl shadow-2xl border ${
          toast.type === 'success'
            ? 'bg-cta/10 border-cta/50 text-cta'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Colaboradores</h1>
          <p className="text-text-muted text-sm mt-1">Gerencie a equipe da agência</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-sm"
        >
          + Novo Colaborador
        </button>
      </div>

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

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
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
              <tr className="border-b border-border text-left bg-hover-bg">
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
                        className="text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
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

      {!loading && (
        <p className="text-xs text-text-disabled mt-3">
          {filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''} exibido{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-text-main">
                {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-hover-bg">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-muted">Nome <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maria Silva" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-muted">Cargo <span className="text-red-500">*</span></label>
                  <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Designer" className={inputCls} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@agencia.com" className={inputCls} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">
                  Senha {editingId ? <span className="text-text-disabled">(opcional)</span> : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? 'Nova senha' : 'Senha de acesso'}
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-muted">Telefone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(85) 99999-0000" className={inputCls} />
                </div>
                {editingId && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-text-muted">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'ativo' | 'inativo' })} className={inputCls}>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border space-y-2.5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Financeiro</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-text-muted">Salário</label>
                    <input type="number" value={form.salary || ''} onChange={(e) => setForm({ ...form, salary: e.target.value ? Number(e.target.value) : undefined })} placeholder="2500" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-text-muted">Frequência</label>
                    <select value={form.salary_frequency || ''} onChange={(e) => setForm({ ...form, salary_frequency: (e.target.value as any) || undefined })} className={inputCls}>
                      <option value="">—</option>
                      <option value="mensal">Mensal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="semanal">Semanal</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-text-muted">Dia</label>
                    <input type="number" min="1" max="31" value={form.salary_day || ''} onChange={(e) => setForm({ ...form, salary_day: e.target.value ? Number(e.target.value) : undefined })} placeholder="5" className={inputCls} />
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
            </div>

            <div className="flex-shrink-0 flex gap-2 px-5 py-3 border-t border-border">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 text-sm text-text-muted border border-border rounded-lg hover:text-text-main">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-lg shadow-sm">
                {saving ? 'Processando...' : editingId ? 'Salvar' : 'Convidar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-sm shadow-2xl p-5">
            <h2 className="text-sm font-semibold text-text-main mb-2">Excluir colaborador?</h2>
            <p className="text-sm text-text-muted mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 text-sm text-text-muted border border-border rounded-lg">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
