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
  KeyRound,
  Shield
} from 'lucide-react'

export default function PerfilAdminPage() {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmNewPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id)

      if (error) throw error

      showToast('success', 'Nome atualizado com sucesso!')
    } catch (error: any) {
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
    if (passwordData.newPassword.length < 6) {
      showToast('error', 'A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      showToast('success', 'Senha atualizada com sucesso!')
      setPasswordData({ newPassword: '', confirmNewPassword: '' })
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao atualizar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30">
          <Shield size={20} className="text-[#00ff88]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 text-xs">Gerencie suas informações e segurança da conta.</p>
        </div>
      </div>

      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-20 right-8 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-right-4 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dados Pessoais */}
        <section className="bg-[#0a0f0c] border border-[#1a3a24] p-5 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <User size={16} />
            </div>
            <h2 className="text-base font-bold text-white">Dados Pessoais</h2>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                <input 
                  type="email" 
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-[#1a3a24]/10 border border-[#1a3a24] rounded-xl pl-9 pr-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-amber-500/70 font-medium">O email não pode ser alterado.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nome de exibição</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cargo</label>
              <div className="bg-[#1a3a24]/10 border border-[#1a3a24] rounded-xl px-3 py-2 text-sm text-gray-400 font-medium">
                {profile?.role === 'admin' ? 'Administrador' : 'Gestor'}
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all disabled:opacity-50 text-sm"
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </section>

        {/* Segurança / Senha */}
        <section className="bg-[#0a0f0c] border border-[#1a3a24] p-5 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Lock size={16} />
            </div>
            <h2 className="text-base font-bold text-white">Segurança</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <AlertCircle size={14} className="rotate-45" /> : <KeyRound size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  required
                  value={passwordData.confirmNewPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmNewPassword: e.target.value})}
                  placeholder="Repita a nova senha"
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showConfirm ? <AlertCircle size={14} className="rotate-45" /> : <KeyRound size={14} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-[#0a0f0c] font-bold rounded-xl transition-all disabled:opacity-50 text-sm"
            >
              <KeyRound size={16} />
              {loading ? 'Processando...' : 'Atualizar Senha'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
