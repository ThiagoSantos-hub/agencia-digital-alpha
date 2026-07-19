'use client'

import { useState, useRef, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { Search, UserPlus, X, Loader2, Pencil, Trash2, Download, Upload, Clock, CheckCircle2, Ban, Target, Eye, EyeOff } from 'lucide-react'
// xlsx (~1MB) só é carregado quando o usuário realmente exporta/importa uma planilha,
// em vez de ir no bundle JS de toda visita a esta página.

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
  ativo:     { label: 'Ativo',     className: 'text-cta bg-cta/10 border-cta/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-700 bg-amber-50 border-amber-200' },
  inativo:   { label: 'Inativo',   className: 'text-text-muted bg-slate-100 border-slate-200' },
}

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-colors'

function FormFields({ form, set }: { form: ClienteForm; set: (f: keyof ClienteForm, v: string | boolean) => void }) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-text-muted">Nome <span className="text-red-500">*</span></label>
        <input type="text" placeholder="Nome do responsável" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
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
        <label className="block text-[11px] font-medium text-text-muted">E-mail</label>
        <input type="email" placeholder="contato@empresa.com" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Mensalidade</label>
          <input type="number" placeholder="0,00" min="0" step="0.01" value={form.monthly_fee} onChange={(e) => set('monthly_fee', e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Dia pag.</label>
          <input type="number" placeholder="10" min="1" max="31" value={form.payment_day} onChange={(e) => set('payment_day', e.target.value)} className={inputCls} />
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

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Data de entrada</label>
          <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-text-muted">Meta Ads (act_...)</label>
          <input type="text" placeholder="act_123" value={form.meta_ad_account_id} onChange={(e) => set('meta_ad_account_id', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
        <span className="text-[11px] font-medium text-text-muted flex items-center gap-1.5">
          <Target size={12} className="text-primary" /> Exibir em Campanhas
        </span>
        <button
          type="button"
          onClick={() => set('show_campaigns', !form.show_campaigns)}
          className={`p-1.5 rounded-lg transition-colors ${form.show_campaigns ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-text-muted'}`}
        >
          {form.show_campaigns ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>
    </div>
  )
}

function ModalShell({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-text-main font-semibold text-sm">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-hover-bg">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {children}
        </div>
        <div className="flex-shrink-0 flex gap-2 px-5 py-3 border-t border-border">
          {footer}
        </div>
      </div>
    </div>
  )
}

function ModalNovoCliente({ onClose, createCliente, refetch }: {
  onClose: () => void
  createCliente: ReturnType<typeof useClientes>["createCliente"]
  refetch: ReturnType<typeof useClientes>["refetch"]
}) {
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
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      status: form.status,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee.replace(',', '.')) : null,
      start_date: form.start_date || null,
      payment_day: paymentDay,
      manager_id: profile?.id ?? null,
      inativo_em: null,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null,
      show_campaigns: form.show_campaigns
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else { await refetch(true); onClose() }
  }

  return (
    <ModalShell
      title="Novo Cliente"
      onClose={onClose}
      footer={(
        <>
          <button onClick={onClose} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium text-text-muted bg-background border border-border hover:text-text-main">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover disabled:opacity-50 text-white flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Cliente'}
          </button>
        </>
      )}
    >
      <FormFields form={form} set={set} />
      {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}
    </ModalShell>
  )
}

function ModalEditarCliente({ client, onClose, updateCliente, refetch }: {
  client: Client
  onClose: () => void
  updateCliente: ReturnType<typeof useClientes>["updateCliente"]
  refetch: ReturnType<typeof useClientes>["refetch"]
}) {
  const [form, setForm] = useState<ClienteForm>({
    name: client?.name || '',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    status: (client?.status as any) || 'ativo',
    monthly_fee: client?.monthly_fee != null ? String(client.monthly_fee) : '',
    start_date: client?.start_date || '',
    payment_day: client?.payment_day != null ? String(client.payment_day) : '',
    meta_ad_account_id: client?.meta_ad_account_id || '',
    show_campaigns: client?.show_campaigns ?? true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!client) return null

  const set = (field: keyof ClienteForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return }
    const paymentDay = form.payment_day ? parseInt(form.payment_day) : null
    if (paymentDay !== null && (isNaN(paymentDay) || paymentDay < 1 || paymentDay > 31)) {
      setError('Dia de pagamento deve ser entre 1 e 31.'); return
    }
    setLoading(true)
    setError(null)
    const { error } = await updateCliente(client.id, {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      status: form.status,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee.replace(',', '.')) : null,
      start_date: form.start_date || null,
      payment_day: paymentDay,
      meta_ad_account_id: form.meta_ad_account_id.trim() || null,
      show_campaigns: form.show_campaigns
    })
    if (error) { setError('Erro ao salvar.'); setLoading(false) }
    else { await refetch(true); onClose() }
  }

  return (
    <ModalShell
      title="Editar Cliente"
      onClose={onClose}
      footer={(
        <>
          <button onClick={onClose} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium text-text-muted bg-background border border-border">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover disabled:opacity-50 text-white flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
          </button>
        </>
      )}
    >
      <FormFields form={form} set={set} />
      {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}
    </ModalShell>
  )
}

function ModalConfirmarExclusao({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <ModalShell
      title="Excluir Cliente"
      onClose={onClose}
      footer={(
        <>
          <button onClick={onClose} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-medium text-text-muted bg-background border border-border">Cancelar</button>
          <button onClick={async () => { setLoading(true); await onConfirm() }} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Excluindo...</> : 'Excluir'}
          </button>
        </>
      )}
    >
      <p className="text-text-muted text-sm">
        Tem certeza que deseja excluir <span className="text-text-main font-medium">{name}</span>? Esta ação não pode ser desfeita.
      </p>
    </ModalShell>
  )
}

export default function ClientesPage() {
  const { profile } = useAuth()
  const isCollaborator = profile?.role === 'collaborator'
  const { clients, loading, deleteCliente, updateCliente, createCliente, refetch } = useClientes()
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

  const handleExport = async () => {
    const XLSX = await import('xlsx')
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
    reader.onload = async (evt) => {
      const XLSX = await import('xlsx')
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
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
        <h2 className="text-text-main font-bold text-lg">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted text-[10px] font-bold">{list.length}</span>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-hover-bg">
                <th className="px-5 py-3 text-text-muted font-semibold text-xs uppercase tracking-wider">Cliente / Empresa</th>
                <th className="px-5 py-3 text-text-muted font-semibold text-xs uppercase tracking-wider">Contato</th>
                {!isCollaborator && (
                  <th className="px-5 py-3 text-text-muted font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      Financeiro
                      <button onClick={() => setValoresVisiveis(v => !v)} className="text-text-disabled hover:text-text-main" title={valoresVisiveis ? 'Ocultar' : 'Mostrar'}>
                        {valoresVisiveis ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </th>
                )}
                <th className="px-5 py-3 text-text-muted font-semibold text-xs uppercase tracking-wider">Status</th>
                {title.includes('Inativos') && <th className="px-5 py-3 text-text-muted font-semibold text-xs uppercase tracking-wider">Inativado em</th>}
                {!isCollaborator && <th className="px-5 py-3 text-text-muted font-semibold text-xs uppercase tracking-wider text-right pr-12">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.length === 0 ? (
                <tr><td colSpan={isCollaborator ? 4 : 6} className="px-5 py-10 text-center text-text-disabled">Nenhum cliente encontrado nesta seção.</td></tr>
              ) : list.map((c) => (
                <tr key={c.id} className="hover:bg-hover-bg transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-text-main font-bold text-sm">{c.name}</span>
                      <span className="text-text-muted text-xs">{c.company || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-muted text-xs">{c.phone || '—'}</span>
                      <span className="text-text-disabled text-[10px]">{c.email || '—'}</span>
                    </div>
                  </td>
                  {!isCollaborator && (
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-text-main font-medium text-sm">
                          {c.monthly_fee ? (valoresVisiveis ? `R$ ${c.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••') : '—'}
                        </span>
                        <span className="text-text-muted text-[10px]">Dia {c.payment_day || '—'}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>{statusConfig[c.status].label}</span>
                      {(c.status === 'atrasado') && ((c.dias_atraso ?? 0) > 0) && (
                        <span className="text-amber-600 text-[10px] font-bold flex items-center gap-1"><Clock size={10} /> {c.dias_atraso} dias</span>
                      )}
                    </div>
                  </td>
                  {title.includes('Inativos') && (
                    <td className="px-5 py-4 text-text-muted text-xs">{c.inativo_em ? new Date(c.inativo_em).toLocaleDateString('pt-BR') : '—'}</td>
                  )}
                  {!isCollaborator && (
                    <td className="px-5 py-4 pr-12">
                      <div className="flex items-center justify-end gap-1">
                        <div className="flex items-center bg-background border border-border rounded-xl p-0.5 mr-2">
                          <button onClick={() => handleQuickStatus(c.id, 'ativo')} title="Ativo" className={`p-1 rounded-lg ${c.status === 'ativo' ? 'bg-cta/15 text-cta' : 'text-text-disabled hover:text-cta'}`}><CheckCircle2 size={13} /></button>
                          <button onClick={() => handleQuickStatus(c.id, 'atrasado')} title="Atrasado" className={`p-1 rounded-lg ${c.status === 'atrasado' ? 'bg-amber-50 text-amber-600' : 'text-text-disabled hover:text-amber-600'}`}><Clock size={13} /></button>
                          <button onClick={() => handleQuickStatus(c.id, 'inativo')} title="Inativo" className={`p-1 rounded-lg ${c.status === 'inativo' ? 'bg-slate-100 text-text-muted' : 'text-text-disabled hover:text-text-main'}`}><Ban size={13} /></button>
                        </div>
                        <button onClick={() => setClienteEditar(c)} className="p-2 text-text-muted hover:text-text-main hover:bg-hover-bg rounded-xl"><Pencil size={15} /></button>
                        <button onClick={() => setClienteExcluir(c)} className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
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
          <h1 className="text-text-main text-2xl font-bold">Gestão de Clientes</h1>
          <p className="text-text-muted text-sm mt-1">Gerencie seus clientes ativos, atrasados e o histórico de inativos.</p>
        </div>
        {!isCollaborator && (
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border text-text-muted hover:text-text-main rounded-xl text-sm"><Upload size={15} /> Importar</button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border text-text-muted hover:text-text-main rounded-xl text-sm"><Download size={15} /> Exportar</button>
            <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-sm"><UserPlus size={16} /> Novo Cliente</button>
          </div>
        )}
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="Buscar por nome, empresa ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>

      <div className="space-y-12">
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-text-muted text-sm">Carregando sua base de clientes...</p>
          </div>
        ) : (
          <>
            {renderTable(filteredActive, 'Clientes Ativos e Atrasados')}
            {renderTable(filteredInactive, 'Clientes Inativos')}
          </>
        )}
      </div>

      {modalNovo && <ModalNovoCliente onClose={() => setModalNovo(false)} createCliente={createCliente} refetch={refetch} />}
      {clienteEditar && <ModalEditarCliente client={clienteEditar} onClose={() => setClienteEditar(null)} updateCliente={updateCliente} refetch={refetch} />}
      {clienteExcluir && <ModalConfirmarExclusao name={clienteExcluir.name} onClose={() => setClienteExcluir(null)} onConfirm={async () => { await deleteCliente(clienteExcluir.id); setClienteExcluir(null) }} />}
    </div>
  )
}
