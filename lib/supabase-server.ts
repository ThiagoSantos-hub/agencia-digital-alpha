import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

/**
 * createServerClient - Versão 3.0.0
 * Suporte robusto para Extensão Chrome (Bearer Token) e App Web (Cookies)
 */
export function createServerClient() {
  const headersList = headers()
  const authorization = headersList.get('authorization')
  
  // 1. Tenta autenticação por Bearer Token (Extensão Chrome)
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.split(' ')[1]
    
    if (token && token !== 'null' && token !== 'undefined') {
      console.log('[Supabase Server] Autenticando via Bearer Token...')
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
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
  }

  // 2. Tenta autenticação por Cookies (App Web Padrão)
  console.log('[Supabase Server] Autenticando via Cookies...')
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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Em Server Components/API Routes às vezes não podemos setar cookies, ignoramos
          }
        },
      },
    }
  )
}
