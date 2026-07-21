// Renova o access_token de uma conexao Google usando o refresh_token salvo.
// Usado pela Agenda pessoal (Gmail/Google Agenda) antes de cada chamada,
// ja que o access_token do Google expira em ~1h e nao existia nenhum
// mecanismo de renovacao no projeto ate agora.
export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
} | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) return null
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}
