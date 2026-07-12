'use client'

import { useState, useMemo } from 'react'
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

export default function AlertasPage() {
  const { alerts, loading, createAlerta, updateAlerta, deleteAlerta, toggleAtivo } = useAlertas()
  
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="text-[#1A56DB]" />
            Alertas
          </h1>
          <p className="text-[#64748B] text-sm">Configure notificações automáticas para suas contas</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#1A56DB] hover:bg-[#1E40AF] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
        >
          <Plus size={18} />
          Criar Alerta
        </button>
      </div>

      {/* Grid de Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm h-48 animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
          <Bell size={48} className="text-[#94A3B8] mb-4" />
          <p className="text-[#64748B] font-medium">Nenhum alerta criado ainda</p>
          <button 
            onClick={() => handleOpenModal()}
            className="mt-4 text-[#1A56DB] hover:underline text-sm font-medium"
          >
            Criar meu primeiro alerta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between hover:border-[#1A56DB]/50 group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-[#1E293B]">{alert.nome}</h3>
                  {alert.canal === 'meta' ? (
                    <Facebook size={18} className="text-blue-600" />
                  ) : (
                    <Globe size={18} className="text-red-600" />
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {alert.tipo === 'saldo_minimo' ? (
                    <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1">
                      <DollarSign size={10} /> Saldo Mínimo
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1">
                      <AlertTriangle size={10} /> Erro na Conta
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-[#64748B]">
                  <p>Conta: <span className="text-[#1E293B] font-medium">{alert.conta_anuncio}</span></p>
                  {alert.tipo === 'saldo_minimo' && (
                    <p>Saldo mínimo: <span className="text-yellow-600 font-bold">R$ {alert.saldo_minimo}</span></p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex justify-between items-center">
                <button 
                  onClick={() => toggleAtivo(alert.id, !alert.ativo)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${alert.ativo ? 'bg-[#1A56DB]' : 'bg-[#E2E8F0]'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${alert.ativo ? 'right-1' : 'left-1'}`} />
                </button>

                <div className="flex items-center gap-3">
                  <button onClick={() => handleOpenModal(alert)} className="p-1.5 hover:bg-[#F8FAFC] rounded-lg text-[#64748B] hover:text-[#1A56DB] transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDuplicate(alert)} className="p-1.5 hover:bg-[#F8FAFC] rounded-lg text-[#64748B] hover:text-[#1A56DB] transition-colors">
                    <Copy size={16} />
                  </button>
                  <button onClick={() => handleDelete(alert.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-[#64748B] hover:text-red-600 transition-colors">
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
          <div className="absolute inset-0 bg-[#1E293B]/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-white border border-[#E2E8F0] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#F1F5F9] flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1E293B]">{editingAlert ? 'Editar Alerta' : 'Criar Alerta'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#F8FAFC] rounded-lg text-[#64748B]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase">Nome do Alerta</label>
                <input 
                  required
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none text-[#1E293B] focus:border-[#1A56DB] transition-colors placeholder:text-[#94A3B8]"
                  placeholder="Ex: Alerta de Saldo - Alpha"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Tipo de Alerta</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'saldo_minimo'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.tipo === 'saldo_minimo' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <DollarSign size={14} /> Saldo Mínimo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'erro_conta'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.tipo === 'erro_conta' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <AlertTriangle size={14} /> Erro na Conta
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Canal</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, canal: 'meta'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.canal === 'meta' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <Facebook size={14} /> Meta Ads
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, canal: 'google'})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                        formData.canal === 'google' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <Globe size={14} /> Google Ads
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Conta de Anúncio</label>
                  <input 
                    required
                    type="text"
                    value={formData.conta_anuncio}
                    onChange={e => setFormData({...formData, conta_anuncio: e.target.value})}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none text-[#1E293B] focus:border-[#1A56DB] transition-colors text-sm placeholder:text-[#94A3B8]"
                    placeholder="act_123456789"
                  />
                </div>
                {formData.tipo === 'saldo_minimo' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#64748B] uppercase">Saldo Mínimo (R$)</label>
                    <input 
                      required
                      type="number"
                      value={formData.saldo_minimo || ''}
                      onChange={e => setFormData({...formData, saldo_minimo: Number(e.target.value)})}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none text-[#1E293B] focus:border-[#1A56DB] transition-colors text-sm placeholder:text-[#94A3B8]"
                      placeholder="100.00"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Recebedor</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, recebedor_tipo: 'privado'})}
                      className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                        formData.recebedor_tipo === 'privado' ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <Smartphone size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, recebedor_tipo: 'grupo'})}
                      className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                        formData.recebedor_tipo === 'grupo' ? 'bg-[#1A56DB]/10 border-[#1A56DB] text-[#1A56DB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <Users size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#64748B] uppercase">WhatsApp</label>
                  <input 
                    required
                    type="text"
                    value={formData.recebedor_numero}
                    onChange={e => setFormData({...formData, recebedor_numero: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none text-[#1E293B] focus:border-[#1A56DB] transition-colors text-sm placeholder:text-[#94A3B8]"
                    placeholder="5511999999999"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Template da Mensagem</label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => insertVariable('<CA>')} className="text-[10px] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] px-1.5 py-0.5 rounded border border-[#E2E8F0]">Conta</button>
                    <button type="button" onClick={() => insertVariable('<SALDO>')} className="text-[10px] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] px-1.5 py-0.5 rounded border border-[#E2E8F0]">Saldo</button>
                    <button type="button" onClick={() => insertVariable('<TARGET>')} className="text-[10px] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] px-1.5 py-0.5 rounded border border-[#E2E8F0]">Limite</button>
                  </div>
                </div>
                <textarea 
                  required
                  rows={4}
                  value={formData.mensagem_template}
                  onChange={e => setFormData({...formData, mensagem_template: e.target.value})}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 outline-none text-[#1E293B] focus:border-[#1A56DB] transition-colors text-sm resize-none placeholder:text-[#94A3B8]"
                  placeholder="Escreva a mensagem que será enviada..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] text-[#64748B] font-bold rounded-xl hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#1A56DB] hover:bg-[#1E40AF] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingAlert ? 'Salvar Alterações' : 'Criar Alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
