'use client'

import { useState, useRef, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { Search, UserPlus, X, Loader2, Pencil, Trash2, Download, Upload, AlertCircle, Clock, CheckCircle2, Ban, Target, Eye, EyeOff } from 'lucide-react'
import * as XLSX from 'xlsx'

type ClienteForm = {
  name: string
  company: string
  email: string
  phone: string
  status: 'ativo' | 'inativo' | 'atrasado'
  monthly_fee: string
  start_date: string
  payment_day: string
  meta_ad_account_id: string
  show_campaigns: boolean
}

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
  inativo:   { label: 'Inativo',   className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'         },
}

function FormFields({ form, set }: { form: ClienteForm; set: (f: keyof ClienteForm, v: string | boolean) => void }) {
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

      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-3 space-y-3">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target size={12} /> Integração Meta Ads
        </p>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-medium text-gray-500">ID da Conta (act_...)</label>
          <input type="text" placeholder="act_123456789" value={form.meta_ad_account_id}
            onChange={(e) => set('meta_ad_account_id', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-gray-400">Exibir em Campanhas</label>
          <button 
            type="button"
            onClick={() => set('show_campaigns', !form.show_campaigns)}
            className={`p-1.5 rounded-lg transition-colors ${form.show_campaigns ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-500/10 text-gray-500'}`}
          >
            {form.show_campaigns ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
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
          <option value="atrasado">Atrasado</option>
          <option value="inativo">Inativo</option>
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
    meta_ad_account_id: '', show_campaigns: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof ClienteForm, value: string | boolean) =>
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
      inativo_em:  null,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null,
      show_campaigns: form.show_campaigns
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
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

  // Inicialização ultra-segura
  const [form, setForm] = useState<ClienteForm>(() => {
    try {
      return {
        name:        client?.name || '',
        company:     client?.company || '',
        email:       client?.email || '',
        phone:       client?.phone || '',
        status:      (client?.status as any) || 'ativo',
        monthly_fee: client?.monthly_fee != null ? String(client.monthly_fee) : '',
        start_date:  client?.start_date || '',
        payment_day: client?.payment_day != null ? String(client.payment_day) : '',
        meta_ad_account_id: client?.meta_ad_account_id || '',
        show_campaigns: client?.show_campaigns ?? true
      }
    } catch (e) {
      console.error('Erro ao inicializar form:', e)
      return {
        name: '', company: '', email: '', phone: '', status: 'ativo',
        monthly_fee: '', start_date: '', payment_day: '', meta_ad_account_id: '', show_campaigns: true
      }
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!client) return null

  const set = (field: keyof ClienteForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    try {
      if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
      const paymentDay = form.payment_day ? parseInt(form.payment_day) : null
      if (paymentDay !== null && (isNaN(paymentDay) || paymentDay < 1 || paymentDay > 31)) {
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
        meta_ad_account_id: form.meta_ad_account_id.trim() || null,
        show_campaigns: form.show_campaigns
      })
      if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
      else onClose()
    } catch (e: any) {
      setError('Ocorreu um erro inesperado.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Editar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>
        
        <FormFields form={form} set={set} />
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
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

function ModalConfirmarExclusao({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Excluir Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <p className="text-gray-400 text-sm">
          Tem certeza que deseja excluir <span className="text-white font-medium">{name}</span>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-[#0f0f0f] border border-[#2a2a2a] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={async () => { setLoading(true); await onConfirm() }} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Excluindo...</> : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const { profile } = useAuth()
  const isCollaborator = profile?.role === 'collaborator'
  const { clients, loading, deleteCliente, updateCliente } = useClientes()
  const [search, setSearch] = useState('')
  const [valoresVisiveis, setValoresVisiveis] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteEditar, setClienteEditar] = useState<Client | null>(null)
  const [clienteExcluir, setClienteExcluir] = useState<Client | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredActive = useMemo(() => 
    clients.filter(c => 
      c.status !== 'inativo' && 
      (c.name.toLowerCase().includes(search.toLowerCase()) || 
       (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
       (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    ), [clients, search])

  const filteredInactive = useMemo(() => 
    clients.filter(c => 
      c.status === 'inativo' && 
      (c.name.toLowerCase().includes(search.toLowerCase()) || 
       (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
       (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    ), [clients, search])

  const handleExport = () => {
    const data = clients.map(c => ({
      Nome: c.name,
      Empresa: c.company || '',
      Email: c.email || '',
      Telefone: c.phone || '',
      Status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
      Mensalidade: c.monthly_fee || 0,
      'Dia Pagamento': c.payment_day || '',
      'Início': c.start_date || '',
      'Atraso (Dias)': c.dias_atraso || 0
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'clientes_agencia_alpha.xlsx')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      console.log('Dados importados:', data)
      alert(`${data.length} clientes processados para importação.`)
    }
    reader.readAsBinaryString(file)
  }

  const handleQuickStatus = async (id: string, status: 'ativo' | 'atrasado' | 'inativo') => {
    await updateCliente(id, { status })
  }

  const renderTable = (list: Client[], title: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-white font-bold text-lg">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 text-[10px] font-bold">
          {list.length}
        </span>
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#1f1f1f]/50">
                <th className="px-5 py-3 text-gray-500 font-medium">CLIENTE / EMPRESA</th>
                <th className="px-5 py-3 text-gray-500 font-medium">CONTATO</th>
                {!isCollaborator && (
                  <th className="px-5 py-3 text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                      FINANCEIRO
                      <button
                        onClick={() => setValoresVisiveis(v => !v)}
                        className="text-gray-600 hover:text-gray-300 transition-colors"
                        title={valoresVisiveis ? 'Ocultar valores' : 'Mostrar valores'}
                      >
                        {valoresVisiveis ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </th>
                )}
                <th className="px-5 py-3 text-gray-500 font-medium">STATUS</th>
                {title.includes('Inativos') && <th className="px-5 py-3 text-gray-500 font-medium">INATIVADO EM</th>}
                {!isCollaborator && <th className="px-5 py-3 text-gray-500 font-medium text-right pr-12">AÇÕES</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]/50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={isCollaborator ? 4 : 6} className="px-5 py-10 text-center text-gray-600">
                    Nenhum cliente encontrado nesta seção.
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{c.name}</span>
                        <span className="text-gray-500 text-xs">{c.company || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-xs flex items-center gap-1.5">
                          {c.phone || '—'}
                        </span>
                        <span className="text-gray-600 text-[10px]">{c.email || '—'}</span>
                      </div>
                    </td>
                    {!isCollaborator && (
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm">
                            {c.monthly_fee
                              ? (valoresVisiveis
                                  ? `R$ ${c.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : '••••••')
                              : '—'}
                          </span>
                          <span className="text-gray-500 text-[10px]">Dia {c.payment_day || '—'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>
                          {statusConfig[c.status].label}
                        </span>
                        {/* CORREÇÃO: > 0 evita que o React renderize o número 0 na tela */}
                        {(c.status === 'atrasado') && ((c.dias_atraso ?? 0) > 0) && (
                          <span className="text-amber-500 text-[10px] font-bold flex items-center gap-1">
                            <Clock size={10} /> {c.dias_atraso} dias
                          </span>
                        )}
                      </div>
                    </td>
                    {title.includes('Inativos') && (
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {c.inativo_em ? new Date(c.inativo_em).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    )}
                    {!isCollaborator && (
                      <td className="px-5 py-4 pr-12">
                        <div className="flex items-center justify-end gap-1">
                          <div className="flex items-center bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-0.5 mr-2">
                            <button onClick={() => handleQuickStatus(c.id, 'ativo')} title="Marcar como Ativo"
                              className={`p-1 rounded-lg transition-all ${c.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-600 hover:text-emerald-400'}`}>
                              <CheckCircle2 size={13} />
                            </button>
                            <button onClick={() => handleQuickStatus(c.id, 'atrasado')} title="Marcar como Atrasado"
                              className={`p-1 rounded-lg transition-all ${c.status === 'atrasado' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}>
                              <Clock size={13} />
                            </button>
                            <button onClick={() => handleQuickStatus(c.id, 'inativo')} title="Marcar como Inativo"
                              className={`p-1 rounded-lg transition-all ${c.status === 'inativo' ? 'bg-gray-500/20 text-gray-400' : 'text-gray-600 hover:text-white'}`}>
                              <Ban size={13} />
                            </button>
                          </div>
                          <button onClick={() => setClienteEditar(c)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setClienteExcluir(c)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Gestão de Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie seus clientes ativos, atrasados e o histórico de inativos.</p>
        </div>
        {!isCollaborator && (
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white rounded-xl text-sm transition-all">
              <Upload size={15} /> Importar
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white rounded-xl text-sm transition-all">
              <Download size={15} /> Exportar
            </button>
            <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
              <UserPlus size={16} /> Novo Cliente
            </button>
          </div>
        )}
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Buscar por nome, empresa ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner" />
      </div>

      <div className="space-y-12">
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p className="text-gray-500 text-sm">Carregando sua base de clientes...</p>
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
      {clienteExcluir && <ModalConfirmarExclusao name={clienteExcluir.name} onClose={() => setClienteExcluir(null)} onConfirm={async () => { await deleteCliente(clienteExcluir.id); setClienteExcluir(null) }} />}
    </div>
  )
}
