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
  start_date: string
  end_date: string
  budget: string
}

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'       },
  finalizada: { label: 'Finalizada', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'          },
  rascunho:   { label: 'Rascunho',   className: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          },
}

const channelConfig = {
  meta_ads:   { label: 'Meta Ads'   },
  google_ads: { label: 'Google Ads' },
  organico:   { label: 'Orgânico'   },
  outro:      { label: 'Outro'      },
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-400">Data de início</label>
          <input type="date" value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-400">Data de fim</label>
          <input type="date" value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400">Orçamento (R$)</label>
        <input type="number" placeholder="0,00" min="0" step="0.01" value={form.budget}
          onChange={(e) => set('budget', e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      </div>
    </div>
  )
}

function ModalNovaCampanha({ onClose }: { onClose: () => void }) {
  const { createCampanha } = useCampanhas()
  const { clients } = useClientes()

  const [form, setForm] = useState<CampanhaForm>({
    client_id: '', name: '', status: 'rascunho', channel: 'meta_ads',
    start_date: '', end_date: '', budget: '',
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
      client_id:  form.client_id,
      name:       form.name.trim(),
      status:     form.status,
      channel:    form.channel,
      start_date: form.start_date || null,
      end_date:   form.end_date || null,
      budget:     form.budget ? parseFloat(form.budget.replace(',', '.')) : null,
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
          <h2 className="text-white font-semibold text-base">Nova Campanha</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1
