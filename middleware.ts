import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  if (isApiRoute) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')

  // 1. Usuário não autenticado → redireciona para login
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Usuário autenticado no login → redireciona para o painel correto
  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const dest = profile?.role === 'collaborator' ? '/colaborador/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // 3. Tudo o resto → deixa o layout client-side gerenciar o acesso
  // O layout admin verifica se é collaborator e redireciona
  // O layout colaborador verifica se é admin e redireciona
  // Isso evita qualquer flash de conteúdo durante redirects server-side
  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clientes/:path*',
    '/campanhas/:path*',
    '/tarefas/:path*',
    '/integracoes/:path*',
    '/financeiro/:path*',
    '/colaboradores/:path*',
    '/colaborador/:path*',
    '/ai/:path*',
    '/perfil/:path*',
    '/checklists/:path*',
    '/login',
  ],
}
