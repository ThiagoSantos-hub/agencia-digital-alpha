'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

interface ContractTemplate {
  type: 'completo' | 'crm' | 'trafego'
  label: string
  currency: 'BRL' | 'USD'
  setup_fee: number
  monthly_fee: number
  extra_config: Record<string, number>
}

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm focus:outline-none focus:border-primary/50 transition-colors'
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1'

const extraFieldLabels: Record<string, string> = {
  monthly_trafego: 'Mensal — Tráfego Pago',
  monthly_crm: 'Mensal — CRM',
  funis_max: 'Funis de vendas (máx.)',
  automacoes_max: 'Automações (máx.)',
  prazo_implantacao_dias: 'Prazo de implantação (dias úteis)',
  prazo_meses: 'Duração do contrato (meses)',
  treinamento_h_mes1: 'Treinamento — horas/semana (1º mês)',
  treinamento_h_apartir_mes2: 'Treinamento — horas/semana (a partir do 2º mês)',
  prazo_dias: 'Prazo do plano (dias)',
  parcelamento_max_cartao: 'Parcelamento máximo no cartão (x)',
}

function TemplateCard({ template, onSaved }: { template: ContractTemplate; onSaved: () => void }) {
  const [form, setForm] = useState(template)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const setField = (field: keyof ContractTemplate, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const setExtra = (key: string, value: number) =>
    setForm((prev) => ({ ...prev, extra_config: { ...prev.extra_config, [key]: value } }))

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/contract-templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.type,
        setup_fee: form.setup_fee,
        monthly_fee: form.monthly_fee,
        currency: form.currency,
        extra_config: form.extra_config,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <Card padding="md" animate={false}>
      <CardHeader title={template.label} description={`Tipo: ${template.type}`} />

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Moeda</label>
            <select className={inputCls} value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD (US$)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{form.type === 'trafego' ? 'Valor do plano' : 'Setup (implementação)'}</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.setup_fee} onChange={(e) => setField('setup_fee', parseFloat(e.target.value) || 0)} />
          </div>
          {form.type !== 'trafego' && (
            <div>
              <label className={labelCls}>Mensalidade total</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.monthly_fee} onChange={(e) => setField('monthly_fee', parseFloat(e.target.value) || 0)} />
            </div>
          )}
        </div>

        {Object.keys(form.extra_config).length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            {Object.entries(form.extra_config).map(([key, value]) => (
              <div key={key}>
                <label className={labelCls}>{extraFieldLabels[key] ?? key}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputCls}
                  value={value}
                  onChange={(e) => setExtra(key, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} icon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-cta text-sm font-medium">
              <CheckCircle2 size={15} /> Salvo
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ModelosDeContratoPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = async () => {
    setLoading(true)
    const res = await fetch('/api/contract-templates')
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  return (
    <div className="space-y-8 pb-20">
      <div>
        <Link href="/contratos" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-main text-sm mb-2">
          <ArrowLeft size={14} /> Voltar para Contratos
        </Link>
        <h1 className="text-text-main text-2xl font-bold">Modelos de Contrato</h1>
        <p className="text-text-muted text-sm mt-1">
          O texto das cláusulas é fixo — aqui você ajusta apenas valores, moeda e os números de escopo de cada modelo.
          Contratos já gerados não são afetados por mudanças aqui (cada um guarda seu próprio snapshot de valores).
        </p>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Carregando...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.type} template={t} onSaved={fetchTemplates} />
          ))}
        </div>
      )}
    </div>
  )
}
