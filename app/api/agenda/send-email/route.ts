import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/agendaCalendar'

export const dynamic = 'force-dynamic'

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { to, subject, body } = await request.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Destinatário, assunto e mensagem são obrigatórios.' }, { status: 400 })
  }

  const { data: row } = await supabase
    .from('personal_integrations')
    .select('access_token, refresh_token, token_expiry, status, connected_email')
    .eq('user_id', user.id)
    .eq('type', 'gmail')
    .maybeSingle()

  if (!row || row.status !== 'connected') {
    return NextResponse.json({ error: 'Conecte o Gmail antes de enviar um e-mail.' }, { status: 400 })
  }

  const token = await getValidAccessToken(supabase, user.id, 'gmail', row)
  if (!token) {
    return NextResponse.json({ error: 'Não foi possível renovar o acesso ao Gmail. Reconecte na tela de Agenda.' }, { status: 400 })
  }

  const raw = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64UrlEncode(raw) }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao enviar o e-mail pelo Gmail.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
