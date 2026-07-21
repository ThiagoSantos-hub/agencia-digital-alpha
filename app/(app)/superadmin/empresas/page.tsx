'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loader2, Building2, ExternalLink, Eye, Pencil, Power, X } from 'lucide-react'
import { PLAN_LABELS, type Plan } from '@/lib/planLimits'

interface Company {
  id: string
  name: string
  slug: string
  is_platform_owner: boolean
  active: boolean
  created_at: string
  meta_tester_profile: string | null
  meta_tester_added: boolean
  client_count: number
  user_count: number
  admin_emails: string[]
  phone: string | null
  plan: Plan | null
  payment_method: 'card' | 'pix' | null
  subscription_status: string | null
  access_expires_at: string | null
}

const PLAN_OPTIONS: { value: Plan | ''; label: string }[] = [
  { value: '', label: 'Sem plano' },
  { value: 'basico', label: PLAN_LABELS.basico },
  { value: 'pro', label: PLAN_LABELS.pro },
  { value: 'premium', label: PLAN_LABELS.premium },
]

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm focus:outline-none focus:border-primary/50 transition-colors'
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function SuperAdminEmpresasPage() {
  const { profile, loading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ companyName: '', companySlug: '', adminName: '', adminEmail: '', adminPassword: '', metaTesterProfile: '', plan: '' as Plan | '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewCompany, setViewCompany] = useState<Company | null>(null)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', metaTesterProfile: '', plan: '' as Plan | '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const fetchCompanies = async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/companies')
    if (res.ok) setCompanies(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  const set = (field: Exclude<keyof typeof form, 'plan'>, value: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'companyName' ? { companySlug: slugify(value) } : {}),
    }))
  const setPlan = (value: Plan | '') => setForm((prev) => ({ ...prev, plan: value }))

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    setSuccess(null)
    const res = await fetch('/api/superadmin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setError(data.error || 'Erro ao criar empresa.'); return }
    setSuccess(`Empresa "${form.companyName}" criada com sucesso.`)
    setForm({ companyName: '', companySlug: '', adminName: '', adminEmail: '', adminPassword: '', metaTesterProfile: '', plan: '' })
    fetchCompanies()
  }

  const toggleTesterAdded = async (companyId: string, current: boolean) => {
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, meta_tester_added: !current } : c)))
    await fetch('/api/superadmin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, metaTesterAdded: !current }),
    })
  }

  const openEdit = (c: Company) => {
    setEditError(null)
    setEditForm({ name: c.name, slug: c.slug, metaTesterProfile: c.meta_tester_profile ?? '', plan: c.plan ?? '' })
    setEditCompany(c)
  }

  const handleSaveEdit = async () => {
    if (!editCompany) return
    setSavingEdit(true)
    setEditError(null)
    const res = await fetch('/api/superadmin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: editCompany.id,
        name: editForm.name,
        slug: editForm.slug,
        metaTesterProfile: editForm.metaTesterProfile,
        plan: editForm.plan,
      }),
    })
    setSavingEdit(false)
    if (!res.ok) {
      const data = await res.json()
      setEditError(data.error || 'Erro ao salvar.')
      return
    }
    setEditCompany(null)
    fetchCompanies()
  }

  const toggleActive = async (c: Company) => {
    const acao = c.active ? 'Desativar' : 'Reativar'
    if (!confirm(`${acao} a empresa "${c.name}"?${c.active ? ' Ninguém dessa empresa vai conseguir fazer login enquanto estiver inativa (dá pra reverter depois).' : ''}`)) return
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)))
    await fetch('/api/superadmin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: c.id, active: !c.active }),
    })
  }

  if (authLoading) return null

  if (!profile?.is_super_admin) {
    return <p className="text-text-muted text-sm">Acesso restrito.</p>
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Empresas</h1>
        <p className="text-text-muted text-sm mt-1">Provisione novas empresas clientes da plataforma.</p>
      </div>

      <Card padding="md" animate={false}>
        <CardHeader title="Nova empresa" description="Cria a empresa e o primeiro usuário admin dela." />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nome da empresa</label>
              <input className={inputCls} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Agência XYZ" />
            </div>
            <div>
              <label className={labelCls}>Slug (URL pública)</label>
              <input className={inputCls} value={form.companySlug} onChange={(e) => set('companySlug', slugify(e.target.value))} placeholder="agencia-xyz" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Nome do admin</label>
              <input className={inputCls} value={form.adminName} onChange={(e) => set('adminName', e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className={labelCls}>E-mail do admin</label>
              <input type="email" className={inputCls} value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} placeholder="admin@agencia.com" />
            </div>
            <div>
              <label className={labelCls}>Senha temporária</label>
              <input className={inputCls} value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Perfil do Facebook do admin (pra Meta Ads)</label>
            <input
              className={inputCls}
              value={form.metaTesterProfile}
              onChange={(e) => set('metaTesterProfile', e.target.value)}
              placeholder="Link ou nome do perfil no Facebook"
            />
          </div>

          <div>
            <label className={labelCls}>Plano</label>
            <select className={inputCls} value={form.plan} onChange={(e) => setPlan(e.target.value as Plan | '')}>
              {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-xs text-text-muted space-y-1">
            <p className="font-medium text-text-main">Antes desse admin conseguir conectar o Meta Ads/Instagram:</p>
            <p>1. Vá em <span className="font-mono">developers.facebook.com</span> → seu App → Funções do app → Testadores</p>
            <p>2. Adicione a pessoa pelo perfil do Facebook informado acima</p>
            <p>3. Ela precisa aceitar o convite em <span className="font-mono">developers.facebook.com/requests</span></p>
            <p>4. Só depois disso o botão "Conectar" em Integrações vai funcionar de verdade pra ela</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}
          {success && <div className="bg-cta/10 border border-cta/20 rounded-lg px-3 py-2 text-cta text-sm">{success}</div>}

          <Button onClick={handleCreate} disabled={creating} icon={creating ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}>
            {creating ? 'Criando...' : 'Criar empresa'}
          </Button>
        </div>
      </Card>

      <Card padding="sm" animate={false}>
        <CardHeader title="Empresas cadastradas" description={`${companies.length} empresa(s)`} />
        {loading ? (
          <p className="text-text-muted text-sm p-3">Carregando...</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[860px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Empresa</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Plano</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Testador Meta</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Status</th>
                  <th className="text-right font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-hover-bg transition-colors">
                    <td className="py-3 px-3 align-top">
                      <p className="text-text-main font-medium flex items-center gap-1.5">
                        {c.name}
                        {c.is_platform_owner && <span className="text-[10px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">plataforma</span>}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">/{c.slug}</p>
                      {c.meta_tester_profile && (
                        <a href={c.meta_tester_profile} target="_blank" rel="noreferrer" className="text-text-muted text-xs mt-1 flex items-center gap-1 hover:text-primary max-w-[220px] truncate">
                          <ExternalLink size={11} className="shrink-0" /> <span className="truncate">{c.meta_tester_profile}</span>
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      {c.plan ? (
                        <>
                          <p className="text-text-main font-medium">{PLAN_LABELS[c.plan]}</p>
                          <p className="text-text-muted text-xs mt-0.5">
                            {c.payment_method === 'pix' ? 'Pix' : c.payment_method === 'card' ? 'Cartão' : ''}
                            {c.subscription_status ? ` · ${c.subscription_status}` : ''}
                          </p>
                        </>
                      ) : (
                        <span className="text-text-muted text-xs">Sem plano</span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      {c.meta_tester_profile ? (
                        <div className="flex flex-col gap-1 items-start">
                          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.meta_tester_added}
                              onChange={() => toggleTesterAdded(c.id, c.meta_tester_added)}
                            />
                            Adicionado
                          </label>
                          {!c.meta_tester_added && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">aguardando</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span className={`text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${c.active ? 'text-cta bg-cta/10 border-cta/30' : 'text-text-disabled bg-slate-100 border-slate-200'}`}>
                        {c.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setViewCompany(c)} title="Ver informações" className="p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-colors">
                          <Pencil size={14} />
                        </button>
                        {!c.is_platform_owner && (
                          <button
                            onClick={() => toggleActive(c)}
                            title={c.active ? 'Desativar empresa' : 'Reativar empresa'}
                            className={`p-1.5 rounded-lg border transition-colors ${c.active ? 'border-border text-text-muted hover:text-red-600 hover:border-red-200' : 'border-cta/30 text-cta hover:bg-cta/10'}`}
                          >
                            <Power size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {viewCompany && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setViewCompany(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-text-main">{viewCompany.name}</h2>
                <button onClick={() => setViewCompany(null)} className="p-1 hover:bg-hover-bg rounded-lg text-text-muted"><X size={18} /></button>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-text-muted">Slug:</span> <span className="text-text-main">/{viewCompany.slug}</span></p>
                <p><span className="text-text-muted">E-mail do admin:</span> <span className="text-text-main">{viewCompany.admin_emails.length > 0 ? viewCompany.admin_emails.join(', ') : '-'}</span></p>
                <p><span className="text-text-muted">Status:</span> <span className="text-text-main">{viewCompany.active ? 'Ativa' : 'Inativa'}</span></p>
                <p><span className="text-text-muted">Criada em:</span> <span className="text-text-main">{new Date(viewCompany.created_at).toLocaleDateString('pt-BR')}</span></p>
                <p><span className="text-text-muted">Clientes cadastrados:</span> <span className="text-text-main">{viewCompany.client_count}</span></p>
                <p><span className="text-text-muted">Usuários (admin/colaboradores):</span> <span className="text-text-main">{viewCompany.user_count}</span></p>
                <p><span className="text-text-muted">Perfil do Facebook:</span> <span className="text-text-main">{viewCompany.meta_tester_profile || '-'}</span></p>
                <p><span className="text-text-muted">Testador Meta adicionado:</span> <span className="text-text-main">{viewCompany.meta_tester_added ? 'Sim' : 'Não'}</span></p>
                <p><span className="text-text-muted">Telefone:</span> <span className="text-text-main">{viewCompany.phone || '-'}</span></p>
                <p><span className="text-text-muted">Plano:</span> <span className="text-text-main">{viewCompany.plan ? PLAN_LABELS[viewCompany.plan] : '-'}</span></p>
                <p><span className="text-text-muted">Pagamento:</span> <span className="text-text-main">{viewCompany.payment_method === 'pix' ? 'Pix' : viewCompany.payment_method === 'card' ? 'Cartão' : '- (cadastro manual)'}</span></p>
                <p><span className="text-text-muted">Status da assinatura:</span> <span className="text-text-main">{viewCompany.subscription_status || '-'}</span></p>
                {viewCompany.payment_method === 'pix' && (
                  <p><span className="text-text-muted">Acesso válido até:</span> <span className="text-text-main">{viewCompany.access_expires_at ? new Date(viewCompany.access_expires_at).toLocaleDateString('pt-BR') : '-'}</span></p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {editCompany && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setEditCompany(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-text-main">Editar empresa</h2>
                <button onClick={() => setEditCompany(null)} className="p-1 hover:bg-hover-bg rounded-lg text-text-muted"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Nome da empresa</label>
                  <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input className={inputCls} value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: slugify(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Perfil do Facebook do admin</label>
                  <input className={inputCls} value={editForm.metaTesterProfile} onChange={(e) => setEditForm({ ...editForm, metaTesterProfile: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Plano</label>
                  <select className={inputCls} value={editForm.plan} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value as Plan | '' })}>
                    {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                {editError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{editError}</div>}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditCompany(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-medium disabled:opacity-50">
                    {savingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
