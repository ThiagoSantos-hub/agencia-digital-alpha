'use client'

import { useState, useRef } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { Search, Users, UserPlus, X, Loader2, Pencil, Trash2, Download, Upload, AlertCircle, Clock } from 'lucide-react'
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
}

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
  inativo:   { label: 'Inativo',   className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'         },
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
      inativo_em:  null
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
  const { clients, loading, error, deleteCliente, createCliente } = useClientes()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Client | null>(null)
  const [clienteExcluindo, setClienteExcluindo] = useState<Client | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeClients = clients.filter(c => c.status !== 'inativo')
  const inactiveClients = clients.filter(c => c.status === 'inativo')

  const filterFn = (c: Client) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())

  const filteredActive = activeClients.filter(filterFn)
  const filteredInactive = inactiveClients.filter(filterFn)

  const handleExcluir = async () => {
    if (!clienteExcluindo) return
    await deleteCliente(clienteExcluindo.id)
    setClienteExcluindo(null)
  }

  const exportToExcel = () => {
    const data = clients.map(c => ({
      Nome: c.name,
      Empresa: c.company || '',
      Email: c.email || '',
      Telefone: c.phone || '',
      Status: statusConfig[c.status].label,
      Mensalidade: c.monthly_fee || 0,
      'Dia Pagamento': c.payment_day || '',
      'Data Entrada': c.start_date || '',
      'Data Inativação': c.inativo_em ? new Date(c.inativo_em).toLocaleDateString('pt-BR') : '',
      'Dias em Atraso': c.dias_atraso || 0
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'clientes_agencia_digital.xlsx')
  }

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws) as any[]

      for (const row of data) {
        await createCliente({
          name: row.Nome || row.name,
          company: row.Empresa || row.company || null,
          email: row.Email || row.email || null,
          phone: row.Telefone || row.phone || null,
          status: 'ativo',
          monthly_fee: row.Mensalidade || row.monthly_fee || null,
          start_date: row['Data Entrada'] || row.start_date || null,
          payment_day: row['Dia Pagamento'] || row.payment_day || null,
          manager_id: profile?.id || null,
          inativo_em: null
        })
      }
      alert('Importação concluída!')
    }
    reader.readAsBinaryString(file)
  }

  const renderTable = (list: Client[], title: string) => (
    <div className="space-y-4">
      <h2 className="text-white font-semibold text-lg flex items-center gap-2">
        {title}
        <span className="text-xs font-normal text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full">
          {list.length}
        </span>
      </h2>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#1f1f1f]/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente / Empresa</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Financeiro</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                {title.includes('Inativo') && (
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Inativado em</th>
                )}
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={title.includes('Inativo') ? 6 : 5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    Nenhum cliente encontrado nesta seção.
                  </td>
                </tr>
              ) : (
                list.map((client) => (
                  <tr key={client.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm">{client.name}</span>
                        <span className="text-gray-500 text-xs">{client.company || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-300 text-sm">{client.email || '—'}</span>
                        <span className="text-gray-500 text-xs">{client.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white text-sm">
                          {client.monthly_fee ? `R$ ${client.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                        <span className="text-gray-500 text-xs">Dia {client.payment_day || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${statusConfig[client.status].className}`}>
                          {statusConfig[client.status].label}
                        </span>
                        {client.status === 'atrasado' && client.dias_atraso && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                            <Clock size={10} /> {client.dias_atraso} dias
                          </span>
                        )}
                      </div>
                    </td>
                    {title.includes('Inativo') && (
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {client.inativo_em ? new Date(client.inativo_em).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setClienteEditando(client)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setClienteExcluindo(client)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Excluir">
                          <Trash2 size={16} />
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

  if (loading && clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-gray-400 text-sm">Carregando clientes...</p>
      </div>
    )
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

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold">Gestão de Clientes</h1>
            <p className="text-gray-400 text-sm mt-1">
              Gerencie seus clientes ativos, atrasados e o histórico de inativos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={importFromExcel} accept=".xlsx,.xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-gray-700 rounded-xl text-gray-300 text-sm font-medium transition-colors">
              <Upload size={16} />
              Importar
            </button>
            <button onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-gray-700 rounded-xl text-gray-300 text-sm font-medium transition-colors">
              <Download size={16} />
              Exportar
            </button>
            <button onClick={() => setModalNovo(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
              <UserPlus size={16} />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Buscar por nome, empresa ou e-mail..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner" />
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-10">
          {renderTable(filteredActive, 'Clientes Ativos e Atrasados')}
          {renderTable(filteredInactive, 'Clientes Inativos')}
        </div>
      </div>
    </>
  )
}
