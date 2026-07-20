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
  const isTrocarSenhaRoute = request.nextUrl.pathname.startsWith('/trocar-senha')
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

  // Usuário com senha temporária (convite, reset de admin, nova empresa) —
  // trava em /trocar-senha até definir uma senha própria.
  if (user && !isTrocarSenhaRoute && !isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', user.id)
      .single()

    if (profile?.must_change_password) {
      return NextResponse.redirect(new URL('/trocar-senha', request.url))
    }
  }

  // Empresa desativada pelo superadmin (toggle em /superadmin/empresas) — sem
  // essa checagem o campo `companies.active` era só cosmético, ninguém era de
  // fato bloqueado. Super admins ficam de fora (eles não pertencem a uma
  // empresa-cliente).
  if (user && !isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.is_super_admin && profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('active')
        .eq('id', profile.company_id)
        .single()

      if (company?.active === false) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=empresa_inativa', request.url))
      }
    }
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
    request.nextUrl.pathname.startsWith('/tarefas') ||
    request.nextUrl.pathname.startsWith('/contratos') ||
    request.nextUrl.pathname.startsWith('/assinatura')

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

  // Rota de super admin (gestão de empresas) — só quem tem is_super_admin
  const isSuperAdminRoute = request.nextUrl.pathname.startsWith('/superadmin')
  if (isSuperAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/contratos/:path*',
    '/superadmin/:path*',
    '/assinatura/:path*',
    '/login',
  ],
}
