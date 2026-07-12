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
  Loader2
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/relatorios')}
            className="p-2 hover:bg-gray-100 rounded-lg text-[#64748B] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-[#1E293B]">{id ? 'Editar Relatório' : 'Criar Relatório'}</h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Form */}
        <div className="space-y-6 bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#64748B]">Nome do Relatório *</label>
            <input 
              required
              type="text"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Relatório Diário - Cliente X"
              className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] text-[#1E293B] transition-all"
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
                    formData.canal === 'meta' ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1A56DB]' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
                  }`}
                >
                  <Facebook size={16} /> Meta
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, canal: 'google' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold transition-all ${
                    formData.canal === 'google' ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1A56DB]' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
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
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1A56DB]'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Calendário para período personalizado */}
              {formData.periodo === 'personalizado' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-[#64748B] mb-1 block font-semibold">Data início</label>
                    <input
                      type="date"
                      value={formData.data_inicio ?? ''}
                      onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                      className="w-full bg-white text-[#1E293B] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] mb-1 block font-semibold">Data fim</label>
                    <input
                      type="date"
                      value={formData.data_fim ?? ''}
                      onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                      className="w-full bg-white text-[#1E293B] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Dias de envio — múltipla seleção — sempre visível */}
              <div className="mt-2">
                <label className="text-xs text-[#64748B] mb-1 block font-semibold">Dias de envio (selecione um ou mais)</label>
                <div className="grid grid-cols-7 gap-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        diasSelecionados.includes(i)
                          ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1A56DB]'
                          : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
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
              <label className="text-sm font-semibold text-[#64748B]">Recebedor</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, recebedor_tipo: 'privado', recebedor_numero: '' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold transition-all ${
                    formData.recebedor_tipo === 'privado' ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1A56DB]' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
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
                    formData.recebedor_tipo === 'grupo' ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1A56DB]' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB]'
                  }`}
                >
                  <Users size={16} /> Grupo
                </button>
              </div>
            </div>

            {formData.recebedor_tipo === 'privado' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">WhatsApp (com DDI) *</label>
                <input 
                  required
                  type="text"
                  value={formData.recebedor_numero}
                  onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] text-[#1E293B] transition-all"
                />
              </div>
            )}

            {formData.recebedor_tipo === 'grupo' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#64748B]">Selecionar Grupo *</label>
                <div className="relative">
                  <select 
                    required
                    value={formData.recebedor_numero}
                    onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] text-[#1E293B] appearance-none transition-all"
                  >
                    <option value="">Selecione um grupo...</option>
                    {wpGroups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={18} />
                </div>
                {wpLoadingGroups && <p className="text-xs text-[#1A56DB] animate-pulse font-medium">Buscando grupos do WhatsApp...</p>}
                {wpInstance.status !== 'connected' && (
                  <p className="text-xs text-red-600 font-medium">Conecte o WhatsApp nas configurações para listar os grupos.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#64748B]">Horário de Envio *</label>
              <input 
                required
                type="time"
                value={formData.horario_envio}
                onChange={e => setFormData({ ...formData, horario_envio: e.target.value })}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] text-[#1E293B] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#64748B]">Cliente Vinculado *</label>
              <div className="relative">
                <select 
                  required
                  value={formData.client_id ?? ''}
                  onChange={e => setFormData({ ...formData, client_id: e.target.value || null })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] text-[#1E293B] appearance-none transition-all"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-[#64748B]">Template da Mensagem *</label>
              <div className="group relative">
                <Info size={14} className="text-[#64748B] cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#1E293B] text-white text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10 border border-[#334155]">
                  Use as variáveis abaixo para que o sistema preencha os dados reais do cliente e do período automaticamente.
                </div>
              </div>
            </div>
            <textarea 
              ref={textareaRef}
              required
              rows={8}
              value={formData.mensagem_template}
              onChange={e => setFormData({ ...formData, mensagem_template: e.target.value })}
              className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] text-[#1E293B] text-sm font-mono transition-all resize-none"
              placeholder="Digite sua mensagem aqui..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {variables.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[10px] text-[#1E293B] font-semibold hover:border-[#1A56DB] hover:text-[#1A56DB] transition-all shadow-sm"
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/relatorios')}
              className="flex-1 py-3 border border-[#E2E8F0] rounded-xl text-[#64748B] font-semibold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {id ? 'Salvar Alterações' : 'Criar Relatório'}
            </button>
          </div>
        </div>

        {/* Right Side: Preview */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-sm">
            <h3 className="text-[#1E293B] font-semibold mb-4 flex items-center gap-2">
              <Smartphone size={18} className="text-[#1A56DB]" />
              Prévia do WhatsApp
            </h3>
            <div className="bg-[#F0F2F5] rounded-2xl p-4 min-h-[300px] relative overflow-hidden">
              {/* WhatsApp Header Mockup */}
              <div className="absolute top-0 left-0 right-0 bg-[#075E54] p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div className="flex-1">
                  <div className="h-2 w-24 bg-white/40 rounded" />
                  <div className="h-1.5 w-16 bg-white/20 rounded mt-1" />
                </div>
              </div>
              
              <div className="mt-12 space-y-4">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] relative">
                  <pre className="text-sm text-[#1E293B] whitespace-pre-wrap font-sans">
                    {previewMessage}
                  </pre>
                  <div className="text-[10px] text-[#64748B] text-right mt-1">
                    08:00
                  </div>
                  {/* Speech bubble tail */}
                  <div className="absolute left-[-8px] top-2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-white border-b-[8px] border-b-transparent" />
                </div>
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-4 italic font-medium">
              * Esta é uma simulação de como o cliente receberá a mensagem. Os valores reais serão buscados no momento do envio.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-8 rounded-2xl shadow-sm">
            <h3 className="text-[#1E293B] font-semibold mb-4">Dicas de Template</h3>
            <ul className="space-y-3 text-sm text-[#64748B] font-medium">
              <li className="flex gap-2">
                <span className="text-[#1A56DB]">•</span>
                Use emojis para tornar o relatório mais amigável e fácil de ler.
              </li>
              <li className="flex gap-2">
                <span className="text-[#1A56DB]">•</span>
                Quebras de linha ajudam a separar as métricas por blocos de assunto.
              </li>
              <li className="flex gap-2">
                <span className="text-[#1A56DB]">•</span>
                Você pode adicionar textos fixos como "Meta do mês: 200 leads".
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CreateEditReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#1A56DB]" /></div>}>
      <CreateEditReportContent />
    </Suspense>
  )
}
