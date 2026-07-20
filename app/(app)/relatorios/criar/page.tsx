'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Facebook, 
  Globe, 
  Smartphone, 
  Users, 
  Save, 
  Info,
  Loader2
} from 'lucide-react'
import { useRelatorios, ReportInput } from '@/hooks/useRelatorios'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { createClient } from '@/lib/supabase'
import { HourSelect } from '@/components/ui/HourSelect'

const variables = [
  { label: 'Período', key: '<DATA>', example: '01/07 a 07/07' },
  { label: 'Conta', key: '<CA>', example: 'Alpha Digital' },
  { label: 'Orçamento', key: '<ORC>', example: 'R$ 1.000,00' },
  { label: 'Investido', key: '<INV>', example: 'R$ 875,00' },
  { label: 'Alcance', key: '<ALCAN>', example: '15.420' },
  { label: 'Impressões', key: '<IMP>', example: '45.890' },
  { label: 'Frequência', key: '<FREQ>', example: '2,97' },
  { label: 'CPM', key: '<CPM>', example: 'R$ 19,05' },
  { label: 'CPC', key: '<CPC>', example: 'R$ 1,04' },
  { label: 'CTR', key: '<CTR>', example: '1,83%' },
  { label: 'Resultados', key: '<RESULT>', example: '42' },
  { label: 'Custo/Resultado', key: '<CPR>', example: 'R$ 20,83' },
  { label: 'Adic. Carrinho', key: '<ADD_CART>', example: '25' },
  { label: 'Custo/Carrinho', key: '<CUSTO_ADD_CART>', example: 'R$ 35,00' },
  { label: 'View Dest. Site', key: '<VIEW_DEST_SITE>', example: '530' },
  { label: 'View Destino', key: '<VIEW_DEST>', example: '480' },
  { label: 'Custo/View Dest', key: '<CUSTO_VIEW_DEST>', example: 'R$ 1,82' },
  { label: 'Inic. Compra', key: '<INIC_COMPRA>', example: '18' },
  { label: 'Custo/Inic.Compra', key: '<CUSTO_INIC_COMPRA>', example: 'R$ 48,61' },
  { label: 'Compras', key: '<COMPRAS>', example: '10' },
  { label: 'Custo/Compra', key: '<CUSTO_COMPRA>', example: 'R$ 87,50' },
  { label: 'Conv. Compra', key: '<CONV_COMPRA>', example: 'R$ 3.200,00' },
  { label: 'ROAS', key: '<ROAS>', example: '3,66x' },
  { label: 'Grana no Bolso', key: '<GRANA>', example: 'R$ 2.325,00' },
  { label: 'Taxa de Gancho', key: '<GANCHO>', example: '32,5%' },
  { label: 'Seguidores Instagram', key: '<IG_SEGUIDORES>', example: '4.582' },
  { label: 'Visitas ao Perfil (IG)', key: '<IG_VISITAS>', example: '312' },
  { label: 'Camp. 1 — Conversas', key: '<CAMP_1>', example: '12' },
  { label: 'Camp. 2 — Conversas', key: '<CAMP_2>', example: '8' },
  { label: 'Camp. 3 — Conversas', key: '<CAMP_3>', example: '5' },
  { label: 'Camp. 4 — Conversas', key: '<CAMP_4>', example: '3' },
  { label: 'Camp. 5 — Conversas', key: '<CAMP_5>', example: '0' },
  { label: 'Camp. 6 — Conversas', key: '<CAMP_6>', example: '0' },
  { label: 'Camp. 7 — Conversas', key: '<CAMP_7>', example: '0' },
  { label: 'Camp. 8 — Conversas', key: '<CAMP_8>', example: '0' },
  { label: 'Camp. 9 — Conversas', key: '<CAMP_9>', example: '0' },
  { label: 'Camp. 10 — Conversas', key: '<CAMP_10>', example: '0' },
]

function CreateEditReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { createRelatorio, updateRelatorio, reports } = useRelatorios()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<{id: string, name: string}[]>([])
  const [campanhasDoCliente, setCampanhasDoCliente] = useState<{name: string}[]>([])
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([])

  const toggleDia = (i: number) => {
    setDiasSelecionados(prev => {
      const novos = prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
      setFormData(f => ({ ...f, dias_semana: novos.map(String) }))
      return novos
    })
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [formData, setFormData] = useState<ReportInput>({
    nome: '',
    canal: 'meta',
    frequencia: 'diario',
    periodo: 'ontem',
    recebedor_tipo: 'privado',
    recebedor_numero: '',
    enviar_via_agencia: false,
    mensagem_template: 'Olá! Segue o relatório de <DATA>\nda conta <CA>:\n\nAlcance: <ALCAN>\nImpressões: <IMP>\nInvestimento: <INV>\nResultados: <RESULT>\nCusto por Resultado: <CPR>\nROAS: <ROAS>',
    horario_envio: '08:00',
    dias_semana: null,
    ativo: true,
    proximo_envio: null,
    client_id: null
  })
  const { instance: wpInstance, groups: wpGroups, loadingGroups: wpLoadingGroups, fetchGroups: wpFetchGroups } = useWhatsApp()

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from('clients').select('id, name').order('name')
      if (data) setClients(data)
    }
    fetchClients()
  }, [])

  useEffect(() => {
    if (!formData.client_id) {
      setCampanhasDoCliente([])
      return
    }
    supabase
      .from('campaigns')
      .select('name')
      .eq('client_id', formData.client_id)
      .order('created_at', { ascending: true })
      .limit(10)
      .then(({ data }) => setCampanhasDoCliente(data ?? []))
  }, [formData.client_id])

  useEffect(() => {
    if (id && reports.length > 0) {
      const report = reports.find(r => r.id === id)
      if (report) {
        const { id: _, user_id: __, created_at: ___, updated_at: ____, ...rest } = report
        setFormData(rest)
        if (rest.dias_semana) {
          setDiasSelecionados(rest.dias_semana.map(Number))
        }
      }
    }
  }, [id, reports])

  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const text = formData.mensagem_template
    const before = text.substring(0, start)
    const after = text.substring(end)
    const newText = before + variable + after
    
    setFormData({ ...formData, mensagem_template: newText })
    
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (id) {
        await updateRelatorio(id, formData)
      } else {
        await createRelatorio(formData)
      }
      router.push('/relatorios')
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar relatório. Verifique os campos e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const previewMessage = useMemo(() => {
    let text = formData.mensagem_template
    variables.forEach(v => {
      text = text.replaceAll(v.key, v.example)
    })
    return text
  }, [formData.mensagem_template])

  const selectBtn = (active: boolean) =>
    `flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${
      active
        ? 'bg-primary/10 border-primary text-primary'
        : 'bg-background border-border text-text-muted hover:border-primary/40'
    }`

  const inputCls =
    'w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-text-main'

  return (
    <div className="min-h-full bg-background text-text-main">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push('/relatorios')}
          className="p-2 hover:bg-hover-bg rounded-lg text-text-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-text-main">{id ? 'Editar Relatório' : 'Criar Relatório'}</h1>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Form */}
        <div className="space-y-6 bg-surface border border-border p-8 rounded-xl shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Nome do Relatório *</label>
            <input 
              required
              type="text"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Relatório Diário - Cliente X"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Canal</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, canal: 'meta' })} className={selectBtn(formData.canal === 'meta')}>
                  <Facebook size={16} /> Meta
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, canal: 'google' })} className={selectBtn(formData.canal === 'google')}>
                  <Globe size={16} /> Google
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Período</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'ontem', label: 'Ontem' },
                  { value: 'ultimos_3_dias', label: 'Últ. 3 dias' },
                  { value: 'ultimos_7_dias', label: 'Últ. 7 dias' },
                  { value: 'ultimos_30_dias', label: 'Últ. 30 dias' },
                  { value: 'personalizado', label: '📅 Custom' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, periodo: opt.value as any })}
                    className={`py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${
                      formData.periodo === opt.value
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-border text-text-muted hover:border-primary/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {formData.periodo === 'personalizado' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Data início</label>
                    <input
                      type="date"
                      value={formData.data_inicio ?? ''}
                      onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-text-main"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Data fim</label>
                    <input
                      type="date"
                      value={formData.data_fim ?? ''}
                      onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-text-main"
                    />
                  </div>
                </div>
              )}

              <div className="mt-2">
                <label className="text-xs text-text-muted mb-1 block">Dias de envio (selecione um ou mais)</label>
                <div className="grid grid-cols-7 gap-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        diasSelecionados.includes(i)
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-text-muted hover:border-primary/40'
                      }`}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Recebedor</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, recebedor_tipo: 'privado', recebedor_numero: '' })}
                  className={selectBtn(formData.recebedor_tipo === 'privado')}
                >
                  <Smartphone size={16} /> Privado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, recebedor_tipo: 'grupo', recebedor_numero: '' })
                    if (wpInstance.status === 'connected' && wpGroups.length === 0) wpFetchGroups()
                  }}
                  className={selectBtn(formData.recebedor_tipo === 'grupo')}
                >
                  <Users size={16} /> Grupo
                </button>
              </div>
            </div>

            {formData.recebedor_tipo === 'privado' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">WhatsApp (com DDI) *</label>
                <input
                  required
                  type="text"
                  value={formData.recebedor_numero}
                  onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value.replace(/\D/g, '') })}
                  placeholder="5511999999999"
                  className={inputCls}
                />
              </div>
            )}

            {formData.recebedor_tipo === 'grupo' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Grupo do WhatsApp *</label>
                {wpInstance.status === 'loading' && (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 size={14} className="animate-spin text-text-muted" />
                    <span className="text-xs text-text-muted">Verificando conexão...</span>
                  </div>
                )}
                {wpInstance.status === 'error' && (
                  <div className="rounded-xl px-4 py-3 text-xs bg-red-50 border border-red-200 text-red-600">
                    ⚠️ {wpInstance.error || 'WhatsApp não configurado.'}{' '}
                    <a href="/integracoes" className="underline text-primary">Configurar em Integrações</a>
                  </div>
                )}
                {(wpInstance.status === 'disconnected' || wpInstance.status === 'connecting') && (
                  <div className="rounded-xl px-4 py-3 text-xs bg-primary/5 border border-primary/20 text-primary">
                    📵 WhatsApp não conectado.{' '}
                    <a href="/integracoes" className="underline font-semibold">Conecte em Integrações →</a>
                  </div>
                )}
                {wpInstance.status === 'connected' && (
                  <>
                    {wpLoadingGroups ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 size={14} className="animate-spin text-text-muted" />
                        <span className="text-xs text-text-muted">Carregando grupos...</span>
                      </div>
                    ) : wpGroups.length === 0 ? (
                      <div className="rounded-xl px-4 py-3 text-xs bg-hover-bg border border-border text-text-muted">
                        Nenhum grupo encontrado.{' '}
                        <button type="button" onClick={wpFetchGroups} className="underline text-primary">Atualizar</button>
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.recebedor_numero}
                        onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value })}
                        className={`${inputCls} appearance-none`}
                      >
                        <option value="">Selecione um grupo...</option>
                        {wpGroups.map(g => (
                          <option key={g.group_id} value={g.group_id}>
                            {g.name}{g.participant_count > 0 ? ` (${g.participant_count})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Horário de Envio</label>
              <HourSelect
                value={formData.horario_envio}
                onChange={hora => setFormData({ ...formData, horario_envio: hora })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Cliente Vinculado (Opcional)</label>
            <select 
              value={formData.client_id || ''}
              onChange={e => setFormData({ ...formData, client_id: e.target.value || null })}
              className={`${inputCls} appearance-none`}
            >
              <option value="">Selecione um cliente...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          {campanhasDoCliente.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-primary font-semibold mb-2">
                📋 Campanhas deste cliente (referência — não vai no WhatsApp):
              </p>
              {campanhasDoCliente.map((c, i) => (
                <p key={i} className="text-xs text-text-main py-0.5">
                  <span className="text-primary font-mono font-bold">&lt;CAMP_{i + 1}&gt;</span>
                  <span className="text-text-muted"> → </span>
                  {c.name}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/relatorios')}
              className="flex-1 bg-transparent border border-border hover:bg-hover-bg text-text-muted py-3 rounded-xl transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-primary hover:bg-primary-hover text-white py-3 px-8 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Relatório
            </button>
          </div>
        </div>

        {/* Right Side: Message Editor & Preview */}
        <div className="space-y-6">
          <div className="bg-surface border border-border p-8 rounded-xl shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-medium text-text-muted">Template da Mensagem</label>
              <div className="flex items-center gap-1 text-[10px] text-text-muted bg-hover-bg px-2 py-1 rounded-md border border-border">
                <Info size={12} />
                Clique nas variáveis abaixo para inserir
              </div>
            </div>
            
            <textarea
              ref={textareaRef}
              value={formData.mensagem_template}
              onChange={e => setFormData({ ...formData, mensagem_template: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-4 py-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none min-h-[250px] font-mono text-sm leading-relaxed text-text-main"
              placeholder="Digite a mensagem do relatório..."
            />

            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {variables.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="px-2 py-1.5 bg-background border border-border hover:border-primary hover:text-primary rounded-lg text-[10px] font-bold text-text-muted transition-all"
                >
                  {v.key}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <label className="text-sm font-medium text-text-muted mb-4 block">Preview WhatsApp</label>
              <div className="bg-[#e5ddd5] rounded-xl p-6 relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-end">
                  <div className="bg-[#dcf8c6] text-gray-900 p-4 rounded-xl rounded-tr-none shadow-sm max-w-[85%] relative">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {previewMessage}
                    </pre>
                    <div className="text-[10px] text-gray-500 text-right mt-1">
                      {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CreateEditReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    }>
      <CreateEditReportContent />
    </Suspense>
  )
}
