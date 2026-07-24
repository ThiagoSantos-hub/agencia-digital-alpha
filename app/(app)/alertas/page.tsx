'use client'

import { useState } from 'react'
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
  X,
  Save,
  Loader2
} from 'lucide-react'
import { useAlertas, Alert, AlertInput } from '@/hooks/useAlertas'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { FeatureLock } from '@/components/ui/FeatureLock'

export default function AlertasPage() {
  const { alerts, loading, createAlerta, updateAlerta, deleteAlerta, toggleAtivo } = useAlertas()
  const { groups: wpGroups, loadingGroups: wpLoadingGroups, fetchGroups: wpFetchGroups } = useWhatsApp()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<AlertInput>({
    nome: '',
    tipo: 'saldo_minimo',
    canal: 'meta',
    conta_anuncio: '',
    saldo_minimo: null,
    recebedor_tipo: 'privado',
    recebedor_numero: '',
    mensagem_template: '',
    ativo: true
  })

  const handleOpenModal = (alert?: Alert) => {
    if (alert) {
      setEditingAlert(alert)
      const { id, user_id, created_at, updated_at, ...rest } = alert
      setFormData(rest)
    } else {
      setEditingAlert(null)
      setFormData({
        nome: '',
        tipo: 'saldo_minimo',
        canal: 'meta',
        conta_anuncio: '',
        saldo_minimo: 0,
        recebedor_tipo: 'privado',
        recebedor_numero: '',
        mensagem_template: '⚠️ ALERTA DE SALDO MÍNIMO\n\nConta: <CA>\nSaldo Atual: <SALDO>\nLimite: <TARGET>',
        ativo: true
      })
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
    const { id, user_id, created_at, updated_at, ...rest } = alert
    try {
      await createAlerta({
        ...rest,
        nome: `${rest.nome} (Cópia)`
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este alerta?')) {
      await deleteAlerta(id)
    }
  }

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      mensagem_template: prev.mensagem_template + variable
    }))
  }

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

      {/* Grid de Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface border border-border h-48 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border rounded-xl shadow-sm">
          <Bell size={48} className="text-text-disabled mb-4" />
          <p className="text-text-main font-medium">Nenhum alerta criado ainda</p>
          <button 
            onClick={() => handleOpenModal()}
            className="mt-4 text-primary hover:underline text-sm font-medium"
          >
            Criar meu primeiro alerta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-surface border border-border p-6 rounded-xl flex flex-col justify-between hover:border-primary/40 transition-colors group shadow-sm">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-text-main">{alert.nome}</h3>
                  {alert.canal === 'meta' ? (
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
                  ) : (
                    <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1 border border-red-200">
                      <AlertTriangle size={10} /> Erro na Conta
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-text-muted">
                  <p>Conta: <span className="text-text-main">{alert.conta_anuncio}</span></p>
                  {alert.tipo === 'saldo_minimo' && (
                    <p>Saldo mínimo: <span className="text-amber-600 font-bold">R$ {alert.saldo_minimo}</span></p>
                  )}
                </div>
              </div>

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
                  <button onClick={() => handleDelete(alert.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-text-muted hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase">Tipo de Alerta</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'saldo_minimo'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.tipo === 'saldo_minimo' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <DollarSign size={14} /> Saldo Mínimo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'erro_conta'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.tipo === 'erro_conta' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <AlertTriangle size={14} /> Erro na Conta
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase">Canal</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, canal: 'meta'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.canal === 'meta' ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <Facebook size={14} /> Meta Ads
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, canal: 'google'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.canal === 'google' ? 'bg-red-50 border-red-300 text-red-600' : 'bg-background border-border text-text-muted'
                      }`}
                    >
                      <Globe size={14} /> Google Ads
                    </button>
                  </div>
                </div>
              </div>

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
                    {formData.tipo === 'saldo_minimo' ? (
                      ['<CA>', '<SALDO>', '<TARGET>'].map(v => (
                        <button key={v} type="button" onClick={() => insertVariable(v)} className="text-[9px] bg-hover-bg px-1.5 py-0.5 rounded text-text-muted hover:text-text-main border border-border">{v}</button>
                      ))
                    ) : (
                      ['<CA>', '<ACT_STATUS>', '<STATUS_DESCRIPTION>'].map(v => (
                        <button key={v} type="button" onClick={() => insertVariable(v)} className="text-[9px] bg-hover-bg px-1.5 py-0.5 rounded text-text-muted hover:text-text-main border border-border">{v}</button>
                      ))
                    )}
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
    </div>
  )
}
