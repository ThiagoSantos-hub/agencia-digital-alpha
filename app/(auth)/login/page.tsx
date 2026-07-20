'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  BarChart2,
} from 'lucide-react'

const features = [
  { icon: TrendingUp, title: 'Dashboards Inteligentes', desc: 'Visualize métricas em tempo real.' },
  { icon: MessageCircle, title: 'Integração com WhatsApp', desc: 'Atendimento e automações na prática.' },
  { icon: InfinityIcon, title: 'Gestão de Tráfego', desc: 'Acompanhe campanhas e resultados.' },
  { icon: BarChart2, title: 'Relatórios Automáticos', desc: 'Dados precisos para decisões melhores.' },
]

const LOGO_URL = 'https://automacaothiagosantos.com.br/wp-content/uploads/2026/06/Design-sem-nome-14.png'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('error') === 'empresa_inativa') {
      setError('O acesso da sua empresa foi desativado. Fale com quem administra sua conta na plataforma.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError('E-mail ou senha inválidos. Tente novamente.')
      setLoading(false)
    } else {
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
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Glows decorativos suaves com a cor da marca */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-ai/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Lado esquerdo — branding */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-text-main font-black text-2xl tracking-tight">DIGITAL</span>
            <span className="text-primary font-black text-2xl tracking-tight">ALPHA</span>
          </div>

          <p className="text-text-muted text-sm font-medium tracking-wide mb-1">
            PLATAFORMA INTELIGENTE PARA
          </p>
          <p className="text-primary text-lg font-bold tracking-wide mb-6">
            GESTÃO DE AGÊNCIAS
          </p>

          <p className="text-text-muted leading-relaxed mb-8 max-w-md">
            O sistema operacional de agência com IA embutida. Controle total de campanhas, clientes, equipe e financeiro — de onde você estiver.
          </p>

          <div className="w-10 h-0.5 bg-primary mb-8" />

          <div className="space-y-5">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-text-main font-semibold text-sm">{f.title}</p>
                    <p className="text-text-muted text-sm">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lado direito — formulário */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
            <div className="flex flex-col items-center text-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Digital Alpha" className="h-14 object-contain mb-3" />
              <h1 className="text-text-main text-2xl font-bold">Bem-vindo de volta</h1>
              <div className="w-10 h-0.5 bg-primary my-3" />
              <p className="text-text-muted text-sm">Entre para acessar sua plataforma.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-background border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {resetSent && (
                <div className="bg-cta/10 border border-cta/20 rounded-xl px-4 py-3">
                  <p className="text-cta text-sm">E-mail de redefinição enviado! Verifique sua caixa de entrada.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? 'Entrando...' : (
                  <>
                    Entrar <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2">
              <ShieldCheck size={16} className="text-text-disabled" />
              <button
                onClick={handleResetPassword}
                className="text-sm text-text-muted hover:text-primary transition-colors"
              >
                Esqueci <span className="text-primary">minha senha</span>
              </button>
            </div>
          </div>

          <p className="text-center text-text-disabled text-xs mt-6">
            © 2026 <span className="text-primary font-medium">Digital Alpha</span>. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
