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
          // FILTRAGEM DEFINITIVA CONTRA GRUPOS FANTASMAS:
          const validGroups = groups.filter(g => {
            const name = (g.subject || g.name || '').trim()
            const id = g.id || ''
            
            // 1. Deve ter um nome válido e não ser vazio
            if (!name || name.length < 2) return false
            
            // 2. Deve ser um grupo real (@g.us) e não uma transmissão ou status
            if (!id.endsWith('@g.us')) return false
            
            // 3. Deve ter participantes (grupos onde você saiu costumam vir com size 0 ou sem participantes)
            const size = g.size || (g.participants ? g.participants.length : 0)
            if (size <= 0) return false
            
            // 4. Remover grupos de sistema ou suporte técnico
            const lowerName = name.toLowerCase()
            if (lowerName.includes('whatsapp') || lowerName.includes('broadcast') || lowerName.includes('rascunho')) return false
            
            return true
          })

          const rows = validGroups.map((g: any) => ({
            user_id: targetUserId,
            group_id: g.id,
            name: g.subject || g.name || 'Grupo sem nome',
            participant_count: g.size || (g.participants ? g.participants.length : 0),
            updated_at: new Date().toISOString(),
          }))

          // SINCRONIZAÇÃO TOTAL: 
          // 1. Remove TODOS os grupos atuais do usuário para garantir que grupos deletados sumam
          // 2. Insere a nova lista limpa vinda da API
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

  const { data: cached } = await supabase
    .from('whatsapp_groups')
    .select('group_id, name, participant_count')
    .eq('user_id', targetUserId)
    .order('name')
    
  return NextResponse.json(cached || [])
}
