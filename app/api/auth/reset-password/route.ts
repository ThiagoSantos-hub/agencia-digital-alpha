import { NextResponse } from 'next/server'
import { consumePasswordResetToken, passwordResetSupabaseAdmin } from '@/lib/passwordReset'

export const dynamic = 'force-dynamic'

// Pública: consome o token do link de e-mail (tanto do "esqueci minha senha"
// quanto da confirmação de troca dentro do painel) e efetivamente define a
// nova senha via service role.
export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token e nova senha são obrigatórios.' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    const result = await consumePasswordResetToken(token)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { error } = await passwordResetSupabaseAdmin.auth.admin.updateUserById(result.userId, {
      password: newPassword,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await passwordResetSupabaseAdmin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', result.userId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
