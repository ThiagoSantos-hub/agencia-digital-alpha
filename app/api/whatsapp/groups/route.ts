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
  const forceRefresh = searchParams.get('refresh') === 'true'

  // ============================================================
  // source=agency — Grupos do admin compartilhados com colaboradores.
  // ============================================================

  if (source === 'agency') {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .maybeSingle()

    if (!adminProfile) return NextResponse.json([])

    const adminUserId = adminProfile.id

    const { data: adminInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', adminUserId)
      .maybeSingle()

    if (!adminInstance || adminInstance.grupos_visiveis_colaboradores !== true) {
      return NextResponse.json([])
    }

    // Se não for forceRefresh, tenta ler do cache primeiro
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('whatsapp_groups')
        .select('group_id, name, participant_count')
        .eq('user_id', adminUserId)
        .order('name')

      if (cached && cached.length > 0) {
        return NextResponse.json(cached)
      }
    }

    // Busca na Evolution API do admin para atualizar o cache
    if (EVO_URL && EVO_KEY && adminInstance.instance_name) {
      try {
        const res = await fetch(
          `${EVO_URL}/group/fetchAllGroups/${adminInstance.instance_name}?getParticipants=false`,
          { headers: { 'apikey': EVO_KEY } }
        )

        if (res.ok) {
          const groups = await res.json()

          if (Array.isArray(groups)) {
            // 1. Limpa os grupos antigos do admin no banco para evitar "fantasmas"
            await supabase.from('whatsapp_groups').delete().eq('user_id', adminUserId)

            if (groups.length > 0) {
              // 2. Insere os grupos atuais vindos da API
              const rows = groups.map((g: any) => ({
                user_id: adminUserId,
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
      } catch { }
    }

    // Se a API falhar e não for refresh, retorna o que tiver no cache (mesmo que antigo)
    const { data: fallback } = await supabase
      .from('whatsapp_groups')
      .select('group_id, name, participant_count')
      .eq('user_id', adminUserId)
      .order('name')
    return NextResponse.json(fallback || [])
  }

  // ============================================================
  // Fluxo padrão — grupos do próprio usuário logado.
  // ============================================================

  const name = instanceName(user.id)

  if (EVO_URL && EVO_KEY) {
    try {
      const res = await fetch(`${EVO_URL}/group/fetchAllGroups/${name}?getParticipants=false`, {
        headers: { 'apikey': EVO_KEY },
      })

      if (res.ok) {
        const groups = await res.json()

        if (Array.isArray(groups)) {
          // Limpa grupos antigos do usuário para sincronizar com a realidade da API
          await supabase.from('whatsapp_groups').delete().eq('user_id', user.id)

          if (groups.length > 0) {
            const rows = groups.map((g: any) => ({
              user_id: user.id,
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
    } catch { }
  }

  const { data: cached } = await supabase
    .from('whatsapp_groups')
    .select('group_id, name, participant_count')
    .eq('user_id', user.id)
    .order('name')

  return NextResponse.json(cached || [])
}
