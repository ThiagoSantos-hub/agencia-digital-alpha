'use client'

import { useState } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { Search, Users, UserPlus, X, Loader2, Pencil, Trash2 } from 'lucide-react'

type ClienteForm = {
  name: string
  company: string
  email: string
  phone: string
  status: 'ativo' | 'inativo' | 'prospecto'
  monthly_fee: string
  start_date: string
  payment_day: string
}

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  inativo:   { label: 'Inativo',   className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'         },
  prospecto: { label: 'Prospecto', className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
}

function FormFields({ form, set }: { form: ClienteForm; set: (f: keyof ClienteForm, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Nome <span className="text-red-400">*</span></label>
        <input type="text" placeholder="Nome do responsável" value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Empresa</label>
        <input type="text" placeholder="Nome da empresa" value={form.company}
          onChange={(e) => set('company', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-400">Mensalidade (R$)</label>
          <input type="number" placeholder="0,00" min="0" step="0.01" value={form.monthly_fee}
            onChange={(e) => set('monthly_fee', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-400">Dia de pagamento</label>
          <input type="number" placeholder="Ex: 10" min="1" max="31" value={form.payment_day}
            onChange={(e) => set('payment_day', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Data de entrada</label>
        <input type="date" value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Status</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value as ClienteForm['status'])}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors">
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="prospecto">Prospecto</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Telefone</label>
        <input type="tel" placeholder="(85) 99999-9999" value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">E-mail da empresa</label>
        <input type="email" placeholder="contato@empresa.com" value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>
    </div>
  )
}

function ModalNovoCliente({ onClose }: { onClose: () => void }) {
  const { createCliente } = useClientes()
  const { profile } = useAuth()

  const [form, setForm] = useState<ClienteForm>({
    name: '', company: '', email: '', phone: '',
    status: 'ativo', monthly_fee: '', start_date: '', payment_day: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof ClienteForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    const paymentDay = form.payment_day ? parseInt(form.payment_day) : null
    if (paymentDay !== null && (paymentDay < 1 || paymentDay > 31)) {
      setError('Dia de pagamento deve ser entre 1 e 31.'); return
    }
    setLoading(true)
    setError(null)
    const { error } = await createCliente({
      name:        form.name.trim(),
      company:     form.company.trim() || null,
      email:       form.email.trim() || null,
      phone:       form.phone.trim() || null,
      status:      form.status,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee.replace(',', '.')) : null,
      start_date:  form.start_date || null,
      payment_day: paymentDay,
      manager_id:  profile?.id ?? null,
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Novo Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <FormFields form={form} set={set} />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalEditarCliente({ client, onClose }: { client: Client; onClose: () => void }) {
  const { updateCliente } = useClientes()

  const [form, setForm] = useState<ClienteForm>({
    name:        client.name,
    company:     client.company ?? '',
    email:       client.email ?? '',
    phone:       client.phone ?? '',
    status:      client.status,
    monthly_fee: client.monthly_fee != null ? String(client.monthly_fee) : '',
    start_date:  client.start_date ?? '',
    payment_day: client.payment_day != null ? String(client.payment_day) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof ClienteForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    const paymentDay = form.payment_day ? parseInt(form.payment_day) : null
    if (paymentDay !== null && (paymentDay < 1 || paymentDay > 31)) {
      setError('Dia de pagamento deve ser entre 1 e 31.'); return
    }
    setLoading(true)
    setError(null)
    const { error } = await updateCliente(client.id, {
      name:        form.name.trim(),
      company:     form.company.trim() || null,
      email:       form.email.trim() || null,
      phone:       form.phone.trim() || null,
      status:      form.status,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee.replace(',', '.')) : null,
      start_date:  form.start_date || null,
      payment_day: paymentDay,
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Editar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <FormFields form={form} set={set} />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalConfirmarExclusao({ client, onClose, onConfirm }: { client: Client; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Excluir Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <p className="text-gray-400 text-sm">
          Tem certeza que deseja excluir <span className="text-white font-medium">{client.name}</span>
          {client.company ? <> ({client.company})</> : ''}? Esta ação não pode ser desfeita.
        </p>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Excluindo...</> : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const { clients, loading, error, deleteCliente } = useClientes()
  const [search, setSearch] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Client | null>(null)
  const [clienteExcluindo, setClienteExcluindo] = useState<Client | null>(null)

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleExcluir = async () => {
    if (!clienteExcluindo) return
    await deleteCliente(clienteExcluindo.id)
    setClienteExcluindo(null)
  }

  return (
    <>
      {modalNovo && <ModalNovoCliente onClose={() => setModalNovo(false)} />}
      {clienteEditando && <ModalEditarCliente client={clienteEditando} onClose={() => setClienteEditando(null)} />}
      {clienteExcluindo && (
        <ModalConfirmarExclusao
          client={clienteExcluindo}
          onClose={() => setClienteExcluindo(null)}
          onConfirm={handleExcluir}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Clientes</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
            </p>
          </div>
          <button onClick={() => setModalNovo(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-medium transition-colors">
            <UserPlus size={16} />
            Novo Cliente
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
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
                {clients.length === 0 ? 'Nenhum cliente cadastrado ainda.' : 'Nenhum cliente encontrado.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-left">
                  <th className="px-5 py-3 text-gray-500 font-medium">Nome / Empresa</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Contato</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Mensalidade</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Pgto</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="px-5 py-3 text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const statusInfo = statusConfig[client.status]
                  return (
                    <tr key={client.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-white font-medium">{client.name}</p>
                        {client.company && <p className="text-gray-500 text-xs mt-0.5">{client.company}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-gray-400">{client.email ?? '—'}</p>
                        {client.phone && <p className="text-gray-500 text-xs mt-0.5">{client.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {client.monthly_fee
                          ? `R$ ${client.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {client.payment_day ? `Dia ${client.payment_day}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setClienteEditando(client)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setClienteExcluindo(client)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Excluir">
                            <Trash2 size={14} />
                          </button>
                        </div>
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
