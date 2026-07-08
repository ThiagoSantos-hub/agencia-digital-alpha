'use client'

import { useState, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { useColaboradorFinance } from '@/hooks/useColaboradorFinance'
import { Search, UserPlus, X, Loader2, Pencil, Clock, CheckCircle2, Ban, Target, Eye, EyeOff } from 'lucide-react'

type ClienteForm = {
  name: string
  company: string
  email: string
  phone: string
  status: 'ativo' | 'inativo' | 'atrasado'
  meta_ad_account_id: string
  show_campaigns: boolean
  monthly_fee: string
  payment_day: string
}

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
  inativo:   { label: 'Inativo',   className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'         },
}

function FormFields({ form, set }: { form: ClienteForm; set: (f: keyof ClienteForm, v: string | boolean) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-gray-400">Nome <span className="text-red-400">*</span></label>
        <input type="text" placeholder="Nome do responsável" value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-400">Empresa</label>
          <input type="text" placeholder="Nome da empresa" value={form.company}
            onChange={(e) => set('company', e.target.value)}
            className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-400">Telefone</label>
          <input type="tel" placeholder="(85) 99999-9999" value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-gray-400">E-mail de contato</label>
        <input type="email" placeholder="contato@empresa.com" value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
      </div>

      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 space-y-2">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target size={12} /> Integração Meta Ads
        </p>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-medium text-gray-500">ID da Conta (act_...)</label>
          <input type="text" placeholder="act_123456789" value={form.meta_ad_account_id}
            onChange={(e) => set('meta_ad_account_id', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs placeholder-gray-700 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-gray-400">Exibir em Campanhas</label>
          <button 
            type="button"
            onClick={() => set('show_campaigns', !form.show_campaigns)}
            className={`p-1.5 rounded-lg transition-colors ${form.show_campaigns ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}
          >
            {form.show_campaigns ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-400">Valor Mensal (R$)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.monthly_fee}
            onChange={(e) => set('monthly_fee', e.target.value)}
            className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-gray-400">Dia de Pagamento</label>
          <input type="number" min="1" max="31" placeholder="Ex: 10" value={form.payment_day}
            onChange={(e) => set('payment_day', e.target.value)}
            className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-gray-400">Status</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value as ClienteForm['status'])}
          className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors">
          <option value="ativo">Ativo</option>
          <option value="atrasado">Atrasado</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>
    </div>
  )
}

function ModalNovoCliente({ onClose }: { onClose: () => void }) {
  const { createCliente } = useClientes()
  const { profile } = useAuth()
  const { createFinance } = useColaboradorFinance()

  const [form, setForm] = useState<ClienteForm>({
    name: '', company: '', email: '', phone: '',
    status: 'ativo', meta_ad_account_id: '', show_campaigns: true,
    monthly_fee: '', payment_day: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof ClienteForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    setLoading(true)
    setError(null)
    
    const { error: clientError } = await createCliente({
      name:        form.name.trim(),
      company:     form.company.trim() || null,
      email:       form.email.trim() || null,
      phone:       form.phone.trim() || null,
      status:      form.status,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      start_date:  new Date().toISOString().split('T')[0],
      payment_day: form.payment_day ? parseInt(form.payment_day) : null,
      manager_id:  profile?.id ?? null,
      inativo_em:  null,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null,
      show_campaigns: form.show_campaigns
    })

    if (clientError) { 
      setError('Erro ao salvar cliente. Tente novamente.'); 
      setLoading(false);
      return;
    }

    if (form.monthly_fee) {
      await createFinance({
        type: 'receita',
        description: `Cliente: ${form.name.trim()}`,
        amount: parseFloat(form.monthly_fee),
        date: new Date().toISOString().split('T')[0]
      })
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Novo Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <FormFields form={form} set={set} />
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
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
    meta_ad_account_id: client.meta_ad_account_id ?? '',
    show_campaigns: client.show_campaigns ?? true,
    monthly_fee: client.monthly_fee != null ? String(client.monthly_fee) : '',
    payment_day: client.payment_day != null ? String(client.payment_day) : ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof ClienteForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    setLoading(true)
    setError(null)
    const { error } = await updateCliente(client.id, {
      name:        form.name.trim(),
      company:     form.company.trim() || null,
      email:       form.email.trim() || null,
      phone:       form.phone.trim() || null,
      status:      form.status,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null,
      show_campaigns: form.show_campaigns,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      payment_day: form.payment_day ? parseInt(form.payment_day) : null
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Editar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <FormFields form={form} set={set} />
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MeusClientesPage() {
  const { profile } = useAuth()
  const { clients, loading, updateCliente } = useClientes()
  const [search, setSearch] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteEditar, setClienteEditar] = useState<Client | null>(null)

  const myClients = useMemo(() => 
    clients.filter(c => c.manager_id === profile?.id),
  [clients, profile?.id])

  const filteredActive = useMemo(() => 
    myClients.filter(c => 
      c.status !== 'inativo' && 
      (c.name.toLowerCase().includes(search.toLowerCase()) || 
       (c.company ?? '').toLowerCase().includes(search.toLowerCase()))
    ), [myClients, search])

  const filteredInactive = useMemo(() => 
    myClients.filter(c => 
      c.status === 'inativo' && 
      (c.name.toLowerCase().includes(search.toLowerCase()) || 
       (c.company ?? '').toLowerCase().includes(search.toLowerCase()))
    ), [myClients, search])

  const handleQuickStatus = async (id: string, status: 'ativo' | 'atrasado' | 'inativo') => {
    await updateCliente(id, { status })
  }

  const renderTable = (list: Client[], title: string) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-white font-bold text-sm">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 text-[10px] font-bold">
          {list.length}
        </span>
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#1f1f1f]/50">
                <th className="px-3 py-2 text-gray-500 font-medium text-xs">CLIENTE</th>
                <th className="px-3 py-2 text-gray-500 font-medium text-xs">CONTATO</th>
                <th className="px-3 py-2 text-gray-500 font-medium text-xs">FINANCEIRO</th>
                <th className="px-3 py-2 text-gray-500 font-medium text-xs">STATUS</th>
                <th className="px-3 py-2 text-gray-500 font-medium text-xs text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]/50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-600 text-sm">
                    Nenhum cliente cadastrado por você.
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{c.name}</span>
                        <span className="text-gray-500 text-xs">{c.company || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-xs">{c.phone || '—'}</span>
                        <span className="text-gray-600 text-[10px]">{c.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm">
                          {c.monthly_fee
                            ? c.monthly_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : '—'}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                          {c.payment_day ? `Dia ${c.payment_day}` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>
                          {statusConfig[c.status].label}
                        </span>
                        {(c.status === 'atrasado') && ((c.dias_atraso ?? 0) > 0) && (
                          <span className="text-amber-500 text-[10px] font-bold flex items-center gap-1">
                            <Clock size={10} /> {c.dias_atraso} dias
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <div className="flex items-center bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-0.5">
                          <button onClick={() => handleQuickStatus(c.id, 'ativo')} title="Marcar como Ativo"
                            className={`p-1 rounded-md transition-all ${c.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-600 hover:text-emerald-400'}`}>
                            <CheckCircle2 size={13} />
                          </button>
                          <button onClick={() => handleQuickStatus(c.id, 'inativo')} title="Marcar como Inativo"
                            className={`p-1 rounded-md transition-all ${c.status === 'inativo' ? 'bg-gray-500/20 text-gray-400' : 'text-gray-600 hover:text-white'}`}>
                            <Ban size={13} />
                          </button>
                        </div>
                        <button onClick={() => setClienteEditar(c)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-white text-lg font-bold">Meus Clientes</h1>
          <p className="text-gray-400 text-xs mt-0.5">Gerencie os clientes que você cadastrou pessoalmente.</p>
        </div>
        <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
          <UserPlus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Buscar em meus clientes..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
      </div>

      <div className="space-y-6">
        {loading && myClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
            <p className="text-gray-500 text-sm">Carregando seus clientes...</p>
          </div>
        ) : (
          <>
            {renderTable(filteredActive, 'Clientes Ativos')}
            {renderTable(filteredInactive, 'Clientes Inativos')}
          </>
        )}
      </div>

      {modalNovo && <ModalNovoCliente onClose={() => setModalNovo(false)} />}
      {clienteEditar && <ModalEditarCliente client={clienteEditar} onClose={() => setClienteEditar(null)} />}
    </div>
  )
}
