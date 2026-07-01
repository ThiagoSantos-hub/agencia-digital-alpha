'use client'

import { useState } from 'react'
import { useClientes } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { Search, Users, UserPlus, X, Loader2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
type NovoCliente = {
  name: string
  email: string
  phone: string
  status: 'ativo' | 'inativo' | 'prospecto'
}

const statusConfig = {
  ativo:     { label: 'Ativo',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  inativo:   { label: 'Inativo',    className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'         },
  prospecto: { label: 'Prospecto',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
}

// ─── Modal ────────────────────────────────────────────────
function ModalNovoCliente({ onClose }: { onClose: () => void }) {
  const { createCliente } = useClientes()
  const { profile } = useAuth()

  const [form, setForm] = useState<NovoCliente>({
    name: '', email: '', phone: '', status: 'prospecto',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof NovoCliente, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    setLoading(true)
    setError(null)
    const { error } = await createCliente({
      name:       form.name.trim(),
      email:      form.email.trim() || null,
      phone:      form.phone.trim() || null,
      status:     form.status,
      manager_id: profile?.id ?? null,
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Novo Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">Nome <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="Nome do cliente ou empresa"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">E-mail</label>
            <input
              type="email"
              placeholder="contato@empresa.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">Telefone</label>
            <input
              type="tel"
              placeholder="(85) 99999-9999"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as NovoCliente['status'])}
              className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            >
              <option value="prospecto">Prospecto</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────
export default function ClientesPage() {
  const { clients, loading, error } = useClientes()
  const [search, setSearch] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {modalAberto && <ModalNovoCliente onClose={() => setModalAberto(false)} />}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Clientes</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-medium transition-colors"
          >
            <UserPlus size={16} />
            Novo Cliente
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Carregando clientes...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-sm">Erro ao carregar clientes: {error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Users size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {clients.length === 0
                  ? 'Nenhum cliente cadastrado ainda.'
                  : 'Nenhum cliente encontrado com essa busca.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-left">
                  <th className="px-5 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">E-mail</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Telefone</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const statusInfo = statusConfig[client.status]
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5 text-white font-medium">{client.name}</td>
                      <td className="px-5 py-3.5 text-gray-400">{client.email ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-400">{client.phone ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
