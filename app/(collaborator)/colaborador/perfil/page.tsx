'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { User, Mail, Lock, Save, AlertCircle, CheckCircle2, KeyRound, UserCircle } from 'lucide-react'

export default function PerfilColaboradorPage() {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [cargo, setCargo] = useState('')
  const [sendingResetEmail, setSendingResetEmail] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (profile) setName(profile.name || '')
    if (user) {
      supabase.from('collaborators').select('role').eq('email', user.email).single()
        .then(({ data }) => { if (data?.role) setCargo(data.role) })
    }
  }, [profile, user])

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error: profileError } = await supabase.from('profiles').update({ name }).eq('id', user.id)
      if (profileError) throw profileError
      const { error: collabError } = await supabase.from('collaborators').update({ name }).eq('user_id', user.id)
      if (collabError) throw collabError
      showToast('success', 'Nome atualizado com sucesso!')
    } catch {
      showToast('error', 'Falha ao atualizar nome.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPasswordChange = async () => {
    setSendingResetEmail(true)
    try {
      const res = await fetch('/api/auth/request-password-change', { method: 'POST' })
      if (!res.ok) throw new Error()
      showToast('success', 'Enviamos um e-mail de confirmação. Clique no link para definir a nova senha.')
    } catch {
      showToast('error', 'Falha ao enviar e-mail de confirmação.')
    } finally {
      setSendingResetEmail(false)
    }
  }

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
          <UserCircle size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-main">Meu Perfil</h1>
          <p className="text-text-muted text-xs">Gerencie suas informações e segurança da conta.</p>
        </div>
      </div>

      {message && (
        <div className={`fixed top-20 right-8 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-right-4 ${
          message.type === 'success'
            ? 'bg-cta/10 border-cta/50 text-cta'
            : 'bg-red-50 border-red-200 text-red-500'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-surface border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <User size={16} />
            </div>
            <h2 className="text-base font-bold text-text-main">Dados Pessoais</h2>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" size={14} />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-hover-bg/10 border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-muted cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-amber-600 font-medium">O email não pode ser alterado.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nome de exibição</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Cargo</label>
              <div className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-text-muted font-medium">
                {cargo || 'Colaborador'}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-sm"
            >
              <Save size={16} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </section>

        <section className="bg-surface border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Lock size={16} />
            </div>
            <h2 className="text-base font-bold text-text-main">Segurança</h2>
          </div>

          <p className="text-xs text-text-muted mb-3">
            Por segurança, a troca de senha precisa ser confirmada pelo seu e-mail de cadastro. Clique no botão abaixo, confirme no link que chegar no seu e-mail, e defina a nova senha por lá.
          </p>
          <button
            type="button"
            onClick={handleRequestPasswordChange}
            disabled={sendingResetEmail}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-sm"
          >
            <KeyRound size={16} />
            {sendingResetEmail ? 'Enviando...' : 'Enviar e-mail para trocar senha'}
          </button>
        </section>
      </div>
    </div>
  )
}
