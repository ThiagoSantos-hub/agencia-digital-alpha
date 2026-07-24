'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Facebook, Globe, Smartphone, Users, Save, Info, Loader2 } from 'lucide-react'
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
  { label: 'Cliques', key: '<CLICKS>', example: '840' },
  { label: 'Conversas WhatsApp', key: '<CONV_WHATS>', example: '35' },
  { label: 'Conversão Formulário', key: '<CONV_FORM>', example: '12' },
  { label: 'Conversões Totais', key: '<CONV_TOTAL>', example: '57' },
  { label: 'Taxa de Conversão', key: '<TAXA_CONV>', example: '6,78%' },
  { label: 'Ticket Médio', key: '<TICKET_MEDIO>', example: 'R$ 320,00' },
  { label: 'Lucro', key: '<LUCRO>', example: 'R$ 2.325,00' },
  { label: 'CTR do Link', key: '<CTR_LINK>', example: '1,20%' },
  { label: 'CPC do Link', key: '<CPC_LINK>', example: 'R$ 2,15' },
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
  const [campanhasDoCliente, setCampanhasDoCliente] = useState<string[]>([])
  const [loadingCampanhas, setLoadingCampanhas] = useState(false)
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [formData, setFormData] = useState<ReportInput>({
    nome: '', canal: 'meta', frequencia: 'diario', periodo: 'ontem',
    recebedor_tipo: 'privado', recebedor_numero: '', enviar_via_agencia: true,
    mensagem_template: 'Olá! Segue o relatório de <DATA>\nda conta <CA>:\n\nAlcance: <ALCAN>\nImpressões: <IMP>\nInvestimento: <INV>\nResultados: <RESULT>\nCusto por Resultado: <CPR>\nROAS: <ROAS>',
    horario_envio: '08:00', dias_semana: null, ativo: true, proximo_envio: null, client_id: null
  })

  const { instance: wpInstance, groups: wpGroups, loadingGroups: wpLoadingGroups, fetchGroups: wpFetchGroups } = useWhatsApp(formData.enviar_via_agencia ? 'agency' : 'own')

  const toggleDia = (i: number) => {
    setDiasSelecionados(prev => {
      const novos = prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
      setFormData(f => ({ ...f, dias_semana: novos.map(String) }))
      return novos
    })
  }

  useEffect(() => {
    // clients_directory, não a tabela clients direto: RLS agora só libera o
    // registro completo pra quem gerencia aquele cliente (migration
    // 20260731_clients_rls_hardening.sql), mas aqui só precisamos de id/nome
    // pra vincular o relatório a qualquer cliente da agência.
    supabase.from('clients_directory').select('id, name').order('name').then(({ data }) => { if (data) setClients(data) })
  }, [])

  useEffect(() => {
    if (!formData.client_id) { setCampanhasDoCliente([]); return }
    const params = new URLSearchParams({ client_id: formData.client_id, periodo: formData.periodo })
    if (formData.data_inicio) params.set('data_inicio', formData.data_inicio)
    if (formData.data_fim) params.set('data_fim', formData.data_fim)

    setLoadingCampanhas(true)
    fetch(`/api/reports/campanhas-periodo?${params.toString()}`)
      .then(res => res.json())
      .then(data => setCampanhasDoCliente(data.campanhas ?? []))
      .finally(() => setLoadingCampanhas(false))
  }, [formData.client_id, formData.periodo, formData.data_inicio, formData.data_fim])

  useEffect(() => {
    if (id && reports.length > 0) {
      const report = reports.find(r => r.id === id)
      if (report) {
        const { id: _, user_id: __, created_at: ___, updated_at: ____, ...rest } = report
        setFormData(rest)
        if (rest.dias_semana) setDiasSelecionados(rest.dias_semana.map(Number))
      }
    }
  }, [id, reports])

  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const text = formData.mensagem_template
    const newText = text.substring(0, start) + variable + text.substring(end)
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
      if (id) await updateRelatorio(id, formData)
      else await createRelatorio(formData)
      router.push('/colaborador/relatorios')
    } catch {
      alert('Erro ao salvar relatório.')
    } finally {
      setLoading(false)
    }
  }

  const previewMessage = useMemo(() => {
    let text = formData.mensagem_template
    variables.forEach(v => { text = text.replaceAll(v.key, v.example) })
    return text
  }, [formData.mensagem_template])

  const selectBtn = (active: boolean) => `flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${active ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted hover:border-primary/40'}`
  const inputCls = 'w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-text-main'

  return (
    <div className="min-h-full bg-background text-text-main">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/colaborador/relatorios')} className="p-2 hover:bg-hover-bg rounded-lg text-text-muted"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-text-main">{id ? 'Editar Relatório' : 'Criar Relatório'}</h1>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6 bg-surface border border-border p-8 rounded-xl shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Nome do Relatório *</label>
            <input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Relatório Diário - Cliente X" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Canal</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, canal: 'meta' })} className={selectBtn(formData.canal === 'meta')}><Facebook size={16} /> Meta</button>
                <button type="button" onClick={() => setFormData({ ...formData, canal: 'google' })} className={selectBtn(formData.canal === 'google')}><Globe size={16} /> Google</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Período</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ value: 'ontem', label: 'Ontem' }, { value: 'ultimos_3_dias', label: 'Últ. 3 dias' }, { value: 'ultimos_7_dias', label: 'Últ. 7 dias' }, { value: 'ultimos_30_dias', label: 'Últ. 30 dias' }, { value: 'personalizado', label: 'Custom' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setFormData({ ...formData, periodo: opt.value as any })}
                    className={`py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${formData.periodo === opt.value ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted'}`}>{opt.label}</button>
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
                <label className="text-xs text-text-muted mb-1 block">Dias de envio</label>
                <div className="grid grid-cols-7 gap-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, i) => (
                    <button key={i} type="button" onClick={() => toggleDia(i)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold ${diasSelecionados.includes(i) ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted'}`}>{dia}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Enviar via</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, enviar_via_agencia: true, recebedor_numero: '' })} className={selectBtn(formData.enviar_via_agencia)}>WhatsApp da agência</button>
                <button type="button" onClick={() => setFormData({ ...formData, enviar_via_agencia: false, recebedor_numero: '' })} className={selectBtn(!formData.enviar_via_agencia)}>Meu WhatsApp</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Recebedor</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, recebedor_tipo: 'privado', recebedor_numero: '' })} className={selectBtn(formData.recebedor_tipo === 'privado')}><Smartphone size={16} /> Privado</button>
                <button type="button" onClick={() => { setFormData({ ...formData, recebedor_tipo: 'grupo', recebedor_numero: '' }); if (wpGroups.length === 0) wpFetchGroups() }} className={selectBtn(formData.recebedor_tipo === 'grupo')}><Users size={16} /> Grupo</button>
              </div>
            </div>
            {formData.recebedor_tipo === 'privado' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">WhatsApp (com DDI) *</label>
                <input required type="text" value={formData.recebedor_numero} onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value.replace(/\D/g, '') })} placeholder="5511999999999" className={inputCls} />
              </div>
            )}
            {formData.recebedor_tipo === 'grupo' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Grupo do WhatsApp *</label>
                {wpLoadingGroups ? (
                  <div className="rounded-xl px-4 py-3 text-xs bg-background border border-border text-text-muted">Carregando grupos...</div>
                ) : wpGroups.length > 0 ? (
                  <select required value={formData.recebedor_numero} onChange={e => setFormData({ ...formData, recebedor_numero: e.target.value })} className={`${inputCls} appearance-none`}>
                    <option value="">Selecione...</option>
                    {wpGroups.map(g => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
                  </select>
                ) : formData.enviar_via_agencia ? (
                  <div className="rounded-xl px-4 py-3 text-xs bg-primary/5 border border-primary/20 text-primary">
                    Nenhum grupo disponível ainda. Peça pro administrador ativar "Permitir que colaboradores vejam meus grupos" em Integrações.
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 text-xs bg-primary/5 border border-primary/20 text-primary">
                    WhatsApp não conectado. <a href="/colaborador/integracoes" className="underline font-semibold">Conecte em Integrações</a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Horário de Envio</label>
            <HourSelect
              value={formData.horario_envio}
              onChange={hora => setFormData({ ...formData, horario_envio: hora })}
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Cliente Vinculado (Opcional)</label>
            <select value={formData.client_id || ''} onChange={e => setFormData({ ...formData, client_id: e.target.value || null })} className={`${inputCls} appearance-none`}>
              <option value="">Selecione um cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {loadingCampanhas && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={12} className="animate-spin" /> Verificando campanhas com resultado no período...
            </div>
          )}

          {!loadingCampanhas && campanhasDoCliente.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-primary font-semibold mb-2">Campanhas com resultado neste período:</p>
              {campanhasDoCliente.map((nome, i) => (
                <p key={i} className="text-xs text-text-main py-0.5"><span className="text-primary font-mono font-bold">&lt;CAMP_{i + 1}&gt;</span> → {nome}</p>
              ))}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => router.push('/colaborador/relatorios')} className="flex-1 border border-border hover:bg-hover-bg text-text-muted py-3 rounded-xl font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-[2] bg-primary hover:bg-primary-hover text-white py-3 px-8 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Relatório
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border p-8 rounded-xl shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-medium text-text-muted">Template da Mensagem</label>
              <div className="flex items-center gap-1 text-[10px] text-text-muted bg-hover-bg px-2 py-1 rounded-md border border-border"><Info size={12} /> Clique nas variáveis</div>
            </div>
            <textarea ref={textareaRef} value={formData.mensagem_template} onChange={e => setFormData({ ...formData, mensagem_template: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-4 py-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none min-h-[250px] font-mono text-sm text-text-main" />
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {variables.map(v => (
                <button key={v.key} type="button" onClick={() => insertVariable(v.key)} className="px-2 py-1.5 bg-background border border-border hover:border-primary hover:text-primary rounded-lg text-[10px] font-bold text-text-muted">{v.key}</button>
              ))}
            </div>
            <div className="mt-8">
              <label className="text-sm font-medium text-text-muted mb-4 block">Preview WhatsApp</label>
              <div className="bg-[#e5ddd5] rounded-xl p-6">
                <div className="flex flex-col items-end">
                  <div className="bg-[#dcf8c6] text-gray-900 p-4 rounded-xl rounded-tr-none shadow-sm max-w-[85%]">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{previewMessage}</pre>
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
    <Suspense fallback={<div className="min-h-full bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>}>
      <CreateEditReportContent />
    </Suspense>
  )
}
