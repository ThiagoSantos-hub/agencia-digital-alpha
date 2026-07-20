'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loader2, Building2, ExternalLink } from 'lucide-react'

interface Company {
  id: string
  name: string
  slug: string
  is_platform_owner: boolean
  active: boolean
  created_at: string
  meta_tester_profile: string | null
  meta_tester_added: boolean
}

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
  const [form, setForm] = useState({ companyName: '', companySlug: '', adminName: '', adminEmail: '', adminPassword: '', metaTesterProfile: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchCompanies = async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/companies')
    if (res.ok) setCompanies(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'companyName' ? { companySlug: slugify(value) } : {}),
    }))

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
    setForm({ companyName: '', companySlug: '', adminName: '', adminEmail: '', adminPassword: '', metaTesterProfile: '' })
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
          <div className="divide-y divide-border">
            {companies.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 px-1 gap-3">
                <div className="min-w-0">
                  <p className="text-text-main text-sm font-medium">{c.name} {c.is_platform_owner && <span className="text-[10px] text-primary">(plataforma)</span>}</p>
                  <p className="text-text-muted text-xs">/{c.slug}</p>
                  {c.meta_tester_profile && (
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1 truncate">
                      <ExternalLink size={11} className="shrink-0" /> {c.meta_tester_profile}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!c.is_platform_owner && c.meta_tester_profile && (
                    <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.meta_tester_added}
                        onChange={() => toggleTesterAdded(c.id, c.meta_tester_added)}
                      />
                      Testador Meta adicionado
                    </label>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${c.active ? 'text-cta bg-cta/10 border-cta/30' : 'text-text-disabled bg-slate-100 border-slate-200'}`}>
                    {c.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
