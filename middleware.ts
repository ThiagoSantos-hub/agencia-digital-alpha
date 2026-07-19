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
  const isCollaboratorRoute = request.nextUrl.pathname.startsWith('/colaborador/')

  // Usuário não autenticado tentando acessar app → redireciona para login
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Usuário autenticado tentando acessar login → redireciona para o painel correto
  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const dest = profile?.role === 'collaborator' ? '/colaborador/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Rota do colaborador — PERMITE acesso para qualquer usuário autenticado
  // A validação de perfil é feita pelo layout.tsx do colaborador (client-side)
  // Isso evita race condition onde o profile não foi carregado a tempo
  if (isCollaboratorRoute && user) {
    return NextResponse.next()
  }

  // Rota do admin — verifica se o user é collaborator e redireciona
  const isAdminRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/clientes') ||
    request.nextUrl.pathname.startsWith('/campanhas') ||
    request.nextUrl.pathname.startsWith('/integracoes') ||
    request.nextUrl.pathname.startsWith('/financeiro') ||
    request.nextUrl.pathname.startsWith('/colaboradores') ||
    request.nextUrl.pathname.startsWith('/ai') ||
    request.nextUrl.pathname.startsWith('/perfil') ||
    request.nextUrl.pathname.startsWith('/checklists') ||
    request.nextUrl.pathname.startsWith('/tarefas')

  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role === 'collaborator') {
      return NextResponse.redirect(new URL('/colaborador/dashboard', request.url))
    }
  }

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
