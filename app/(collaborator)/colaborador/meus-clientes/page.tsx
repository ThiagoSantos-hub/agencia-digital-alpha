'use client'

import { useState, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { useColaboradorFinance } from '@/hooks/useColaboradorFinance'
import { 
  Search, 
  UserPlus, 
  X, 
  Loader2, 
  Pencil, 
  Clock, 
  CheckCircle2, 
  Ban, 
  Target, 
  Eye, 
  EyeOff,
  Building2,
  Mail,
  Phone,
  DollarSign,
  ChevronRight
} from 'lucide-react'

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
  ativo:     { label: 'Ativo',     className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  atrasado:  { label: 'Atrasado',  className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  inativo:   { label: 'Inativo',   className: 'bg-red-50 text-red-700 border-red-200', icon: Ban },
}

function FormFields({ form, set }: { form: ClienteForm; set: (f: keyof ClienteForm, v: string | boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-[#64748B]">Nome Completo <span className="text-red-500">*</span></label>
        <input type="text" placeholder="Nome do responsável" value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] placeholder-gray-400 focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[#64748B]">Empresa</label>
          <input type="text" placeholder="Nome da empresa" value={form.company}
            onChange={(e) => set('company', e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] placeholder-gray-400 focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[#64748B]">Telefone</label>
          <input type="tel" placeholder="(85) 99999-9999" value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] placeholder-gray-400 focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-[#64748B]">E-mail de Contato</label>
        <input type="email" placeholder="contato@empresa.com" value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] placeholder-gray-400 focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all" />
      </div>

      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold text-[#1A56DB] uppercase tracking-wider flex items-center gap-1.5">
          <Target size={12} /> Integração Meta Ads
        </p>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-medium text-[#64748B]">ID da Conta (act_...)</label>
          <input type="text" placeholder="act_123456789" value={form.meta_ad_account_id}
            onChange={(e) => set('meta_ad_account_id', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E293B] text-xs placeholder-gray-400 focus:outline-none focus:border-[#1A56DB] transition-colors" />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-[#64748B]">Exibir em Campanhas</label>
          <button 
            type="button"
            onClick={() => set('show_campaigns', !form.show_campaigns)}
            className={`p-1.5 rounded-lg transition-colors ${form.show_campaigns ? 'bg-[#EFF6FF] text-[#1A56DB]' : 'bg-gray-100 text-gray-500'}`}
          >
            {form.show_campaigns ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[#64748B]">Mensalidade (R$)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
            <input type="number" step="0.01" placeholder="0.00" value={form.monthly_fee}
              onChange={(e) => set('monthly_fee', e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] focus:outline-none focus:border-[#1A56DB] transition-all" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[#64748B]">Dia de Pagamento</label>
          <input type="number" min="1" max="31" placeholder="Ex: 10" value={form.payment_day}
            onChange={(e) => set('payment_day', e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] focus:outline-none focus:border-[#1A56DB] transition-all" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-[#64748B]">Status do Cliente</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value as ClienteForm['status'])}
          className="w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#1E293B] focus:outline-none focus:border-[#1A56DB] transition-all appearance-none">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-[#1E293B] font-semibold text-lg">Novo Cliente</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1E293B] transition-colors p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <FormFields form={form} set={set} />
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors shadow-sm">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-[#1E293B] font-semibold text-lg">Editar Cliente</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1E293B] transition-colors p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <FormFields form={form} set={set} />
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors shadow-sm">
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-[#1E293B] font-bold text-base">{title}</h2>
        <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1A56DB] text-[10px] font-bold">
          {list.length}
        </span>
      </div>
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[#64748B] font-semibold text-xs uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-[#64748B] font-semibold text-xs uppercase tracking-wider">Contato</th>
                <th className="px-4 py-3 text-[#64748B] font-semibold text-xs uppercase tracking-wider">Financeiro</th>
                <th className="px-4 py-3 text-[#64748B] font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[#64748B] font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#64748B] text-sm italic">
                    Nenhum cliente encontrado nesta seção.
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const config = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.inativo
                  const StatusIcon = config.icon

                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1A56DB] font-bold text-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1E293B] text-sm">{c.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                              <Building2 size={10} />
                              {c.company || '--'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[#64748B] text-[11px]">
                            <Mail size={12} className="text-[#1A56DB]" />
                            {c.email || '--'}
                          </div>
                          <div className="flex items-center gap-2 text-[#64748B] text-[11px]">
                            <Phone size={12} className="text-[#16A34A]" />
                            {c.phone || '--'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-[#1E293B] font-bold text-xs">
                            {c.monthly_fee ? `R$ ${c.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                          </p>
                          <p className="text-[10px] text-[#64748B]">Vence dia {c.payment_day || '--'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${config.className}`}>
                            <StatusIcon size={10} />
                            {config.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleQuickStatus(c.id, 'ativo')} className="p-1 rounded-md hover:bg-green-50 text-gray-300 hover:text-green-600 transition-colors" title="Ativar">
                              <CheckCircle2 size={14} />
                            </button>
                            <button onClick={() => handleQuickStatus(c.id, 'atrasado')} className="p-1 rounded-md hover:bg-amber-50 text-gray-300 hover:text-amber-600 transition-colors" title="Marcar Atraso">
                              <Clock size={14} />
                            </button>
                            <button onClick={() => handleQuickStatus(c.id, 'inativo')} className="p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-600 transition-colors" title="Inativar">
                              <Ban size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => setClienteEditar(c)}
                          className="p-2 text-[#94A3B8] hover:text-[#1A56DB] hover:bg-[#EFF6FF] rounded-xl transition-all"
                        >
                          <Pencil size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-full text-[#1E293B]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-[#1E293B]">
            <Target className="text-[#1A56DB]" />
            Meus Clientes
          </h1>
          <p className="text-[#64748B] text-sm">Gerencie sua carteira de clientes e acompanhe os status financeiros.</p>
        </div>
        <button 
          onClick={() => setModalNovo(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-semibold rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Buscar em minha carteira..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] shadow-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-6 px-6 py-2.5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
           <div className="text-center">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">Minha Carteira</p>
              <p className="text-lg font-bold text-[#1A56DB]">{myClients.length}</p>
           </div>
           <div className="w-px h-8 bg-[#E2E8F0]" />
           <div className="text-center">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">Ativos</p>
              <p className="text-lg font-bold text-[#16A34A]">{myClients.filter(c => c.status === 'ativo').length}</p>
           </div>
        </div>
      </div>

      {/* Tables */}
      <div className="space-y-10 pb-12">
        {loading && myClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-[#1A56DB]" />
            <p className="text-[#64748B] text-sm font-medium">Carregando seus clientes...</p>
          </div>
        ) : (
          <>
            {renderTable(filteredActive, 'Clientes Ativos e Atrasados')}
            {renderTable(filteredInactive, 'Clientes Inativos')}
          </>
        )}
      </div>

      {modalNovo && <ModalNovoCliente onClose={() => setModalNovo(false)} />}
      {clienteEditar && <ModalEditarCliente client={clienteEditar} onClose={() => setClienteEditar(null)} />}
    </div>
  )
}
