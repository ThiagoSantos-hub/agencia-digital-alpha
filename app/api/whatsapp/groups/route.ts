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

  // ANÁLISE: Se o administrador vê 53 grupos mas só tem 30, o problema é que 
  // o fetchAllGroups da Evolution API pode estar retornando grupos arquivados 
  // ou o cache do Supabase não está sendo limpo corretamente por causa de 
  // erros silenciosos.

  if (EVO_URL && EVO_KEY && targetInstanceName) {
    try {
      // Forçamos um timeout curto para não travar a requisição
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch(
        `${EVO_URL}/group/fetchAllGroups/${targetInstanceName}?getParticipants=false`,
        { 
          headers: { 'apikey': EVO_KEY },
          signal: controller.signal,
          cache: 'no-store' // GARANTE QUE NÃO HÁ CACHE HTTP
        }
      )
      clearTimeout(timeoutId)

      if (res.ok) {
        const groups = await res.json()

        if (Array.isArray(groups)) {
          // FILTRAGEM AGRESSIVA: Apenas grupos onde o nome existe e não são "fantasmas"
          // Alguns grupos vêm sem subject ou com dados corrompidos da API
          const validGroups = groups.filter(g => (g.subject || g.name) && g.id)

          // LIMPEZA TOTAL: Deletamos TUDO do usuário antes de reinserir
          // Usamos um delete explícito para garantir que o upsert não mantenha lixo
          await supabase.from('whatsapp_groups').delete().eq('user_id', targetUserId)

          if (validGroups.length > 0) {
            const rows = validGroups.map((g: any) => ({
              user_id: targetUserId,
              group_id: g.id,
              name: g.subject || g.name || 'Grupo sem nome',
              participant_count: g.size || g.participants?.length || 0,
              updated_at: new Date().toISOString(),
            }))

            // Inserção em lote
            const { error: upsertError } = await supabase.from('whatsapp_groups').insert(rows)
            
            if (upsertError) {
              console.error('Erro ao inserir grupos no Supabase:', upsertError)
            }

            return NextResponse.json(rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
          }
          return NextResponse.json([])
        }
      }
    } catch (err) {
      console.error('Falha crítica na busca de grupos:', err)
    }
  }

  // Fallback: se a API falhar, retornamos o que está no banco, 
  // mas se o usuário quer atualização, o ideal é que ele veja a lista real.
  const { data: cached } = await supabase
    .from('whatsapp_groups')
    .select('group_id, name, participant_count')
    .eq('user_id', targetUserId)
    .order('name')
    
  return NextResponse.json(cached || [])
}
