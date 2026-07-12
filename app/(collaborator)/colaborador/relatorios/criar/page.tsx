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
  X,
  Info,
  ChevronDown,
  Loader2,
  Check,
  Send
} from 'lucide-react'
import { useRelatorios, ReportInput } from '@/hooks/useRelatorios'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { createClient } from '@/lib/supabase'

// Variáveis disponíveis para o template
const variables = [
  // Geral
  { label: 'Período', key: '<DATA>', example: '01/07 a 07/07' },
  { label: 'Conta', key: '<CA>', example: 'Alpha Digital' },
  // Investimento
  { label: 'Orçamento', key: '<ORC>', example: 'R$ 1.000,00' },
  { label: 'Investido', key: '<INV>', example: 'R$ 875,00' },
  // Alcance e Entrega
  { label: 'Alcance', key: '<ALCAN>', example: '15.420' },
  { label: 'Impressões', key: '<IMP>', example: '45.890' },
  { label: 'Frequência', key: '<FREQ>', example: '2,97' },
  { label: 'CPM', key: '<CPM>', example: 'R$ 19,05' },
  // Cliques
  { label: 'CPC', key: '<CPC>', example: 'R$ 1,04' },
  { label: 'CTR', key: '<CTR>', example: '1,83%' },
  // Resultados
  { label: 'Resultados', key: '<RESULT>', example: '42' },
  { label: 'Custo/Resultado', key: '<CPR>', example: 'R$ 20,83' },
  // Instagram
  // Carrinho
  { label: 'Adic. Carrinho', key: '<ADD_CART>', example: '25' },
  { label: 'Custo/Carrinho', key: '<CUSTO_ADD_CART>', example: 'R$ 35,00' },
  // Página de Destino
  { label: 'View Dest. Site', key: '<VIEW_DEST_SITE>', example: '530' },
  { label: 'View Destino', key: '<VIEW_DEST>', example: '480' },
  { label: 'Custo/View Dest', key: '<CUSTO_VIEW_DEST>', example: 'R$ 1,82' },
  // Compras
  { label: 'Inic. Compra', key: '<INIC_COMPRA>', example: '18' },
  { label: 'Custo/Inic.Compra', key: '<CUSTO_INIC_COMPRA>', example: 'R$ 48,61' },
  { label: 'Compras', key: '<COMPRAS>', example: '10' },
  { label: 'Custo/Compra', key: '<CUSTO_COMPRA>', example: 'R$ 87,50' },
  { label: 'Conv. Compra', key: '<CONV_COMPRA>', example: 'R$ 3.200,00' },
  { label: 'ROAS', key: '<ROAS>', example: '3,66x' },
  // Métricas Personalizadas
  { label: 'Grana no Bolso', key: '<GRANA>', example: 'R$ 2.325,00' },
  { label: 'Taxa de Gancho', key: '<GANCHO>', example: '32,5%' },
  // Conversas por Campanha
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
  const { createRelatorio, updateRelatorio, reports, loading: loadingHook } = useRelatorios()
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
      .eq('status', 'ativa')
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
    
    // Devolver foco e posicionar cursor após a variável
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
      router.push('/colaborador/relatorios')
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/colaborador/relatorios')}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg text-[#64748B] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#1E293B]">{id ? 'Editar Relatório' : 'Criar Relatório'}</h1>
            <p className="text-[#64748B] text-sm">Configure o envio automático de métricas via WhatsApp</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#64748B]">Nome do Relatório *</label>
              <input 
                required
                type="text"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Relatório Diário - Cliente X"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] text-[#1E293B] transition-all placeholder:text-[#94A3B8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">Canal</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, canal: 'meta' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold transition-all ${
                      formData.canal === 'meta' ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
                    }`}
                  >
                    <Facebook size={16} /> Meta
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, canal: 'google' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold transition-all ${
                      formData.canal === 'google' ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
                    }`}
                  >
                    <Globe size={16} /> Google
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">Período</label>
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
                      className={`py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                        formData.periodo === opt.value
                          ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {formData.periodo === 'personalizado' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] text-[#64748B] mb-1 block font-semibold uppercase tracking-wider">Início</label>
                      <input
                        type="date"
                        value={formData.data_inicio ?? ''}
                        onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                        className="w-full bg-[#F8FAFC] text-[#1E293B] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#1A56DB] transition-all [color-scheme:light]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#64748B] mb-1 block font-semibold uppercase tracking-wider">Fim</label>
                      <input
                        type="date"
                        value={formData.data_fim ?? ''}
                        onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                        className="w-full bg-[#F8FAFC] text-[#1E293B] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#1A56DB] transition-all [color-scheme:light]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configurações de Envio */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F5F9]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">Dias de Envio</label>
                <div className="grid grid-cols-7 gap-1">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i)}
                      className={`h-8 rounded-lg border text-[10px] font-bold transition-all ${
                        diasSelecionados.includes(i)
                          ? 'bg-[#1A56DB] text-white border-[#1A56DB]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB]'
                      }`}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">Horário de Envio</label>
                <input 
                  type="time"
                  value={formData.horario_envio}
                  onChange={e => setFormData({ ...formData, horario_envio: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 outline-none focus:border-[#1A56DB] text-[#1E293B] transition-all [color-scheme:light]"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#F1F5F9]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#64748B]">Recebedor</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, recebedor_tipo: 'privado', recebedor_numero: '' })}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold transition-all ${
                        formData.recebedor_tipo === 'privado' ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB]'
                      }`}
                    >
                      <Smartphone size={16} /> Privado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, recebedor_tipo: 'grupo', recebedor_numero: '' })
                        if (wpInstance.status === 'connected' && wpGroups.length === 0) wpFetchGroups()
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold transition-all ${
                        formData.recebedor_tipo === 'grupo' ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB]'
                      }`}
                    >
                      <Users size={16} /> Grupo
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#64748B]">WhatsApp / Grupo</label>
                  {formData.recebedor_tipo === 'privado' ? (
                    <input 
                      type="text"
                      value={formData.recebedor_numero}
                      onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value.replace(/\D/g, '') })}
                      placeholder="5511999999999"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#1A56DB] text-[#1E293B] transition-all placeholder:text-[#94A3B8]"
                    />
                  ) : (
                    <div className="relative">
                      <select
                        value={formData.recebedor_numero}
                        onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value })}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#1A56DB] text-[#1E293B] transition-all appearance-none"
                      >
                        <option value="">Selecione um grupo...</option>
                        {wpGroups.map(g => (
                          <option key={g.group_id} value={g.group_id}>{g.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">Vincular Cliente</label>
                <div className="relative">
                  <select
                    value={formData.client_id || ''}
                    onChange={e => setFormData({ ...formData, client_id: e.target.value || null })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none focus:border-[#1A56DB] text-[#1E293B] transition-all appearance-none"
                  >
                    <option value="">Selecione um cliente (opcional)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Template Editor */}
          <div className="bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-[#64748B]">Corpo da Mensagem</label>
              <div className="flex items-center gap-2 text-[#1A56DB] bg-[#EFF6FF] px-2 py-1 rounded-lg">
                <Info size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Clique nas variáveis abaixo para inserir</span>
              </div>
            </div>
            
            <textarea
              ref={textareaRef}
              required
              rows={8}
              value={formData.mensagem_template}
              onChange={e => setFormData({ ...formData, mensagem_template: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-4 outline-none focus:border-[#1A56DB] text-[#1E293B] transition-all text-sm resize-none placeholder:text-[#94A3B8]"
            />

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Variáveis de Métricas</p>
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[10px] text-[#1E293B] font-semibold transition-all hover:border-[#1A56DB]"
                  >
                    {v.label}
                  </button>
                ))}
                {campanhasDoCliente.map((camp, idx) => (
                  <button
                    key={`camp-${idx}`}
                    type="button"
                    onClick={() => insertVariable(`<CAMP_${idx + 1}>`)}
                    className="px-2.5 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[10px] text-[#1A56DB] font-semibold hover:bg-[#DBEAFE] transition-all"
                  >
                    {camp.name.substring(0, 15)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A56DB] hover:bg-[#1E40AF] disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1A56DB]/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {id ? 'Salvar Alterações' : 'Agendar Relatório Automático'}
          </button>
        </div>

        {/* Right Side: Smartphone Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-8 space-y-6">
          <div className="relative mx-auto w-[280px] h-[560px] bg-[#1E293B] rounded-[2.5rem] border-[6px] border-[#1E293B] shadow-2xl overflow-hidden ring-4 ring-[#E2E8F0]">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#1E293B] rounded-b-xl z-20" />
            
            {/* Screen Content */}
            <div className="h-full w-full bg-[#E5DDD5] flex flex-col relative">
              {/* WP Header */}
              <div className="bg-[#075E54] p-3 pt-6 flex items-center gap-3 shadow-md">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Users size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold leading-none">Alpha Bot</p>
                  <p className="text-white/70 text-[9px]">online</p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm relative max-w-[90%]">
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent" />
                  <div className="text-[12px] text-[#1E293B] whitespace-pre-wrap leading-relaxed">
                    {previewMessage}
                  </div>
                  <div className="mt-1 flex justify-end items-center gap-1">
                    <span className="text-[8px] text-[#64748B]">08:00</span>
                    <Check size={9} className="text-blue-500" />
                  </div>
                </div>
              </div>

              {/* WP Input Bar */}
              <div className="p-2 bg-[#F0F0F0] flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[10px] text-[#94A3B8]">
                  Digite uma mensagem...
                </div>
                <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center shadow-md">
                  <Send size={14} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Dicas de UX */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-5 rounded-2xl space-y-2">
            <h3 className="text-[#1A56DB] font-bold text-xs flex items-center gap-2">
              <Info size={14} /> Dica do Especialista
            </h3>
            <p className="text-[#1E293B] text-[11px] leading-relaxed">
              O visual ao lado simula exatamente como o seu cliente receberá o relatório. 
              Dica: Use quebras de linha e emojis no template para tornar a leitura mais agradável no celular!
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CreateReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#1A56DB]" size={32} />
      </div>
    }>
      <CreateEditReportContent />
    </Suspense>
  )
}
