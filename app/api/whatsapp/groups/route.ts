import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')

  // Identifica o ID do usuário alvo (o próprio ou o admin)
  let targetUserId = user.id
  let targetInstanceName = instanceName(user.id)

  if (source === 'agency') {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .maybeSingle()

    if (!adminProfile) return NextResponse.json([])
    
    targetUserId = adminProfile.id
    
    const { data: adminInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (!adminInstance || adminInstance.grupos_visiveis_colaboradores !== true) {
      return NextResponse.json([])
    }
    
    targetInstanceName = adminInstance.instance_name
  }

  // BUSCA NA API (SEM CACHE)
  if (EVO_URL && EVO_KEY && targetInstanceName) {
    try {
      const res = await fetch(
        `${EVO_URL}/group/fetchAllGroups/${targetInstanceName}?getParticipants=false`,
        { headers: { 'apikey': EVO_KEY } }
      )

      if (res.ok) {
        const groups = await res.json()

        if (Array.isArray(groups)) {
          // LIMPA O BANCO ANTES DE INSERIR OS NOVOS (Sincronização Real)
          await supabase.from('whatsapp_groups').delete().eq('user_id', targetUserId)

          if (groups.length > 0) {
            const rows = groups.map((g: any) => ({
              user_id: targetUserId,
              group_id: g.id,
              name: g.subject || g.name || 'Grupo sem nome',
              participant_count: g.size || g.participants?.length || 0,
              updated_at: new Date().toISOString(),
            }))

            await supabase.from('whatsapp_groups').upsert(rows, { onConflict: 'user_id,group_id' })
            return NextResponse.json(rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
          }
          return NextResponse.json([])
        }
      }
    } catch (err) {
      console.error('Erro ao buscar grupos na API:', err)
    }
  }

  // Fallback para o banco se a API falhar
  const { data: cached } = await supabase
    .from('whatsapp_groups')
    .select('group_id, name, participant_count')
    .eq('user_id', targetUserId)
    .order('name')
    
  return NextResponse.json(cached || [])
}
