'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, CheckCircle2, FileSignature, AlertCircle } from 'lucide-react'
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from '@/lib/validators'

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const inputCls = 'w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
const labelCls = 'block text-sm font-medium text-text-main mb-1.5'

interface TemplateField {
  field_key: string
  label: string
  field_type: 'text' | 'number' | 'email' | 'phone' | 'cpf' | 'cnpj' | 'cep' | 'select' | 'date'
  required: boolean
  options: Array<{ value: string; label: string }> | null
  display_order: number
}

interface PricingItem { label: string; amount: number; frequency: 'unico' | 'mensal' | 'semanal' }

interface PublicTemplateData {
  companyName: string
  template: { id: string; name: string; currency: 'BRL' | 'USD' }
  fields: TemplateField[]
  clauseTitles: string[]
  pricingItems: PricingItem[]
}

function maskForType(type: TemplateField['field_type'], value: string): string {
  switch (type) {
    case 'cpf': return maskCPF(value)
    case 'cnpj': return maskCNPJ(value)
    case 'cep': return maskCEP(value)
    case 'phone': return maskPhone(value)
    default: return value
  }
}

function fmtMoney(value: number, currency: 'BRL' | 'USD'): string {
  return currency === 'USD' ? `US$ ${value.toFixed(2)}` : `R$ ${value.toFixed(2).replace('.', ',')}`
}

export default function PropostaPublicaPage() {
  const params = useParams<{ companySlug: string; templateSlug: string }>()
  const [data, setData] = useState<PublicTemplateData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [aceite, setAceite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(`/api/public/contract-templates/${params.companySlug}/${params.templateSlug}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) { setLoadError(json.error || 'Proposta não encontrada.'); return }
        setData(json)
      })
      .catch(() => setLoadError('Erro ao carregar a proposta.'))
  }, [params.companySlug, params.templateSlug])

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return

    for (const field of data.fields) {
      if (field.required && !form[field.field_key]?.trim()) {
        setError(`${field.label} é obrigatório.`)
        return
      }
    }
    if (!aceite) {
      setError('É necessário aceitar os termos do contrato para continuar.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: data.template.id, fieldValues: form }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erro ao enviar. Tente novamente.'); setLoading(false); return }
      setSuccess(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 text-center shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-text-main font-medium">{loadError}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="text-cta mx-auto mb-4" />
          <h1 className="text-text-main text-xl font-bold mb-2">Recebemos seus dados!</h1>
          <p className="text-text-muted text-sm">Verifique seu e-mail ou WhatsApp para assinar o contrato.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <FileSignature size={32} className="text-primary mb-2" />
            <h1 className="text-text-main text-xl font-bold">{data.template.name}</h1>
            <p className="text-text-muted text-sm mt-1">{data.companyName}, preencha seus dados para gerar seu contrato.</p>
          </div>

          {data.pricingItems.length > 0 && (
            <div className="bg-background border border-border rounded-xl p-4 mb-5 space-y-1.5">
              {data.pricingItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{item.label}</span>
                  <span className="text-text-main font-medium">
                    {fmtMoney(item.amount, data.template.currency)}{item.frequency === 'mensal' ? '/mês' : item.frequency === 'semanal' ? '/semana' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {data.fields.map((field) => (
              <div key={field.field_key}>
                <label className={labelCls}>{field.label}{field.required && <span className="text-red-500"> *</span>}</label>
                {field.field_type === 'select' ? (
                  <select className={inputCls} value={form[field.field_key] ?? ''} onChange={(e) => setField(field.field_key, e.target.value)}>
                    <option value="">--</option>
                    {(field.options ?? []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : field.field_key === 'estado' ? (
                  <select className={inputCls} value={form[field.field_key] ?? ''} onChange={(e) => setField(field.field_key, e.target.value)}>
                    <option value="">--</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.field_type === 'email' ? 'email' : field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                    className={inputCls}
                    value={form[field.field_key] ?? ''}
                    onChange={(e) => setField(field.field_key, maskForType(field.field_type, e.target.value))}
                  />
                )}
              </div>
            ))}

            {data.clauseTitles.length > 0 && (
              <div className="bg-background border border-border rounded-xl p-4">
                <p className="text-text-main text-xs font-semibold mb-2">Este contrato inclui as seguintes cláusulas:</p>
                <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {data.clauseTitles.map((title, i) => (
                    <li key={i} className="text-text-muted text-xs">{title}</li>
                  ))}
                </ul>
              </div>
            )}

            <label className="flex items-start gap-2.5 text-sm text-text-muted pt-2">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5" />
              Li e concordo com os termos do contrato de prestação de serviços.
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Gerando contrato...</> : 'Gerar e assinar contrato'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
