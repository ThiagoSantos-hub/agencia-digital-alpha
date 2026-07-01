'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
  Infinity as InfinityIcon,
  Users,
  BarChart2,
} from 'lucide-react'

const features = [
  { icon: TrendingUp, title: 'Dashboards Inteligentes', desc: 'Visualize métricas em tempo real.' },
  { icon: MessageCircle, title: 'Integração com WhatsApp', desc: 'Atendimento e automações na prática.' },
  { icon: InfinityIcon, title: 'Gestão de Tráfego', desc: 'Acompanhe campanhas e resultados.' },
  { icon: Users, title: 'CRM Avançado', desc: 'Gerencie leads e clientes com eficiência.' },
  { icon: BarChart2, title: 'Relatórios Automáticos', desc: 'Dados precisos para decisões melhores.' },
]

const LOGO_URL = 'https://automacaothiagosantos.com.br/wp-content/uploads/2026/06/Design-sem-nome-14.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const { signIn } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError('E-mail ou senha inválidos. Tente novamente.')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Digite seu e-mail acima para redefinir a senha.')
      return
    }
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    })
    setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-[#060a08] relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Glows decorativos */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-emerald-500/10 to-transparent" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Lado esquerdo — branding */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-white">
              DIGITAL <span className="text-emerald-400">ALPHA</span>
            </h2>
          </div>

          <p className="text-gray-400 text-sm font-medium tracking-wide mb-1">
            PLATAFORMA INTELIGENTE PARA
          </p>
          <p className="text-emerald-400 text-lg font-bold tracking-wide mb-6">
            GESTÃO DE AGÊNCIAS
          </p>

          <p className="text-gray-400 leading-relaxed mb-8 max-w-md">
            A tecnologia completa que sua agência precisa para atrair, converter, gerir e escalar resultados com inteligência.
          </p>

          <div className="w-10 h-0.5 bg-emerald-500 mb-8" />

          <div className="space-y-5">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-gray-500 text-sm">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lado direito — formulário */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#0d1310]/80 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl shadow-emerald-500/5">
            <div className="flex flex-col items-center text-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Digital Alpha" className="h-14 object-contain mb-3" />
              <h1 className="text-white text-2xl font-bold">Bem-vindo de volta</h1>
              <div className="w-10 h-0.5 bg-emerald-500 my-3" />
              <p className="text-gray-500 text-sm">Entre para acessar sua plataforma.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-emerald-500/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-black/40 border border-emerald-500/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {resetSent && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <p className="text-emerald-400 text-sm">E-mail de redefinição enviado! Verifique sua caixa de entrada.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {loading ? 'Entrando...' : (
                  <>
                    Entrar <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500/50" />
              <button
                onClick={handleResetPassword}
                className="text-sm text-gray-500 hover:text-emerald-400 transition-colors"
              >
                Esqueci <span className="text-emerald-400">minha senha</span>
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            © 2026 <span className="text-emerald-400">Digital Alpha</span>. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
