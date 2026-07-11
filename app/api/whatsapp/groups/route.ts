import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`
}

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // ============================================================
  // LÓGICA: Se o usuário logado NÃO tem instância própria
  // (ou seja, é um colaborador), verificar se o admin permite
  // que colaboradores vejam os grupos do seu WhatsApp.
  // ============================================================

  const { data: ownInstance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ownInstance) {
    // Usuário sem instância própria — verificar se é colaborador de um admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .maybeSingle()

    if (adminProfile) {
      const adminUserId = adminProfile.id

      // Buscar a instância do admin
      const { data: adminInstance } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', adminUserId)
        .maybeSingle()

      if (adminInstance && adminInstance.grupos_visiveis_colaboradores === true) {
        // Admin permite: retornar os grupos do admin
        const { data: cached } = await supabase
          .from('whatsapp_groups')
          .select('group_id, name, participant_count')
          .eq('user_id', adminUserId)
          .order('name')

        return NextResponse.json(cached || [])
      } else {
        // Admin não permite ou instância não existe
        return NextResponse.json({ error: 'O admin não permite acesso aos grupos' }, { status: 403 })
      }
    }
  }

  // ============================================================
  // LÓGICA PADRÃO: usuário com instância própria (admin/gestor)
  // Busca grupos da Evolution API e faz cache no Supabase.
  // ============================================================

  const name = instanceName(user.id)

  if (EVO_URL && EVO_KEY) {
    try {
      const res = await fetch(`${EVO_URL}/group/fetchAllGroups/${name}?getParticipants=false`, {
        headers: { 'apikey': EVO_KEY },
      })

      if (res.ok) {
        const groups = await res.json()

        if (Array.isArray(groups) && groups.length > 0) {
          const rows = groups.map((g: any) => ({
            user_id: user.id,
            group_id: g.id,
            name: g.subject || g.name || 'Grupo sem nome',
            participant_count: g.size || g.participants?.length || 0,
            updated_at: new Date().toISOString(),
          }))

          await supabase
            .from('whatsapp_groups')
            .upsert(rows, { onConflict: 'user_id,group_id' })

          return NextResponse.json(rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
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
