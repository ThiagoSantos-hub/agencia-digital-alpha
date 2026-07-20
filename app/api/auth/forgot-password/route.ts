import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPasswordResetToken } from '@/lib/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pública: quem esqueceu a senha pede o link aqui, sem estar logado. Sempre
// responde com sucesso (mesmo se o e-mail não existir) pra não deixar
// descobrir quais e-mails têm conta no sistema.
export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle()

    if (profile) {
      const token = await createPasswordResetToken(profile.id)
      await sendPasswordResetEmail({
        toEmail: profile.email,
        toName: profile.name ?? '',
        token,
        motivo: 'esqueci',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
