import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // v1.2.0: Suporte a chamadas da extensão (Bearer token) no middleware
  const authHeader = request.headers.get('Authorization')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Se for uma rota de API e tiver Bearer token, deixa passar para o handler da API tratar
  // O handler da API já usa o createServerClient robusto que criamos.
  if (isApiRoute && authHeader?.startsWith('Bearer ')) {
    return supabaseResponse
  }

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
  const isAppRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/clientes') ||
    request.nextUrl.pathname.startsWith('/campanhas') ||
    request.nextUrl.pathname.startsWith('/tarefas') ||
    request.nextUrl.pathname.startsWith('/integracoes') ||
    request.nextUrl.pathname.startsWith('/financeiro') ||
    request.nextUrl.pathname.startsWith('/ai') ||
    request.nextUrl.pathname.startsWith('/perfil')

  // Se não houver usuário e for rota de app, redireciona para login
  // Exceto se for rota de API (APIs devem retornar 401, não redirecionar)
  if (!user && isAppRoute && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/ai/:path*',
    '/perfil/:path*',
    '/login',
  ],
}
