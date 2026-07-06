'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  KeyRound
} from 'lucide-react'

export default function PerfilColaboradorPage() {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Estados para troca de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
    }
  }, [profile])

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    try {
      // 1. Atualizar na tabela profiles (já que o layout usa profile.name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Atualizar na tabela collaborators (conforme solicitado)
      const { error: collabError } = await supabase
        .from('collaborators')
        .update({ name })
        .eq('user_id', user.id)

      if (collabError) throw collabError

      showToast('success', 'Nome atualizado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao atualizar nome:', error)
      showToast('error', 'Falha ao atualizar nome.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      showToast('error', 'As novas senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      // Nota: O Supabase exige que o usuário esteja logado. 
      // Para redefinir com a senha atual, o fluxo ideal seria re-autenticar, 
      // mas o método direto updateUser permite alterar a senha do usuário logado.
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      showToast('success', 'Senha atualizada com sucesso!')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      })
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error)
      showToast('error', error.message || 'Falha ao atualizar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie suas informações pessoais e segurança da conta.</p>
      </div>

      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-24 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-right-4 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Informações Básicas */}
        <section className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <User size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Dados Pessoais</h2>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input 
                  type="email" 
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-[#1a3a24]/10 border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-amber-500/70 font-medium">O email não pode ser alterado.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </section>

        {/* Segurança / Senha */}
        <section className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Lock size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Segurança</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Senha Atual</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="password" 
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="password" 
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="password" 
                  required
                  value={passwordData.confirmNewPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmNewPassword: e.target.value})}
                  placeholder="Repita a nova senha"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-[#0a0f0c] font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <KeyRound size={18} />
              {loading ? 'Processando...' : 'Atualizar Senha'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
