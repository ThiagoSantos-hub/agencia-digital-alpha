import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

// Client de serviço pras leituras/escritas em whatsapp_instances/whatsapp_groups: quando
// source=agency, um colaborador precisa ler a instância do ADMIN (grupos_visiveis_colaboradores,
// instance_name) e gravar em whatsapp_groups com user_id do admin — RLS bloqueia isso pro
// client de sessão do colaborador (whatsapp_instances_select_own e afins só liberam a própria
// linha). auth.getUser() continua vindo do client de sessão, só as queries de dados usam este.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('company_id', callerProfile?.company_id ?? '')
      .maybeSingle()

    if (!adminProfile) return NextResponse.json([])
    targetUserId = adminProfile.id

    const { data: adminInstance } = await supabaseAdmin
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

          // Upsert (não delete+insert): a Evolution API às vezes continua devolvendo
          // grupos "fantasma" (que o usuário já saiu, mas o cache dela não atualizou).
          // Upsert preserva a flag is_ghost de grupos que o usuário já escondeu
          // manualmente — um delete+insert como antes apagava essa marcação a cada sync.
          let upserted: { group_id: string; name: string; participant_count: number; is_ghost: boolean | null }[] = []
          if (rows.length > 0) {
            const { data } = await supabaseAdmin
              .from('whatsapp_groups')
              .upsert(rows, { onConflict: 'user_id,group_id' })
              .select('group_id, name, participant_count, is_ghost')
            upserted = data ?? []
          }

          const visible = upserted.filter(g => !g.is_ghost)
          return NextResponse.json(visible.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
        }
      }
    } catch (err) {
      console.error('Falha crítica na busca de grupos:', err)
    }
  }

  // Fallback: cache do banco (só se API falhar)
  // Se force=1 e API falhou, ainda assim limpa cache antigo não ajuda — retorna o que houver
  const { data: cached } = await supabaseAdmin
    .from('whatsapp_groups')
    .select('group_id, name, participant_count')
    .eq('user_id', targetUserId)
    .eq('is_ghost', false)
    .order('name')

  return NextResponse.json(cached || [])
}

// Esconde um grupo "fantasma" (que a Evolution API continua devolvendo mesmo depois
// do usuário sair dele de verdade no WhatsApp). Não apaga a linha — só marca is_ghost,
// pra sobreviver ao próximo upsert de sincronização.
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('group_id')
  if (!groupId) return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('whatsapp_groups')
    .update({ is_ghost: true })
    .eq('user_id', user.id)
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
