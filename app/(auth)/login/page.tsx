'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError('E-mail ou senha inválidos. Tente novamente.')
      setLoading(false)
    } else {
      // Buscar o profile para redirecionar para o papel correto
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profile?.role === 'collaborator') {
          router.replace('/colaborador/dashboard')
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/dashboard')
      }
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
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Glows decorativos suaves */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#1A56DB]/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#1A56DB]/5 to-transparent" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Lado esquerdo — branding */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-[#1E293B]">
              DIGITAL <span className="text-[#1A56DB]">ALPHA</span>
            </h2>
          </div>

          <p className="text-[#64748B] text-sm font-medium tracking-wide mb-1">
            PLATAFORMA INTELIGENTE PARA
          </p>
          <p className="text-[#1A56DB] text-lg font-bold tracking-wide mb-6">
            GESTÃO DE AGÊNCIAS
          </p>

          <p className="text-[#64748B] leading-relaxed mb-8 max-w-md">
            A tecnologia completa que sua agência precisa para atrair, converter, gerir e escalar resultados com inteligência.
          </p>

          <div className="w-10 h-0.5 bg-[#1A56DB] mb-8" />

          <div className="space-y-5">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1A56DB]/5 border border-[#1A56DB]/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-[#1A56DB]" />
                  </div>
                  <div>
                    <p className="text-[#1E293B] font-semibold text-sm">{f.title}</p>
                    <p className="text-[#64748B] text-sm">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lado direito — formulário */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 shadow-xl shadow-[#1A56DB]/5">
            <div className="flex flex-col items-center text-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Digital Alpha" className="h-14 object-contain mb-3" />
              <h1 className="text-[#1E293B] text-2xl font-bold">Bem-vindo de volta</h1>
              <div className="w-10 h-0.5 bg-[#1A56DB] my-3" />
              <p className="text-[#64748B] text-sm">Entre para acessar sua plataforma.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1A56DB]/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#1A56DB]/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1A56DB]/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#1A56DB]/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1A56DB] transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {resetSent && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-[#1A56DB] text-sm">E-mail de redefinição enviado! Verifique sua caixa de entrada.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1A56DB] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1A56DB]/20"
              >
                {loading ? 'Entrando...' : (
                  <>
                    Entrar <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2">
              <ShieldCheck size={16} className="text-[#1A56DB]/50" />
              <button
                onClick={handleResetPassword}
                className="text-sm text-[#64748B] hover:text-[#1A56DB] transition-colors"
              >
                Esqueci <span className="text-[#1A56DB]">minha senha</span>
              </button>
            </div>
          </div>

          <p className="text-center text-[#64748B] text-xs mt-6">
            © 2026 <span className="text-[#1A56DB]">Digital Alpha</span>. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
