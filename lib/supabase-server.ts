import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// Server-side: use APENAS em API routes e Server Components
// v2.0.0: suporte a autenticação por Bearer token (extensão Chrome Alpha AI)
export function createServerClient() {
  // Verifica se há um Bearer token no cabeçalho Authorization (chamadas da extensão)
  const headersList = headers()
  const authorization = headersList.get('authorization') ?? ''
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : null

  // Se houver Bearer token, cria cliente com o token diretamente
  if (bearerToken) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )
  }

  // Fluxo padrão: autenticação por cookies (app web)
  const cookieStore = cookies()
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
