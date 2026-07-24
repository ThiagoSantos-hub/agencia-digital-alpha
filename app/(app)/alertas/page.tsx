'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Bell,
  Facebook,
  Globe,
  Trash2,
  Edit2,
  Copy,
  Smartphone,
  Users,
  AlertTriangle,
  DollarSign,
  Wallet,
  CheckCircle2,
  X,
  Save,
  Loader2,
  Search
} from 'lucide-react'
import { useAlertas, Alert, AlertInput } from '@/hooks/useAlertas'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { createClient } from '@/lib/supabase'
import { FeatureLock } from '@/components/ui/FeatureLock'
import { useViewMode } from '@/hooks/useViewMode'
import { ViewModeToggle } from '@/components/ui/ViewModeToggle'
import { AlertsTable } from '@/components/alertas/AlertsTable'

const fmtData = (d: string | null) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—'
const hojeISO = () => new Date().toISOString().split('T')[0]
const isVencido = (alert: Alert) => alert.tipo === 'fundo_cliente' && !!alert.proximo_vencimento && alert.proximo_vencimento <= hojeISO()

const PERIODICIDADE_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  anual: 'Anual',
}

const inputVazio: AlertInput = {
  nome: '',
  tipo: 'saldo_minimo',
  canal: 'meta',
  conta_anuncio: '',
  saldo_minimo: 0,
  recebedor_tipo: 'privado',
  recebedor_numero: '',
  mensagem_template: '⚠️ ALERTA DE SALDO MÍNIMO\n\nConta: <CA>\nSaldo Atual: <SALDO>\nLimite: <TARGET>',
  ativo: true,
  client_id: null,
  periodicidade: null,
  valor_fundo: null,
  proximo_vencimento: null,
  horario_envio: '09:00',
  forma_pagamento: null,
}

export default function AlertasPage() {
  const { alerts, loading, createAlerta, updateAlerta, deleteAlerta, toggleAtivo, marcarFundoColocado } = useAlertas()
  const { groups: wpGroups, loadingGroups: wpLoadingGroups, fetchGroups: wpFetchGroups } = useWhatsApp()
  const [viewMode, setViewMode] = useViewMode('view_mode_alertas', 'cards')
  const [searchQuery, setSearchQuery] = useState('')

  // Fundo vencido sempre na frente, pra chamar atenção antes dos que ainda
  // estão em dia, mantém a ordem original (mais recente primeiro) dentro de
  // cada grupo.
  const sortedAlerts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtrados = !query
      ? alerts
      : alerts.filter(a => a.nome.toLowerCase().includes(query) || a.client?.name?.toLowerCase().includes(query))
    return [...filtrados].sort((a, b) => Number(isVencido(b)) - Number(isVencido(a)))
  }, [alerts, searchQuery])

  const [clients, setClients] = useState<{ id: string; name: string; meta_ad_account_id: string | null }[]>([])
  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('id, name, meta_ad_account_id').order('name')
      .then(({ data }) => setClients(data ?? []))
  }, [])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  const [formData, setFormData] = useState<AlertInput>(inputVazio)

  const handleOpenModal = (alert?: Alert) => {
    if (alert) {
      setEditingAlert(alert)
      const { id, user_id, created_at, updated_at, creator, client, last_status, ...rest } = alert
      setFormData(rest)
    } else {
      setEditingAlert(null)
      setFormData(inputVazio)
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingAlert) {
        await updateAlerta(editingAlert.id, formData)
      } else {
        await createAlerta(formData)
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async (alert: Alert) => {
    const { id, user_id, created_at, updated_at, creator, client, last_status, ...rest } = alert
    try {
      await createAlerta({
        ...rest,
        nome: `${rest.nome} (Cópia)`
      })
    } catch (error) {
      console.error(error)
    }
  }

  const [deletingAlert, setDeletingAlert] = useState<Alert | null>(null)

  const confirmDelete = async () => {
    if (!deletingAlert) return
    await deleteAlerta(deletingAlert.id)
    setDeletingAlert(null)
  }

  const handleMarcarFundo = async (alert: Alert) => {
    setMarcandoId(alert.id)
    try {
      await marcarFundoColocado(alert)
    } catch (error) {
      console.error(error)
    } finally {
      setMarcandoId(null)
    }
  }

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      mensagem_template: prev.mensagem_template + variable
    }))
  }

  const handleSelecionarCliente = (clientId: string) => {
    const cliente = clients.find(c => c.id === clientId)
    setFormData(prev => ({
      ...prev,
      client_id: clientId || null,
      conta_anuncio: cliente?.meta_ad_account_id || '',
    }))
  }

  // Troca o tipo de alerta e já ajusta o template padrão pra combinar com as
  // variáveis daquele tipo, sem isso trocar de tipo mantinha o texto (e as
  // variáveis) do tipo anterior, que não faziam sentido pro novo.
  const handleTipoChange = (tipo: AlertInput['tipo'], defaultTemplate: string, canal?: AlertInput['canal']) => {
    setFormData(prev => ({
      ...prev,
      tipo,
      ...(canal ? { canal } : {}),
      mensagem_template: prev.mensagem_template && prev.tipo === tipo ? prev.mensagem_template : defaultTemplate,
    }))
  }

  const handleTipoFundo = () => handleTipoChange(
    'fundo_cliente',
    '💰 LEMBRETE DE FUNDO\n\nCliente: <CLIENTE>\nValor: <VALOR>\nPagamento: <PAGAMENTO>\nVencimento: <VENCIMENTO>',
    'meta'
  )

  return (
    <div className="min-h-full bg-background text-text-main">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-text-main">
            <Bell className="text-primary" />
            Alertas
          </h1>
          <p className="text-text-muted text-sm">Configure notificações automáticas para suas contas</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
        >
          <Plus size={18} />
          Criar Alerta
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-2 rounded-lg flex-1 min-w-[220px]">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alerta pelo nome ou cliente..."
            className="bg-transparent outline-none text-sm text-text-main placeholder:text-text-disabled w-full"
          />
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'tabela' ? (
        <AlertsTable
          alerts={sortedAlerts}
          loading={loading}
          accentActive="bg-primary"
          marcandoId={marcandoId}
          onToggleAtivo={toggleAtivo}
          onEdit={handleOpenModal}
          onDuplicate={handleDuplicate}
          onDelete={setDeletingAlert}
          onMarcarFundo={handleMarcarFundo}
          onCreateFirst={() => handleOpenModal()}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface border border-border h-48 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sortedAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border rounded-xl shadow-sm">
          <Bell size={48} className="text-text-disabled mb-4" />
          <p className="text-text-main font-medium">{alerts.length === 0 ? 'Nenhum alerta criado ainda' : 'Nenhum alerta encontrado'}</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 text-primary hover:underline text-sm font-medium"
          >
            Criar meu primeiro alerta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedAlerts.map((alert) => {
            const vencido = isVencido(alert)
            return (
            <div key={alert.id} className="bg-surface border border-border p-6 rounded-xl flex flex-col justify-between hover:border-primary/40 transition-colors group shadow-sm">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-text-main">{alert.nome}</h3>
                  {alert.tipo === 'fundo_cliente' ? (
                    <Wallet size={18} className="text-cta" />
                  ) : alert.canal === 'meta' ? (
                    <Facebook size={18} className="text-primary" />
                  ) : (
                    <Globe size={18} className="text-red-500" />
                  )}
                </div>
                <p className="text-xs text-text-muted mb-4">Criado por: {alert.creator?.name || alert.creator?.email || 'Desconhecido'}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {alert.tipo === 'saldo_minimo' ? (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1 border border-amber-200">
                      <DollarSign size={10} /> Saldo Mínimo
                    </span>
                  ) : alert.tipo === 'erro_conta' ? (
                    <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1 border border-red-200">
                      <AlertTriangle size={10} /> Erro na Conta
                    </span>
                  ) : (
                    <span className="bg-cta/10 text-cta text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1 border border-cta/20">
                      <Wallet size={10} /> Fundo de Cliente
                    </span>
                  )}
                  {vencido && (
                    <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-red-200">
                      Vencido
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-text-muted">
                  {alert.tipo === 'fundo_cliente' ? (
                    <>
                      <p>Cliente: <span className="text-text-main">{alert.client?.name ?? '—'}</span></p>
                      <p>Valor: <span className="text-cta font-bold">R$ {Number(alert.valor_fundo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      <p>Pagamento: <span className="text-text-main">{alert.forma_pagamento === 'boleto' ? 'Boleto' : alert.forma_pagamento === 'pix' ? 'Pix' : '—'}</span></p>
                      <p>Repete: <span className="text-text-main">{alert.periodicidade ? PERIODICIDADE_LABELS[alert.periodicidade] : '—'}</span> às <span className="text-text-main">{alert.horario_envio || '—'}</span></p>
                      <p>Próximo vencimento: <span className={vencido ? 'text-red-600 font-bold' : 'text-text-main'}>{fmtData(alert.proximo_vencimento)}</span></p>
                    </>
                  ) : (
                    <>
                      <p>Conta: <span className="text-text-main">{alert.conta_anuncio}</span></p>
                      {alert.tipo === 'saldo_minimo' && (
                        <p>Saldo mínimo: <span className="text-amber-600 font-bold">R$ {alert.saldo_minimo}</span></p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {alert.tipo === 'fundo_cliente' && (
                <button
                  onClick={() => handleMarcarFundo(alert)}
                  disabled={marcandoId === alert.id}
                  className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cta/10 text-cta border border-cta/30 text-xs font-bold hover:bg-cta/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> {marcandoId === alert.id ? 'Salvando...' : 'Marcar fundo colocado'}
                </button>
              )}

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                <button
                  onClick={() => toggleAtivo(alert.id, !alert.ativo)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${alert.ativo ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${alert.ativo ? 'right-1' : 'left-1'}`} />
                </button>

                <div className="flex items-center gap-3">
                  <button onClick={() => handleOpenModal(alert)} className="p-1.5 hover:bg-hover-bg rounded-lg text-text-muted hover:text-text-main transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <FeatureLock featureKey="alertas.duplicar" variant="replace">
                    <button onClick={() => handleDuplicate(alert)} className="p-1.5 hover:bg-hover-bg rounded-lg text-text-muted hover:text-text-main transition-colors">
                      <Copy size={16} />
                    </button>
                  </FeatureLock>
                  <button onClick={() => setDeletingAlert(alert)} className="p-1.5 hover:bg-red-50 rounded-lg text-text-muted hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-surface border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-main">{editingAlert ? 'Editar Alerta' : 'Criar Alerta'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-hover-bg rounded-lg text-text-muted">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase">Nome do Alerta</label>
                <input
                  required
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-text-main"
                  placeholder="Ex: Alerta de Saldo - Alpha"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase">Tipo de Alerta</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('saldo_minimo', '⚠️ ALERTA DE SALDO MÍNIMO\n\nConta: <CA>\nSaldo Atual: <SALDO>\nLimite: <TARGET>')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                      formData.tipo === 'saldo_minimo' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-background border-border text-text-muted'
                    }`}
                  >
                    <DollarSign size={14} /> Saldo Mínimo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('erro_conta', '🚨 ERRO NA CONTA\n\nConta: <CA>\nStatus: <STATUS_DESCRIPTION>')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                      formData.tipo === 'erro_conta' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-background border-border text-text-muted'
                    }`}
                  >
                    <AlertTriangle size={14} /> Erro na Conta
                  </button>
                  <button
                    type="button"
                    onClick={handleTipoFundo}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                      formData.tipo === 'fundo_cliente' ? 'bg-cta/10 border-cta/40 text-cta' : 'bg-background border-border text-text-muted'
                    }`}
                  >
                    <Wallet size={14} /> Fundo de Cliente
                  </button>
                </div>
              </div>

              {formData.tipo === 'fundo_cliente' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase">Cliente</label>
                    <select
                      required
                      value={formData.client_id ?? ''}
                      onChange={e => handleSelecionarCliente(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase">Valor do Fundo (R$)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valor_fundo ?? ''}
                        onChange={e => setFormData({...formData, valor_fundo: parseFloat(e.target.value) || 0})}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main"
                        placeholder="500.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase">Próximo Vencimento</label>
                      <input
                        required
                        type="date"
                        value={formData.proximo_vencimento ?? ''}
                        onChange={e => setFormData({...formData, proximo_vencimento: e.target.value})}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase">Horário do Lembrete</label>
                      <input
                        required
                        type="time"
                        value={formData.horario_envio ?? '09:00'}
                        onChange={e => setFormData({...formData, horario_envio: e.target.value})}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase">Forma de Pagamento</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, forma_pagamento: 'pix'})}
                          className={`py-2 rounded-xl border text-xs font-medium transition-colors ${
                            formData.forma_pagamento === 'pix' ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted'
                          }`}
                        >
                          Pix
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, forma_pagamento: 'boleto'})}
                          className={`py-2 rounded-xl border text-xs font-medium transition-colors ${
                            formData.forma_pagamento === 'boleto' ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted'
                          }`}
                        >
                          Boleto
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase">Repetir</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['semanal', 'quinzenal', 'mensal', 'anual'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({...formData, periodicidade: p})}
                          className={`py-2 rounded-xl border text-xs font-medium transition-colors ${
                            formData.periodicidade === p ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted'
                          }`}
                        >
                          {PERIODICIDADE_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase">Conta de Anúncio</label>
                    <input
                      required
                      type="text"
                      value={formData.conta_anuncio}
                      onChange={e => setFormData({...formData, conta_anuncio: e.target.value})}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main"
                      placeholder="act_123456789"
                    />
                  </div>
                  {formData.tipo === 'saldo_minimo' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase">Saldo Mínimo (R$)</label>
                      <input
                        required
                        type="number"
                        value={formData.saldo_minimo || ''}
                        onChange={e => setFormData({...formData, saldo_minimo: Number(e.target.value)})}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main"
                        placeholder="100.00"
                      />
                    </div>
                  )}
                </div>
              )}

              {formData.tipo !== 'fundo_cliente' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase">Canal</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, canal: 'meta'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm justify-center ${
                        formData.canal === 'meta' ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <Facebook size={14} /> Meta Ads
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, canal: 'google'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm justify-center ${
                        formData.canal === 'google' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <Globe size={14} /> Google Ads
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase">Recebedor</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, recebedor_tipo: 'privado'})}
                      className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                        formData.recebedor_tipo === 'privado' ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <Smartphone size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, recebedor_tipo: 'grupo', recebedor_numero: ''})
                        if (wpGroups.length === 0) wpFetchGroups()
                      }}
                      className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                        formData.recebedor_tipo === 'grupo' ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <Users size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase">
                    {formData.recebedor_tipo === 'grupo' ? 'Grupo do WhatsApp' : 'WhatsApp'}
                  </label>
                  {formData.recebedor_tipo === 'grupo' ? (
                    wpLoadingGroups ? (
                      <div className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-text-muted">Carregando grupos...</div>
                    ) : wpGroups.length > 0 ? (
                      <select
                        required
                        value={formData.recebedor_numero}
                        onChange={e => setFormData({...formData, recebedor_numero: e.target.value})}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main appearance-none"
                      >
                        <option value="">Selecione...</option>
                        {wpGroups.map(g => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
                      </select>
                    ) : (
                      <div className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 text-xs text-primary">
                        Nenhum grupo encontrado. Conecte o WhatsApp em Integrações.
                      </div>
                    )
                  ) : (
                    <input
                      required
                      type="text"
                      value={formData.recebedor_numero}
                      onChange={e => setFormData({...formData, recebedor_numero: e.target.value.replace(/\D/g, '')})}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm text-text-main"
                      placeholder="5511999999999"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-text-muted uppercase">Template da Mensagem</label>
                  <div className="flex gap-1">
                    {(formData.tipo === 'saldo_minimo'
                      ? ['<CA>', '<SALDO>', '<TARGET>']
                      : formData.tipo === 'erro_conta'
                      ? ['<CA>', '<ACT_STATUS>', '<STATUS_DESCRIPTION>']
                      : ['<CLIENTE>', '<VALOR>', '<PAGAMENTO>', '<VENCIMENTO>']
                    ).map(v => (
                      <button key={v} type="button" onClick={() => insertVariable(v)} className="text-[9px] bg-hover-bg px-1.5 py-0.5 rounded text-text-muted hover:text-text-main border border-border">{v}</button>
                    ))}
                  </div>
                </div>
                <textarea
                  required
                  value={formData.mensagem_template}
                  onChange={e => setFormData({...formData, mensagem_template: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm min-h-[100px] resize-none text-text-main"
                  placeholder="Digite o template do alerta..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-transparent border border-border hover:bg-hover-bg text-text-muted py-2.5 rounded-xl transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingAlert(null)} />
          <div className="relative w-full max-w-sm bg-surface border border-red-200 rounded-xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-text-main font-semibold text-center mb-1">Excluir alerta?</h3>
            <p className="text-text-muted text-sm text-center mb-6">
              Tem certeza que deseja excluir <span className="font-semibold text-text-main">{deletingAlert.nome}</span>? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingAlert(null)} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:text-text-main transition-colors">Não</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">Sim, excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
