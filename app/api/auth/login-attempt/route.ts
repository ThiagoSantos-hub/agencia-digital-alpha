import { NextResponse } from 'next/server'
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const MAX_TENTATIVAS = 5
const JANELA_SEGUNDOS = 30 * 60

function chave(email: string) {
  return `login-fail:${email.trim().toLowerCase()}`
}

// Chamada pela tela de login depois de uma tentativa de senha errada, pra
// contar tentativas falhas por e-mail (não por IP, senão uma rede
// compartilhada bloquearia todo mundo por causa de uma pessoa só). Depois de
// 5 tentativas na mesma janela, a tela mostra o popup pedindo pra redefinir
// a senha em vez do erro genérico de novo.
export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
  }

  const dentroDoLimite = await checkRateLimit(chave(email), MAX_TENTATIVAS, JANELA_SEGUNDOS)
  return NextResponse.json({ blocked: !dentroDoLimite })
}

// Chamada depois de um login que deu certo, zera o contador dessa pessoa.
export async function DELETE(request: Request) {
  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
  }

  await resetRateLimit(chave(email))
  return NextResponse.json({ success: true })
}
