'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, FileSignature } from 'lucide-react'
import { maskCNPJ, maskCPF, maskCEP, maskPhone, isValidCNPJ, isValidCPF, isValidCEP } from '@/lib/validators'

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const inputCls = 'w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
const labelCls = 'block text-sm font-medium text-text-main mb-1.5'

interface FormState {
  razaoSocial: string
  cnpj: string
  cpf: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  nomeCompleto: string
  email: string
  telefone: string
  aceite: boolean
}

const initialForm: FormState = {
  razaoSocial: '', cnpj: '', cpf: '', endereco: '', cidade: '', estado: '',
  cep: '', nomeCompleto: '', email: '', telefone: '', aceite: false,
}

export default function PropostaCompletoPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const validate = (): string | null => {
    if (!form.razaoSocial.trim()) return 'Razão social é obrigatória.'
    if (!form.cnpj && !form.cpf) return 'Informe CNPJ ou CPF.'
    if (form.cnpj && !isValidCNPJ(form.cnpj)) return 'CNPJ inválido.'
    if (form.cpf && !isValidCPF(form.cpf)) return 'CPF inválido.'
    if (!form.endereco.trim()) return 'Endereço é obrigatório.'
    if (!form.cidade.trim()) return 'Cidade é obrigatória.'
    if (!form.estado) return 'Estado é obrigatório.'
    if (!isValidCEP(form.cep)) return 'CEP inválido.'
    if (!form.nomeCompleto.trim()) return 'Nome completo é obrigatório.'
    if (!form.email.trim()) return 'E-mail é obrigatório.'
    if (!form.telefone.trim()) return 'Telefone é obrigatório.'
    if (!form.aceite) return 'É necessário aceitar os termos do contrato para continuar.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_type: 'completo',
          razao_social: form.razaoSocial.trim(),
          cnpj: form.cnpj || undefined,
          cpf: form.cpf || undefined,
          endereco: form.endereco.trim(),
          cidade: form.cidade.trim(),
          estado: form.estado,
          cep: form.cep,
          nome_completo: form.nomeCompleto.trim(),
          email: form.email.trim(),
          telefone: form.telefone,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar. Tente novamente.')
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="text-cta mx-auto mb-4" />
          <h1 className="text-text-main text-xl font-bold mb-2">Recebemos seus dados!</h1>
          <p className="text-text-muted text-sm">
            Verifique seu e-mail ou WhatsApp para assinar o contrato.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <FileSignature size={32} className="text-primary mb-2" />
            <h1 className="text-text-main text-xl font-bold">Contrato — Tráfego Pago + CRM</h1>
            <p className="text-text-muted text-sm mt-1">Preencha seus dados para gerar seu contrato.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Razão Social</label>
              <input className={inputCls} value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} placeholder="Nome da empresa" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>CNPJ</label>
                <input className={inputCls} value={form.cnpj} onChange={(e) => set('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className={labelCls}>CPF</label>
                <input className={inputCls} value={form.cpf} onChange={(e) => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Endereço</label>
              <input className={inputCls} value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, número, bairro" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Cidade</label>
                <input className={inputCls} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Fortaleza" />
              </div>
              <div>
                <label className={labelCls}>UF</label>
                <select className={inputCls} value={form.estado} onChange={(e) => set('estado', e.target.value)}>
                  <option value="">--</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>CEP</label>
                <input className={inputCls} value={form.cep} onChange={(e) => set('cep', maskCEP(e.target.value))} placeholder="00000-000" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Nome Completo (Representante Legal)</label>
              <input className={inputCls} value={form.nomeCompleto} onChange={(e) => set('nomeCompleto', e.target.value)} placeholder="Seu nome completo" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>E-mail</label>
                <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="seu@email.com" />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input className={inputCls} value={form.telefone} onChange={(e) => set('telefone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-sm text-text-muted pt-2">
              <input type="checkbox" checked={form.aceite} onChange={(e) => set('aceite', e.target.checked)} className="mt-0.5" />
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
