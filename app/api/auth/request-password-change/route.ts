import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createPasswordResetToken } from '@/lib/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Autenticada: chamada de dentro do painel (Perfil) quando o usuário pede pra
// trocar a senha. Não muda a senha na hora -- só manda o e-mail de
// confirmação; a troca de verdade só acontece quando o link é clicado e a
// nova senha é enviada em /api/auth/reset-password.
export async function POST() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', user.id).single()

  const token = await createPasswordResetToken(user.id)
  await sendPasswordResetEmail({
    toEmail: profile?.email ?? user.email!,
    toName: profile?.name ?? '',
    token,
    motivo: 'troca_no_painel',
  })

  return NextResponse.json({ success: true })
}
