'use client'

import { useState } from 'react'
import { useCampanhas, Campaign } from '@/hooks/useCampanhas'
import { useClientes } from '@/hooks/useClientes'
import { Search, Megaphone, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react'

type CampanhaForm = {
  client_id: string
  name: string
  status: Campaign['status']
  channel: Campaign['channel']
}

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'       },
  finalizada: { label: 'Finalizada', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'          },
  rascunho:   { label: 'Rascunho',   className: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          },
}

const channelConfig = {
  meta_ads:   { label: 'Meta Ads'    },
  google_ads: { label: 'Google Ads'  },
  organico:   { label: 'Orgânico'    },
  outro:      { label: 'Outro'       },
}

function FormFields({
  form,
  set,
  clientes,
}: {
  form: CampanhaForm
  set: (f: keyof CampanhaForm, v: string) => void
  clientes: { id: string; name: string; company: string | null }[]
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Cliente <span className="text-red-400">*</span></label>
        <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors">
          <option value="">Selecione um cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.company ? ` — ${c.company}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Nome da campanha <span className="text-red-400">*</span></label>
        <input type="text" placeholder="Ex: Black Friday 2026" value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-400">Canal</label>
          <select value={form.channel} onChange={(e) => set('channel', e.target.value as Campaign['channel'])}
            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors">
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="organico">Orgânico</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-400">Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value as Campaign['status'])}
            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors">
            <option value="rascunho">Rascunho</option>
            <option value="ativa">Ativa</option>
            <option value="pausada">Pausada</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function ModalNovaCampanha({ onClose }: { onClose: () => void }) {
  const { createCampanha } = useCampanhas()
  const { clients } = useClientes()

  const [form, setForm] = useState<CampanhaForm>({
    client_id: '', name: '', status: 'rascunho', channel: 'meta_ads',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof CampanhaForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.client_id) { setError('Selecione um cliente.'); return }
    if (!form.name.trim()) { setError('O nome da campanha é obrigatório.'); return }
    setLoading(true)
    setError(null)
    const { error } = await createCampanha({
      client_id: form.client_id,
      name:      form.name.trim(),
      status:    form.status,
      channel:   form.channel,
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Nova Campanha</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <FormFields form={form} set={set} clientes={clients} />

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
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalEditarCampanha({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { updateCampanha } = useCampanhas()
  const { clients } = useClientes()

  const [form, setForm] = useState<CampanhaForm>({
    client_id: campaign.client_id,
    name:      campaign.name,
    status:    campaign.status,
    channel:   campaign.channel,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof CampanhaForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.client_id) { setError('Selecione um cliente.'); return }
    if (!form.name.trim()) { setError('O nome da campanha é obrigatório.'); return }
    setLoading(true)
    setError(null)
    const { error } = await updateCampanha(campaign.id, {
      client_id: form.client_id,
      name:      form.name.trim(),
      status:    form.status,
      channel:   form.channel,
    })
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Editar Campanha</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <FormFields form={form} set={set} clientes={clients} />

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

function ModalConfirmarExclusao({ campaign, onClose, onConfirm }: { campaign: Campaign; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Excluir Campanha</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-gray-400 text-sm">
          Tem certeza que deseja excluir <span className="text-white font-medium">{campaign.name}</span>? Esta ação não pode ser desfeita.
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

export default function CampanhasPage() {
  const { campaigns, loading, error, deleteCampanha } = useCampanhas()
  const { clients } = useClientes()
  const [search, setSearch] = useState('')
  const [modalNova, setModalNova] = useState(false)
  const [campanhaEditando, setCampanhaEditando] = useState<Campaign | null>(null)
  const [campanhaExcluindo, setCampanhaExcluindo] = useState<Campaign | null>(null)

  const clienteNome = (clientId: string) => {
    const c = clients.find((c) => c.id === clientId)
    return c ? (c.company ? `${c.name} — ${c.company}` : c.name) : '—'
  }

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    clienteNome(c.client_id).toLowerCase().includes(search.toLowerCase())
  )

  const handleExcluir = async () => {
    if (!campanhaExcluindo) return
    await deleteCampanha(campanhaExcluindo.id)
    setCampanhaExcluindo(null)
  }

  return (
    <>
      {modalNova && <ModalNovaCampanha onClose={() => setModalNova(false)} />}
      {campanhaEditando && <ModalEditarCampanha campaign={campanhaEditando} onClose={() => setCampanhaEditando(null)} />}
      {campanhaExcluindo && (
        <ModalConfirmarExclusao
          campaign={campanhaExcluindo}
          onClose={() => setCampanhaExcluindo(null)}
          onConfirm={handleExcluir}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Campanhas</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {campaigns.length} {campaigns.length === 1 ? 'campanha cadastrada' : 'campanhas cadastradas'}
            </p>
          </div>
          <button onClick={() => setModalNova(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-medium transition-colors">
            <Plus size={16} />
            Nova Campanha
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Carregando campanhas...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-sm">Erro ao carregar campanhas: {error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Megaphone size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {campaigns.length === 0 ? 'Nenhuma campanha cadastrada ainda.' : 'Nenhuma campanha encontrada.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-left">
                  <th className="px-5 py-3 text-gray-500 font-medium">Campanha</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Cliente</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Canal</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="px-5 py-3 text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => {
                  const statusInfo = statusConfig[campaign.status]
                  const channelInfo = channelConfig[campaign.channel]
                  return (
                    <tr key={campaign.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-white font-medium">{campaign.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {clienteNome(campaign.client_id)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {channelInfo.label}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setCampanhaEditando(campaign)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setCampanhaExcluindo(campaign)}
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
