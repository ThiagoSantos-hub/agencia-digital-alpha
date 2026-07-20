import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Callback do "Entrar com Google" (login de usuário) -- diferente de
// /api/auth/callback/google, que é da integração de Google Ads/Gmail da
// própria empresa, não de login.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          // Conta do Google autenticou, mas não existe nenhum perfil vinculado
          // a esse usuário no sistema (nunca foi cadastrado por um admin ou
          // pelo /assinar). Desloga e manda pro login com uma explicação.
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=google_sem_conta`)
        }

        const dest = profile.role === 'collaborator' ? '/colaborador/dashboard' : '/dashboard'
        return NextResponse.redirect(`${origin}${dest}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=google_falhou`)
}
