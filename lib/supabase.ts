import { createBrowserClient } from '@supabase/ssr'

// Client-side: use em componentes, hooks e páginas do browser
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('ERRO CRÍTICO: Variáveis do Supabase não encontradas no ambiente.');
  }

  return createBrowserClient(url || '', key || '')
}
