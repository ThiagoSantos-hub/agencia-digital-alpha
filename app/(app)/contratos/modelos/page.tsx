'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Plus, Copy, Trash2, Loader2, FileText, Sparkles, Link2, Check } from 'lucide-react'

interface Template {
  id: string
  name: string
  slug: string
  currency: 'BRL' | 'USD'
  active: boolean
  is_gallery_template: boolean
  created_at: string
}

interface GalleryTemplate extends Template {
  clause_count: number
}

export default function ModelosDeContratoPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [gallery, setGallery] = useState<GalleryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creatingBlank, setCreatingBlank] = useState(false)
  const [companySlug, setCompanySlug] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    const res = await fetch('/api/contract-templates')
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  const fetchCompanySlug = async () => {
    const res = await fetch('/api/company')
    if (res.ok) {
      const data = await res.json()
      setCompanySlug(data.slug ?? '')
    }
  }

  const handleCopyLink = (templateSlug: string, templateId: string) => {
    const url = `${window.location.origin}/propostas/${companySlug}/${templateSlug}`
    navigator.clipboard.writeText(url)
    setCopiedId(templateId)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const fetchGallery = async () => {
    const res = await fetch('/api/contract-templates/gallery')
    if (res.ok) setGallery(await res.json())
  }

  useEffect(() => { fetchAll(); fetchCompanySlug() }, [])

  const handleOpenGallery = async () => {
    setGalleryOpen(true)
    if (gallery.length === 0) await fetchGallery()
  }

  const handleUseTemplate = async (id: string) => {
    setBusyId(id)
    const res = await fetch(`/api/contract-templates/${id}/duplicate`, { method: 'POST' })
    const data = await res.json()
    setBusyId(null)
    if (res.ok) router.push(`/contratos/modelos/${data.id}`)
  }

  const handleStartBlank = async () => {
    setCreatingBlank(true)
    const res = await fetch('/api/contract-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Novo modelo', currency: 'BRL' }),
    })
    const data = await res.json()
    setCreatingBlank(false)
    if (res.ok) router.push(`/contratos/modelos/${data.id}`)
  }

  const handleDuplicateOwn = async (id: string) => {
    setBusyId(id)
    const res = await fetch(`/api/contract-templates/${id}/duplicate`, { method: 'POST' })
    setBusyId(null)
    if (res.ok) fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este modelo? Contratos já gerados a partir dele não são afetados.')) return
    setBusyId(id)
    await fetch(`/api/contract-templates/${id}`, { method: 'DELETE' })
    setBusyId(null)
    fetchAll()
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-main text-2xl font-bold">Modelos de Contrato</h1>
          <p className="text-text-muted text-sm mt-1">Crie e edite os contratos que você usa com seus clientes.</p>
        </div>
        <Button onClick={handleOpenGallery} icon={<Plus size={16} />}>Novo modelo</Button>
      </div>

      <Card padding="sm" animate={false}>
        <CardHeader title="Seus modelos" description={`${templates.length} modelo(s)`} />
        {loading ? (
          <p className="text-text-muted text-sm p-3">Carregando...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-10">
            <FileText size={28} className="text-text-disabled mx-auto mb-2" />
            <p className="text-text-muted text-sm">Você ainda não tem nenhum modelo. Clique em "Novo modelo" para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 px-1">
                <button onClick={() => router.push(`/contratos/modelos/${t.id}`)} className="text-left flex-1">
                  <p className="text-text-main text-sm font-semibold">{t.name}</p>
                  <p className="text-text-muted text-xs">{t.currency} · {t.active ? 'Ativo' : 'Inativo'} · /{t.slug}</p>
                </button>
                <div className="flex items-center gap-1.5">
                  {t.active && (
                    <button
                      onClick={() => handleCopyLink(t.slug, t.id)}
                      title="Copiar link pro cliente preencher"
                      className="p-2 text-text-muted hover:text-primary hover:bg-hover-bg rounded-xl"
                    >
                      {copiedId === t.id ? <Check size={15} className="text-cta" /> : <Link2 size={15} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicateOwn(t.id)}
                    disabled={busyId === t.id}
                    title="Duplicar"
                    className="p-2 text-text-muted hover:text-primary hover:bg-hover-bg rounded-xl disabled:opacity-50"
                  >
                    {busyId === t.id ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={busyId === t.id}
                    title="Excluir"
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={galleryOpen} onClose={() => setGalleryOpen(false)} title="Novo modelo de contrato" description="Comece de um exemplo pronto e adapte, ou comece do zero." size="lg">
        <div className="space-y-4">
          <button
            onClick={handleStartBlank}
            disabled={creatingBlank}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-hover-bg transition-colors text-left disabled:opacity-50"
          >
            {creatingBlank ? <Loader2 size={18} className="animate-spin text-primary" /> : <Plus size={18} className="text-primary" />}
            <div>
              <p className="text-text-main text-sm font-semibold">Começar do zero</p>
              <p className="text-text-muted text-xs">Um modelo vazio, você monta do seu jeito.</p>
            </div>
          </button>

          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-text-disabled mb-2">
              <Sparkles size={12} /> Exemplos prontos
            </p>
            <div className="space-y-2">
              {gallery.length === 0 ? (
                <p className="text-text-muted text-sm">Carregando exemplos...</p>
              ) : (
                gallery.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                    <div>
                      <p className="text-text-main text-sm font-semibold">{g.name}</p>
                      <p className="text-text-muted text-xs">{g.clause_count} cláusulas · {g.currency}</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleUseTemplate(g.id)}
                      disabled={busyId === g.id}
                      icon={busyId === g.id ? <Loader2 size={14} className="animate-spin" /> : undefined}
                    >
                      {busyId === g.id ? 'Copiando...' : 'Usar este modelo'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
