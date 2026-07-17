import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`
}

function isValidGroup(g: any): boolean {
  const name = (g.subject || g.name || '').trim()
  const id = String(g.id || '')

  if (!name || name.length < 2) return false
  if (!id.endsWith('@g.us')) return false

  // Exclui comunidades e anúncios da comunidade
  if (g.isCommunity === true || g.isGroupAnnouncement === true) return false
  if (g.isCommunityAnnounce === true || g.announce === true && g.isCommunity) return false

  const lowerName = name.toLowerCase()
  if (
    lowerName.includes('broadcast') ||
    lowerName.includes('rascunho') ||
    lowerName.startsWith('status@') ||
    lowerName.includes('lista de transmissão')
  ) return false

  return true
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const force = searchParams.get('force') === '1'

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
      return NextResponse.json([], { status: 200 })
    }
    
    targetInstanceName = adminInstance.instance_name
  }

  if (EVO_URL && EVO_KEY && targetInstanceName) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch(
        `${EVO_URL}/group/fetchAllGroups/${targetInstanceName}?getParticipants=false`,
        { 
          headers: { 'apikey': EVO_KEY },
          signal: controller.signal,
          cache: 'no-store'
        }
      )
      clearTimeout(timeoutId)

      if (res.ok) {
        const groups = await res.json()

        if (Array.isArray(groups)) {
          const validGroups = groups.filter(isValidGroup)

          const rows = validGroups.map((g: any) => ({
            user_id: targetUserId,
            group_id: g.id,
            name: (g.subject || g.name || 'Grupo sem nome').trim(),
            participant_count: g.size || (g.participants ? g.participants.length : 0),
            updated_at: new Date().toISOString(),
          }))

          // Sempre substitui o cache local pelo resultado fresco da API
          await supabase
            .from('whatsapp_groups')
            .delete()
            .eq('user_id', targetUserId)

          if (rows.length > 0) {
            await supabase
              .from('whatsapp_groups')
              .insert(rows)
          }

          return NextResponse.json(rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
        }
      }
    } catch (err) {
      console.error('Falha crítica na busca de grupos:', err)
    }
  }

  // Fallback: cache do banco (só se API falhar)
  // Se force=1 e API falhou, ainda assim limpa cache antigo não ajuda — retorna o que houver
  const { data: cached } = await supabase
    .from('whatsapp_groups')
    .select('group_id, name, participant_count')
    .eq('user_id', targetUserId)
    .order('name')
    
  return NextResponse.json(cached || [])
}
