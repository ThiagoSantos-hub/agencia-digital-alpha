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
  ativo:     { label: 'Ativo',     className: 'text-cta bg-cta/10 border-cta/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-700 bg-amber-50 border-amber-200' },
  inativo:   { label: 'Inativo',   className: 'text-text-muted bg-slate-100 border-slate-200' },
}

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-colors'

function FormFields({ form, set }: { form: ClienteForm; set: (f: keyof ClienteForm, v: string | boolean) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-text-muted">Nome <span className="text-red-500">*</span></label>
        <input type="text" placeholder="Nome do responsável" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Empresa</label>
          <input type="text" placeholder="Nome da empresa" value={form.company} onChange={(e) => set('company', e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Telefone</label>
          <input type="tel" placeholder="(85) 99999-9999" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-text-muted">E-mail de contato</label>
        <input type="email" placeholder="contato@empresa.com" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
      </div>
      <div className="bg-background border border-border rounded-lg p-3 space-y-2">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5"><Target size={12} /> Integração Meta Ads</p>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-medium text-text-muted">ID da Conta (act_...)</label>
          <input type="text" placeholder="act_123456789" value={form.meta_ad_account_id} onChange={(e) => set('meta_ad_account_id', e.target.value)} className={inputCls + ' text-xs'} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-text-muted">Exibir em Campanhas</label>
          <button type="button" onClick={() => set('show_campaigns', !form.show_campaigns)}
            className={`p-1.5 rounded-lg transition-colors ${form.show_campaigns ? 'bg-primary/10 text-primary' : 'bg-hover-bg text-text-muted'}`}>
            {form.show_campaigns ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Valor Mensal (R$)</label>
          <input type="number" step="0.01" placeholder="0.00" value={form.monthly_fee} onChange={(e) => set('monthly_fee', e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Dia de Pagamento</label>
          <input type="number" min="1" max="31" placeholder="Ex: 10" value={form.payment_day} onChange={(e) => set('payment_day', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-text-muted">Status</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value as ClienteForm['status'])} className={inputCls}>
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
    name: '', company: '', email: '', phone: '', status: 'ativo',
    meta_ad_account_id: '', show_campaigns: true, monthly_fee: '', payment_day: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (field: keyof ClienteForm, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    setLoading(true); setError(null)
    const { error: clientError } = await createCliente({
      name: form.name.trim(), company: form.company.trim() || null, email: form.email.trim() || null,
      phone: form.phone.trim() || null, status: form.status,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      start_date: new Date().toISOString().split('T')[0],
      payment_day: form.payment_day ? parseInt(form.payment_day) : null,
      manager_id: profile?.id ?? null, inativo_em: null,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null, show_campaigns: form.show_campaigns
    })
    if (clientError) { setError(clientError.message || 'Erro ao salvar cliente.'); setLoading(false); return }
    if (form.monthly_fee) {
      await createFinance({ type: 'receita', description: `Cliente: ${form.name.trim()}`, amount: parseFloat(form.monthly_fee), date: new Date().toISOString().split('T')[0] })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-5 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-text-main font-semibold text-base">Novo Cliente</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-1"><X size={18} /></button>
        </div>
        <FormFields form={form} set={set} />
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium text-text-muted bg-background border border-border hover:text-text-main">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 disabled:opacity-50">
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
    name: client.name, company: client.company ?? '', email: client.email ?? '', phone: client.phone ?? '',
    status: client.status, meta_ad_account_id: client.meta_ad_account_id ?? '', show_campaigns: client.show_campaigns ?? true,
    monthly_fee: client.monthly_fee != null ? String(client.monthly_fee) : '', payment_day: client.payment_day != null ? String(client.payment_day) : ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (field: keyof ClienteForm, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    setLoading(true); setError(null)
    const { error } = await updateCliente(client.id, {
      name: form.name.trim(), company: form.company.trim() || null, email: form.email.trim() || null,
      phone: form.phone.trim() || null, status: form.status,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null, show_campaigns: form.show_campaigns,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      payment_day: form.payment_day ? parseInt(form.payment_day) : null
    })
    if (error) { setError('Erro ao salvar.'); setLoading(false) } else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-5 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-text-main font-semibold text-base">Editar Cliente</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-1"><X size={18} /></button>
        </div>
        <FormFields form={form} set={set} />
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium text-text-muted bg-background border border-border">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 disabled:opacity-50">
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

  const myClients = useMemo(() => clients.filter(c => c.manager_id === profile?.id), [clients, profile?.id])
  const filteredActive = useMemo(() => myClients.filter(c => c.status !== 'inativo' && (c.name.toLowerCase().includes(search.toLowerCase()) || (c.company ?? '').toLowerCase().includes(search.toLowerCase()))), [myClients, search])
  const filteredInactive = useMemo(() => myClients.filter(c => c.status === 'inativo' && (c.name.toLowerCase().includes(search.toLowerCase()) || (c.company ?? '').toLowerCase().includes(search.toLowerCase()))), [myClients, search])

  const handleQuickStatus = async (id: string, status: 'ativo' | 'atrasado' | 'inativo') => {
    await updateCliente(id, { status })
  }

  const renderTable = (list: Client[], title: string) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-text-main font-bold text-sm">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted text-[10px] font-bold">{list.length}</span>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-hover-bg">
              <th className="px-3 py-2 text-text-muted font-medium text-[11px]">CLIENTE</th>
              <th className="px-3 py-2 text-text-muted font-medium text-[11px]">CONTATO</th>
              <th className="px-3 py-2 text-text-muted font-medium text-[11px]">FINANCEIRO</th>
              <th className="px-3 py-2 text-text-muted font-medium text-[11px]">STATUS</th>
              <th className="px-3 py-2 text-text-muted font-medium text-[11px] text-right">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-text-disabled text-sm">Nenhum cliente cadastrado por você.</td></tr>
            ) : list.map((c) => (
              <tr key={c.id} className="hover:bg-hover-bg transition-colors">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-text-main font-bold text-xs">{c.name}</span>
                  <span className="text-text-muted text-[10px] ml-1.5">{c.company || '—'}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-text-muted text-[11px]">{c.phone || '—'}</span>
                  <span className="text-text-disabled text-[10px] ml-1.5">{c.email || '—'}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-text-main font-medium text-xs">{c.monthly_fee ? c.monthly_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</span>
                  <span className="text-text-muted text-[10px] ml-1.5">{c.payment_day ? `Dia ${c.payment_day}` : '—'}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>{statusConfig[c.status].label}</span>
                    {(c.status === 'atrasado') && ((c.dias_atraso ?? 0) > 0) && (
                      <span className="text-amber-600 text-[10px] font-bold inline-flex items-center gap-0.5"><Clock size={9} /> {c.dias_atraso}d</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <div className="inline-flex items-center bg-background border border-border rounded-lg p-0.5">
                      <button onClick={() => handleQuickStatus(c.id, 'ativo')} title="Ativo" className={`p-1 rounded-md ${c.status === 'ativo' ? 'bg-cta/15 text-cta' : 'text-text-disabled hover:text-cta'}`}><CheckCircle2 size={12} /></button>
                      <button onClick={() => handleQuickStatus(c.id, 'inativo')} title="Inativo" className={`p-1 rounded-md ${c.status === 'inativo' ? 'bg-slate-200 text-text-muted' : 'text-text-disabled hover:text-text-main'}`}><Ban size={12} /></button>
                    </div>
                    <button onClick={() => setClienteEditar(c)} className="p-1 text-text-muted hover:text-text-main hover:bg-hover-bg rounded-lg"><Pencil size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-text-main text-lg font-bold">Meus Clientes</h1>
          <p className="text-text-muted text-xs mt-0.5">Gerencie os clientes que você cadastrou pessoalmente.</p>
        </div>
        <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-sm">
          <UserPlus size={16} /> Novo Cliente
        </button>
      </div>
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="Buscar em meus clientes..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary/50" />
      </div>
      <div className="space-y-6">
        {loading && myClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-text-muted text-sm">Carregando seus clientes...</p>
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
