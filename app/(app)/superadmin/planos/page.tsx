'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loader2, Layers, Pencil, Power, Trash2, X, AlertTriangle } from 'lucide-react'
import { FEATURES, FEATURE_GROUPS } from '@/lib/features'

interface PlanRow {
  id: string
  name: string
  price_brl: number
  client_limit: number | null
  monthly_reports_limit: number | null
  monthly_alerts_limit: number | null
  stripe_price_id: string | null
  is_free: boolean
  active: boolean
  display_order: number
  features: Record<string, boolean>
  description: string | null
}

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm focus:outline-none focus:border-primary/50 transition-colors'
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1'

interface LimitFieldProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}

function LimitField({ label, value, onChange }: LimitFieldProps) {
  const unlimited = value === null
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={inputCls}
          value={unlimited ? '' : value}
          disabled={unlimited}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={unlimited ? 'Ilimitado' : '0'}
        />
        <label className="flex items-center gap-1 text-[11px] text-text-muted whitespace-nowrap cursor-pointer">
          <input type="checkbox" checked={unlimited} onChange={(e) => onChange(e.target.checked ? null : 0)} />
          Ilimitado
        </label>
      </div>
    </div>
  )
}

const emptyForm = {
  name: '',
  priceBrl: 0,
  clientLimit: null as number | null,
  monthlyReportsLimit: null as number | null,
  monthlyAlertsLimit: null as number | null,
  stripePriceId: '',
  isFree: false,
  displayOrder: 0,
  description: '',
}

export default function SuperAdminPlanosPage() {
  const { profile, loading: authLoading } = useAuth()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editPlan, setEditPlan] = useState<PlanRow | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<PlanRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPlans = async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/plans')
    if (res.ok) setPlans(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    const res = await fetch('/api/superadmin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setError(data.error || 'Erro ao criar plano.'); return }
    setForm(emptyForm)
    fetchPlans()
  }

  const openEdit = (p: PlanRow) => {
    setEditError(null)
    setEditForm({
      name: p.name,
      priceBrl: p.price_brl,
      clientLimit: p.client_limit,
      monthlyReportsLimit: p.monthly_reports_limit,
      monthlyAlertsLimit: p.monthly_alerts_limit,
      stripePriceId: p.stripe_price_id ?? '',
      isFree: p.is_free,
      displayOrder: p.display_order,
      description: p.description ?? '',
    })
    setEditFeatures(p.features ?? {})
    setEditPlan(p)
  }

  const handleSaveEdit = async () => {
    if (!editPlan) return
    setSavingEdit(true)
    setEditError(null)
    const res = await fetch('/api/superadmin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editPlan.id,
        name: editForm.name,
        priceBrl: editForm.priceBrl,
        clientLimit: editForm.clientLimit,
        monthlyReportsLimit: editForm.monthlyReportsLimit,
        monthlyAlertsLimit: editForm.monthlyAlertsLimit,
        stripePriceId: editForm.stripePriceId,
        isFree: editForm.isFree,
        displayOrder: editForm.displayOrder,
        features: editFeatures,
        description: editForm.description,
      }),
    })
    setSavingEdit(false)
    if (!res.ok) {
      const data = await res.json()
      setEditError(data.error || 'Erro ao salvar.')
      return
    }
    setEditPlan(null)
    fetchPlans()
  }

  const toggleActive = async (p: PlanRow) => {
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)))
    await fetch('/api/superadmin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    })
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/superadmin/plans?id=${confirmDelete.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const data = await res.json()
      setDeleteError(data.error || 'Erro ao excluir plano.')
      return
    }
    setConfirmDelete(null)
    fetchPlans()
  }

  if (authLoading) return null
  if (!profile?.is_super_admin) return <p className="text-text-muted text-sm">Acesso restrito.</p>

  const limitTexto = (v: number | null) => (v === null ? 'Ilimitado' : String(v))

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Planos</h1>
        <p className="text-text-muted text-sm mt-1">Controle nome, preço, limites e funcionalidades de cada plano.</p>
      </div>

      <Card padding="md" animate={false}>
        <CardHeader title="Novo plano" description="Cria um plano novo pra oferecer no cadastro." />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nome do plano</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pro" />
            </div>
            <div>
              <label className={labelCls}>Preço mensal (R$)</label>
              <input type="number" className={inputCls} value={form.priceBrl} onChange={(e) => setForm({ ...form, priceBrl: Number(e.target.value) })} disabled={form.isFree} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <LimitField label="Limite de clientes" value={form.clientLimit} onChange={(v) => setForm({ ...form, clientLimit: v })} />
            <LimitField label="Relatórios/mês" value={form.monthlyReportsLimit} onChange={(v) => setForm({ ...form, monthlyReportsLimit: v })} />
            <LimitField label="Alertas/mês" value={form.monthlyAlertsLimit} onChange={(v) => setForm({ ...form, monthlyAlertsLimit: v })} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFree"
              checked={form.isFree}
              onChange={(e) => setForm({ ...form, isFree: e.target.checked, priceBrl: e.target.checked ? 0 : form.priceBrl })}
            />
            <label htmlFor="isFree" className="text-sm text-text-main">Plano gratuito (sem cartão, sem Stripe)</label>
          </div>

          {!form.isFree && (
            <div>
              <label className={labelCls}>Stripe Price ID</label>
              <input className={inputCls} value={form.stripePriceId} onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })} placeholder="price_..." />
              <p className="text-[11px] text-text-muted mt-1">Se mudar o preço aqui, crie um novo Price no Stripe e cole o ID novo — o Stripe não deixa editar preço de um Price existente.</p>
            </div>
          )}

          <div>
            <label className={labelCls}>Ordem de exibição</label>
            <input type="number" className={inputCls} value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
          </div>

          <div>
            <label className={labelCls}>Descrição (benefícios / problema que resolve)</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Ideal pra quem está começando e quer testar sem compromisso — gerencia seus primeiros clientes sem gastar nada."
            />
            <p className="text-[11px] text-text-muted mt-1">Aparece na tela pública /assinar, embaixo do preço do plano.</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}

          <Button onClick={handleCreate} disabled={creating || !form.name} icon={creating ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}>
            {creating ? 'Criando...' : 'Criar plano'}
          </Button>
        </div>
      </Card>

      <Card padding="sm" animate={false}>
        <CardHeader title="Planos cadastrados" description={`${plans.length} plano(s)`} />
        {loading ? (
          <p className="text-text-muted text-sm p-3">Carregando...</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Nome</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Preço</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Clientes</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Relatórios/mês</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Alertas/mês</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Status</th>
                  <th className="text-right font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-hover-bg transition-colors">
                    <td className="py-3 px-3 align-top">
                      <p className="text-text-main font-medium">{p.name}</p>
                      <p className="text-text-muted text-xs mt-0.5 font-mono">{p.id}</p>
                    </td>
                    <td className="py-3 px-3 align-top text-text-main">{p.is_free ? 'Grátis' : `R$ ${p.price_brl.toFixed(2).replace('.', ',')}`}</td>
                    <td className="py-3 px-3 align-top text-text-main">{limitTexto(p.client_limit)}</td>
                    <td className="py-3 px-3 align-top text-text-main">{limitTexto(p.monthly_reports_limit)}</td>
                    <td className="py-3 px-3 align-top text-text-main">{limitTexto(p.monthly_alerts_limit)}</td>
                    <td className="py-3 px-3 align-top">
                      <span className={`text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${p.active ? 'text-cta bg-cta/10 border-cta/30' : 'text-text-disabled bg-slate-100 border-slate-200'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(p)} title="Editar" className="p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          title={p.active ? 'Desativar plano' : 'Reativar plano'}
                          className={`p-1.5 rounded-lg border transition-colors ${p.active ? 'border-border text-text-muted hover:text-red-600 hover:border-red-200' : 'border-cta/30 text-cta hover:bg-cta/10'}`}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(p); setDeleteError(null) }}
                          title="Excluir plano"
                          className="p-1.5 rounded-lg border border-border text-text-muted hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editPlan && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setEditPlan(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-text-main">Editar plano</h2>
                  <p className="text-xs text-text-muted font-mono">identificador interno: {editPlan.id} (não muda)</p>
                </div>
                <button onClick={() => setEditPlan(null)} className="p-1 hover:bg-hover-bg rounded-lg text-text-muted"><X size={18} /></button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nome do plano</label>
                    <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Preço mensal (R$)</label>
                    <input type="number" className={inputCls} value={editForm.priceBrl} onChange={(e) => setEditForm({ ...editForm, priceBrl: Number(e.target.value) })} disabled={editForm.isFree} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <LimitField label="Limite de clientes" value={editForm.clientLimit} onChange={(v) => setEditForm({ ...editForm, clientLimit: v })} />
                  <LimitField label="Relatórios/mês" value={editForm.monthlyReportsLimit} onChange={(v) => setEditForm({ ...editForm, monthlyReportsLimit: v })} />
                  <LimitField label="Alertas/mês" value={editForm.monthlyAlertsLimit} onChange={(v) => setEditForm({ ...editForm, monthlyAlertsLimit: v })} />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsFree"
                    checked={editForm.isFree}
                    onChange={(e) => setEditForm({ ...editForm, isFree: e.target.checked, priceBrl: e.target.checked ? 0 : editForm.priceBrl })}
                  />
                  <label htmlFor="editIsFree" className="text-sm text-text-main">Plano gratuito (sem cartão, sem Stripe)</label>
                </div>

                {!editForm.isFree && (
                  <div>
                    <label className={labelCls}>Stripe Price ID</label>
                    <input className={inputCls} value={editForm.stripePriceId} onChange={(e) => setEditForm({ ...editForm, stripePriceId: e.target.value })} placeholder="price_..." />
                    <p className="text-[11px] text-text-muted mt-1">Se mudar o preço aqui, crie um novo Price no Stripe e cole o ID novo.</p>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Ordem de exibição</label>
                  <input type="number" className={inputCls} value={editForm.displayOrder} onChange={(e) => setEditForm({ ...editForm, displayOrder: Number(e.target.value) })} />
                </div>

                <div>
                  <label className={labelCls}>Descrição (benefícios / problema que resolve)</label>
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Ex: Ideal pra quem está começando e quer testar sem compromisso — gerencia seus primeiros clientes sem gastar nada."
                  />
                  <p className="text-[11px] text-text-muted mt-1">Aparece na tela pública /assinar, embaixo do preço do plano.</p>
                </div>

                <div className="border-t border-border pt-3 mt-1">
                  <p className="text-sm font-semibold text-text-main mb-2">Funcionalidades liberadas neste plano</p>
                  <p className="text-[11px] text-text-muted mb-3">Desmarque o que deve aparecer com cadeado pra quem está nesse plano. Nada some da tela, só fica bloqueado até o upgrade.</p>
                  <div className="space-y-3">
                    {FEATURE_GROUPS.map((group) => (
                      <div key={group}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-1.5">{group}</p>
                        <div className="space-y-1.5">
                          {FEATURES.filter((f) => f.group === group).map((f) => {
                            const liberado = editFeatures[f.key] !== false
                            return (
                              <label key={f.key} className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={liberado}
                                  onChange={(e) => setEditFeatures({ ...editFeatures, [f.key]: e.target.checked })}
                                />
                                {f.label}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {editError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{editError}</div>}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditPlan(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-medium disabled:opacity-50">
                    {savingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setConfirmDelete(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-red-200 rounded-xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={20} className="text-red-600" />
                <h2 className="text-lg font-bold text-text-main">Excluir plano?</h2>
              </div>
              <p className="text-sm text-text-muted mb-4">
                Só é possível excluir o plano <strong className="text-text-main">"{confirmDelete.name}"</strong> se nenhuma empresa estiver nele. Se ele já foi usado, desative em vez de excluir.
              </p>
              {deleteError && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{deleteError}</div>}
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium disabled:opacity-50">
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
