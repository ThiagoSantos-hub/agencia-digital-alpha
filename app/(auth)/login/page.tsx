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
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'empresa_inativa') {
      setError('O acesso da sua empresa foi desativado. Fale com quem administra sua conta na plataforma.')
    } else if (errorParam === 'google_sem_conta') {
      setError('Não encontramos uma conta associada a esse e-mail do Google. Fale com o administrador da sua agência ou cadastre-se em /assinar.')
    } else if (errorParam === 'google_falhou') {
      setError('Não foi possível entrar com o Google. Tente novamente.')
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError('Não foi possível entrar com o Google. Tente novamente.')
      setGoogleLoading(false)
    }
  }

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
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResetSent(true)
  }

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-4">
      {/* Glows decorativos suaves com a cor da marca */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-ai/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center max-h-full">
        {/* Lado esquerdo — branding */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-text-main font-black text-2xl tracking-tight">DIGITAL</span>
            <span className="text-primary font-black text-2xl tracking-tight">ALPHA</span>
          </div>

          <p className="text-text-muted text-sm font-medium tracking-wide mb-1">
            PLATAFORMA INTELIGENTE PARA
          </p>
          <p className="text-primary text-lg font-bold tracking-wide mb-4">
            GESTÃO DE AGÊNCIAS
          </p>

          <p className="text-text-muted leading-relaxed mb-5 max-w-md text-sm">
            O sistema operacional de agência com IA embutida. Controle total de campanhas, clientes, equipe e financeiro, de onde você estiver.
          </p>

          <div className="w-10 h-0.5 bg-primary mb-5" />

          <div className="space-y-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-text-main font-semibold text-sm">{f.title}</p>
                    <p className="text-text-muted text-xs">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lado direito — formulário */}
        <div className="w-full max-w-md mx-auto max-h-full overflow-y-auto">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col items-center text-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Digital Alpha" className="h-10 object-contain mb-2" />
              <h1 className="text-text-main text-xl font-bold">Bem-vindo de volta</h1>
              <p className="text-text-muted text-xs mt-1">Entre para acessar sua plataforma.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-11 py-2.5 bg-background border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
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
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {resetSent && (
                <div className="bg-cta/10 border border-cta/20 rounded-xl px-4 py-2.5">
                  <p className="text-cta text-sm">E-mail de redefinição enviado! Verifique sua caixa de entrada.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? 'Entrando...' : (
                  <>
                    Entrar <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-disabled uppercase tracking-wide">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-2.5 bg-surface hover:bg-hover-bg disabled:opacity-50 text-text-main font-medium rounded-xl transition-colors flex items-center justify-center gap-3 border border-border shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.7-1.56 2.69-3.87 2.69-6.64z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.27c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
                <path fill="#FBBC05" d="M3.95 10.69c-.18-.54-.28-1.11-.28-1.69s.1-1.15.28-1.69V4.97H.96A8.997 8.997 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.34z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.34C4.66 5.17 6.65 3.58 9 3.58z"/>
              </svg>
              {googleLoading ? 'Conectando...' : 'Continuar com Google'}
            </button>

            <div className="mt-4 flex flex-col items-center gap-1.5">
              <ShieldCheck size={14} className="text-text-disabled" />
              <button
                onClick={handleResetPassword}
                className="text-sm text-text-muted hover:text-primary transition-colors"
              >
                Esqueci <span className="text-primary">minha senha</span>
              </button>
            </div>
          </div>

          <p className="text-center text-text-disabled text-xs mt-3">
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
