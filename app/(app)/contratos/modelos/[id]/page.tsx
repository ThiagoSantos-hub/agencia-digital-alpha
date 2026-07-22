'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { substituteTokens } from '@/lib/tokens'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2,
  CheckCircle2, BookOpen, Tag, Eye,
} from 'lucide-react'

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-main text-sm focus:outline-none focus:border-primary/50 transition-colors'
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1'
const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'cep', label: 'CEP' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção (opções)' },
]

interface Field { field_key: string; label: string; field_type: string; required: boolean; options: { value: string; label: string }[] | null }
interface Clause { title: string; body: string }
interface PricingItem { label: string; amount: number; frequency: 'unico' | 'mensal' | 'semanal' }
interface ClauseSnippet { id: string; category: string; title: string; body_example: string }
interface Company { name: string; contract_signer_name: string | null; contract_signer_cpf: string | null; contract_signer_email: string | null; contract_signer_phone: string | null; contract_signer_address: string | null }

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

function ReorderButtons({ index, length, onMove }: { index: number; length: number; onMove: (from: number, to: number) => void }) {
  return (
    <div className="flex flex-col">
      <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} className="text-text-disabled hover:text-text-main disabled:opacity-30"><ChevronUp size={14} /></button>
      <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === length - 1} className="text-text-disabled hover:text-text-main disabled:opacity-30"><ChevronDown size={14} /></button>
    </div>
  )
}

export default function EditorModeloPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL')
  const [active, setActive] = useState(true)
  const [fields, setFields] = useState<Field[]>([])
  const [clauses, setClauses] = useState<Clause[]>([])
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([])
  const [snippets, setSnippets] = useState<ClauseSnippet[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [savingCompany, setSavingCompany] = useState(false)
  const [snippetPickerFor, setSnippetPickerFor] = useState<number | 'new' | null>(null)
  const [fieldPickerFor, setFieldPickerFor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const bodyRefs = useRef<Record<number, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    Promise.all([
      fetch(`/api/contract-templates/${params.id}`).then((r) => r.json()),
      fetch('/api/clause-snippets').then((r) => r.json()),
      fetch('/api/company').then((r) => r.json()),
    ]).then(([tpl, snips, comp]) => {
      setName(tpl.name)
      setCurrency(tpl.currency)
      setActive(tpl.active)
      setFields(tpl.fields.map((f: Field) => ({ field_key: f.field_key, label: f.label, field_type: f.field_type, required: f.required, options: f.options })))
      setClauses(tpl.clauses.map((c: Clause) => ({ title: c.title, body: c.body })))
      setPricingItems(tpl.pricingItems.map((p: PricingItem) => ({ label: p.label, amount: p.amount, frequency: p.frequency })))
      setSnippets(Array.isArray(snips) ? snips : [])
      setCompany(comp)
      setLoading(false)
    })
  }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/contract-templates/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, currency, active, fields, clauses, pricingItems }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const handleSaveCompany = async () => {
    if (!company) return
    setSavingCompany(true)
    const res = await fetch('/api/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company),
    })
    setSavingCompany(false)
    if (res.ok) setCompanyOpen(false)
  }

  // ── Campos ──
  const addField = () => setFields((prev) => [...prev, { field_key: '', label: '', field_type: 'text', required: true, options: null }])
  const updateField = (i: number, patch: Partial<Field>) => setFields((prev) => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  const removeField = (i: number) => setFields((prev) => prev.filter((_, idx) => idx !== i))

  // ── Cláusulas ──
  const addClause = (title = '', body = '') => setClauses((prev) => [...prev, { title, body }])
  const updateClause = (i: number, patch: Partial<Clause>) => setClauses((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  const removeClause = (i: number) => setClauses((prev) => prev.filter((_, idx) => idx !== i))

  const insertSnippet = (snippet: ClauseSnippet) => {
    addClause(snippet.title, snippet.body_example)
    setSnippetPickerFor(null)
  }

  const insertFieldToken = (clauseIndex: number, fieldKey: string) => {
    const textarea = bodyRefs.current[clauseIndex]
    const current = clauses[clauseIndex].body
    const token = `%%${fieldKey}%%`
    if (textarea) {
      const pos = textarea.selectionStart ?? current.length
      const newBody = current.slice(0, pos) + token + current.slice(pos)
      updateClause(clauseIndex, { body: newBody })
    } else {
      updateClause(clauseIndex, { body: current + token })
    }
    setFieldPickerFor(null)
  }

  // ── Itens de valor ──
  const addPricing = () => setPricingItems((prev) => [...prev, { label: '', amount: 0, frequency: 'mensal' }])
  const updatePricing = (i: number, patch: Partial<PricingItem>) => setPricingItems((prev) => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  const removePricing = (i: number) => setPricingItems((prev) => prev.filter((_, idx) => idx !== i))

  const previewTokens: Record<string, string> = {
    ...Object.fromEntries(fields.map((f) => [f.field_key, `[${f.label || f.field_key}]`])),
    data_do_dia: '18 de julho de 2026',
    contratado_nome: company?.contract_signer_name || '[Nome do CONTRATADO]',
    contratado_cpf: company?.contract_signer_cpf || '[CPF]',
    contratado_endereco: company?.contract_signer_address || '[Endereço]',
    contratado_email: company?.contract_signer_email || '[E-mail]',
    contratado_telefone: company?.contract_signer_phone || '[Telefone]',
  }

  const snippetsByCategory = snippets.reduce<Record<string, ClauseSnippet[]>>((acc, s) => {
    acc[s.category] = acc[s.category] ?? []
    acc[s.category].push(s)
    return acc
  }, {})

  if (loading) return <p className="text-text-muted text-sm">Carregando...</p>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/contratos/modelos" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-main text-sm mb-2">
            <ArrowLeft size={14} /> Voltar para Modelos
          </Link>
          <input value={name} onChange={(e) => setName(e.target.value)} className="text-text-main text-2xl font-bold bg-transparent border-none outline-none focus:underline" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen((v) => !v)} icon={<Eye size={14} />}>Preview</Button>
          <Button onClick={handleSave} disabled={saving} icon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          {saved && <span className="flex items-center gap-1 text-cta text-sm font-medium"><CheckCircle2 size={15} /> Salvo</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Moeda</label>
          <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as 'BRL' | 'USD')}>
            <option value="BRL">BRL (R$)</option>
            <option value="USD">USD (US$)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={active ? '1' : '0'} onChange={(e) => setActive(e.target.value === '1')}>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </div>
      </div>

      {/* Dados do CONTRATADO */}
      <Card padding="md" animate={false}>
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setCompanyOpen((v) => !v)}>
          <CardHeader title="Dados do Contratado (sua empresa)" description="Usado em todos os contratos gerados. Preencha uma vez." />
        </div>
        {companyOpen && company && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome do responsável (quem assina)</label>
                <input className={inputCls} value={company.contract_signer_name ?? ''} onChange={(e) => setCompany({ ...company, contract_signer_name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>CPF</label>
                <input className={inputCls} value={company.contract_signer_cpf ?? ''} onChange={(e) => setCompany({ ...company, contract_signer_cpf: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Endereço</label>
              <input className={inputCls} value={company.contract_signer_address ?? ''} onChange={(e) => setCompany({ ...company, contract_signer_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>E-mail (assina eletronicamente por aqui)</label>
                <input type="email" className={inputCls} value={company.contract_signer_email ?? ''} onChange={(e) => setCompany({ ...company, contract_signer_email: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input className={inputCls} value={company.contract_signer_phone ?? ''} onChange={(e) => setCompany({ ...company, contract_signer_phone: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSaveCompany} disabled={savingCompany} icon={savingCompany ? <Loader2 size={14} className="animate-spin" /> : undefined}>
              {savingCompany ? 'Salvando...' : 'Salvar dados da empresa'}
            </Button>
          </div>
        )}
      </Card>

      {/* Campos */}
      <Card padding="md" animate={false}>
        <CardHeader title="Campos do formulário" description="O que o seu cliente vai preencher no link público." />
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-background border border-border rounded-lg p-2.5">
              <div className="col-span-3">
                <label className={labelCls}>Chave (%%token%%)</label>
                <input className={inputCls} value={f.field_key} onChange={(e) => updateField(i, { field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="nome_completo" />
              </div>
              <div className="col-span-4">
                <label className={labelCls}>Rótulo (o que o cliente vê)</label>
                <input className={inputCls} value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Nome Completo" />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>Tipo</label>
                <select className={inputCls} value={f.field_type} onChange={(e) => updateField(i, { field_type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} title="Obrigatório" />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeField(i)} className="p-1.5 text-text-muted hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-text-muted text-xs mt-2">Os campos <code>nome_completo</code>, <code>email</code> e <code>telefone</code> são obrigatórios em todo modelo — usados pra enviar o contrato pra assinatura.</p>
        <Button variant="secondary" onClick={addField} icon={<Plus size={14} />} className="mt-3">Adicionar campo</Button>
      </Card>

      {/* Cláusulas */}
      <Card padding="md" animate={false}>
        <CardHeader title="Cláusulas" description="O texto do contrato. Use %%chave%% pra puxar um campo preenchido pelo cliente." />
        <div className="space-y-3">
          {clauses.map((c, i) => (
            <div key={i} className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-start gap-2">
                <ReorderButtons index={i} length={clauses.length} onMove={(from, to) => setClauses((prev) => move(prev, from, to))} />
                <div className="flex-1 space-y-2">
                  <input className={`${inputCls} font-semibold`} value={c.title} onChange={(e) => updateClause(i, { title: e.target.value })} placeholder="Título da cláusula" />
                  <textarea
                    ref={(el) => { bodyRefs.current[i] = el }}
                    className={`${inputCls} min-h-[90px] resize-y`}
                    value={c.body}
                    onChange={(e) => updateClause(i, { body: e.target.value })}
                    placeholder="Texto da cláusula..."
                  />
                  <div className="flex items-center gap-2 relative">
                    <button onClick={() => setFieldPickerFor(fieldPickerFor === i ? null : i)} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Tag size={12} /> Inserir campo
                    </button>
                    {fieldPickerFor === i && (
                      <div className="absolute top-6 left-0 z-10 bg-surface border border-border rounded-lg shadow-lg p-1.5 w-48">
                        {fields.filter((f) => f.field_key).map((f) => (
                          <button key={f.field_key} onClick={() => insertFieldToken(i, f.field_key)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-hover-bg">
                            {f.label || f.field_key}
                          </button>
                        ))}
                        {fields.filter((f) => f.field_key).length === 0 && <p className="text-xs text-text-muted px-2 py-1.5">Adicione campos primeiro.</p>}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => removeClause(i)} className="p-1.5 text-text-muted hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button variant="secondary" onClick={() => addClause()} icon={<Plus size={14} />}>Nova cláusula em branco</Button>
          <div className="relative">
            <Button variant="secondary" onClick={() => setSnippetPickerFor(snippetPickerFor === 'new' ? null : 'new')} icon={<BookOpen size={14} />}>Inserir cláusula pronta</Button>
            {snippetPickerFor === 'new' && (
              <div className="absolute top-10 left-0 z-10 bg-surface border border-border rounded-lg shadow-lg p-2 w-80 max-h-72 overflow-y-auto">
                {Object.entries(snippetsByCategory).map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <p className="text-[10px] font-bold uppercase text-text-disabled px-1 mb-1">{category}</p>
                    {items.map((s) => (
                      <button key={s.id} onClick={() => insertSnippet(s)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-hover-bg">
                        {s.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Itens de valor */}
      <Card padding="md" animate={false}>
        <CardHeader title="Itens de valor" description="Preço, taxa de setup, mensalidade — quantos itens quiser." />
        <div className="space-y-2">
          {pricingItems.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-background border border-border rounded-lg p-2.5">
              <div className="col-span-6">
                <label className={labelCls}>Rótulo</label>
                <input className={inputCls} value={p.label} onChange={(e) => updatePricing(i, { label: e.target.value })} placeholder="Taxa de Implementação" />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>Valor</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={p.amount} onChange={(e) => updatePricing(i, { amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Frequência</label>
                <select className={inputCls} value={p.frequency} onChange={(e) => updatePricing(i, { frequency: e.target.value as 'unico' | 'mensal' | 'semanal' })}>
                  <option value="unico">Único</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removePricing(i)} className="p-1.5 text-text-muted hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={addPricing} icon={<Plus size={14} />} className="mt-3">Adicionar item de valor</Button>
      </Card>

      {previewOpen && (
        <Card padding="md" animate={false}>
          <CardHeader title="Preview" description="Como o contrato fica com valores de exemplo." />
          <div className="bg-white text-black rounded-lg p-6 text-sm space-y-3 border border-border">
            <p className="font-bold text-center">{name}</p>
            {clauses.map((c, i) => (
              <div key={i}>
                <p className="font-bold text-xs mt-2">{substituteTokens(c.title, previewTokens)}</p>
                <p className="text-xs whitespace-pre-line">{substituteTokens(c.body, previewTokens)}</p>
              </div>
            ))}
            {pricingItems.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="font-bold text-xs mb-1">TABELA DE VALORES</p>
                {pricingItems.map((p, i) => (
                  <p key={i} className="text-xs">{p.label}, {currency === 'USD' ? 'US$' : 'R$'} {p.amount.toFixed(2)} ({p.frequency === 'unico' ? 'único' : p.frequency === 'semanal' ? 'semanal' : 'mensal'})</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
