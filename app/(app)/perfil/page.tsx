'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Save, User } from 'lucide-react'

export default function PerfilPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')
      const { data } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .single()
      if (data) {
        setNome(data.name ?? '')
        setRole(data.role ?? '')
      }
      setLoading(false)
    }
    carregar()
  }, [])

  const salvarNome = async () => {
    setSaving(true)
    setMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ name: nome })
      .eq('id', userId)
    setSaving(false)
    if (error) setMsg({ tipo: 'erro', texto: 'Erro ao salvar nome.' })
    else setMsg({ tipo: 'ok', texto: 'Nome atualizado com sucesso!' })
  }

  const trocarSenha = async () => {
    setMsg(null)
    if (!novaSenha || !confirmarSenha) {
      setMsg({ tipo: 'erro', texto: 'Preencha todos os campos de senha.' })
      return
    }
    if (novaSenha !== confirmarSenha) {
      setMsg({ tipo: 'erro', texto: 'As senhas não coincidem.' })
      return
    }
    if (novaSenha.length < 6) {
      setMsg({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSaving(false)
    if (error) setMsg({ tipo: 'erro', texto: 'Erro ao trocar senha.' })
    else {
      setMsg({ tipo: 'ok', texto: 'Senha alterada com sucesso!' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
          <User size={20} color="#00ff88" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl">Meu Perfil</h1>
          <p className="text-gray-400 text-sm">{role === 'admin' ? 'Administrador' : 'Gestor'}</p>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          msg.tipo === 'ok'
            ? 'bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88]'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {msg.texto}
        </div>
      )}

      {/* Nome */}
      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Informações Pessoais</h2>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Email</label>
          <input
            value={email}
            disabled
            className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3 text-gray-500 text-sm cursor-not-allowed"
          />
          <p className="text-gray-600 text-xs mt-1">O email não pode ser alterado.</p>
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Nome de exibição</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00ff88]/50"
          />
        </div>
        <button
          onClick={salvarNome}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: '#00ff88', color: '#0a0f0c' }}
        >
          <Save size={16} />
          Salvar nome
        </button>
      </div>

      {/* Senha */}
      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Alterar Senha</h2>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Nova senha</label>
          <div className="relative">
            <input
              type={verSenha ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha"
              className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00ff88]/50 pr-12"
            />
            <button
              type="button"
              onClick={() => setVerSenha(!verSenha)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Confirmar nova senha</label>
          <div className="relative">
            <input
              type={verConfirmar ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Confirmar nova senha"
              className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00ff88]/50 pr-12"
            />
            <button
              type="button"
              onClick={() => setVerConfirmar(!verConfirmar)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {verConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button
          onClick={trocarSenha}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: '#00ff88', color: '#0a0f0c' }}
        >
          <Save size={16} />
          Alterar senha
        </button>
      </div>
    </div>
  )
}
