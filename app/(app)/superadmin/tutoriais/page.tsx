'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Loader2, Pencil } from 'lucide-react'

interface TutorialModule {
  key: string
  label: string
  path_prefix: string
  surface: 'admin' | 'collaborator' | 'superadmin'
  video_url: string | null
}

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm focus:outline-none focus:border-primary/50 transition-colors'

const SURFACE_LABELS: Record<string, string> = {
  admin: 'Admin/Gestor',
  collaborator: 'Colaborador',
  superadmin: 'Superadmin',
}

export default function TutoriaisPage() {
  const { profile, loading: authLoading } = useAuth()
  const [modules, setModules] = useState<TutorialModule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const fetchModules = async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/tutorials')
    if (res.ok) setModules(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchModules() }, [])

  const updateField = (key: string, value: string) => {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, video_url: value } : m)))
  }

  const handleSave = async (m: TutorialModule) => {
    setSavingKey(m.key)
    await fetch('/api/superadmin/tutorials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: m.key, video_url: m.video_url }),
    })
    setSavingKey(null)
  }

  if (authLoading) return null
  if (!profile?.is_super_admin) return <p className="text-text-muted text-sm">Acesso restrito.</p>

  const surfaces: Array<TutorialModule['surface']> = ['admin', 'collaborator', 'superadmin']

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Tutoriais</h1>
        <p className="text-text-muted text-sm mt-1">
          Cole aqui o link do vídeo (YouTube ou Vimeo) de cada tela. O mascote de introdução usa esse link quando a
          pessoa clica em &quot;Assistir vídeo&quot;.
        </p>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Carregando...</p>
      ) : (
        surfaces.map((surface) => {
          const rows = modules.filter((m) => m.surface === surface)
          if (rows.length === 0) return null
          return (
            <Card key={surface} padding="sm" animate={false}>
              <CardHeader title={SURFACE_LABELS[surface]} description={`${rows.length} tela(s)`} />
              <div className="divide-y divide-border">
                {rows.map((m) => (
                  <div key={m.key} className="py-3 flex items-center gap-3">
                    <div className="w-48 shrink-0">
                      <p className="text-text-main text-sm font-medium">{m.label}</p>
                      <p className="text-text-muted text-xs font-mono">{m.path_prefix}</p>
                    </div>
                    <input
                      className={inputCls}
                      placeholder="https://youtu.be/..."
                      value={m.video_url ?? ''}
                      onChange={(e) => updateField(m.key, e.target.value)}
                    />
                    <button
                      onClick={() => handleSave(m)}
                      disabled={savingKey === m.key}
                      className="shrink-0 p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-colors"
                      title="Salvar"
                    >
                      {savingKey === m.key ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
