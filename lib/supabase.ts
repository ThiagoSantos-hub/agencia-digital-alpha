import { createBrowserClient } from '@supabase/ssr'

// Client-side: use em componentes, hooks e páginas do browser
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
