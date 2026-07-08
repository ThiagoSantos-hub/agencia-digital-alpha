import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  try {
    // 1. Verificar autenticação — só admin pode deletar
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    // 2. Buscar dados do colaborador ANTES de deletar
    const { id, email } = await request.json()

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: collabData, error: fetchError } = await supabaseAdmin
      .from('collaborators')
      .select('user_id, email')
      .eq('id', id)
      .single()

    if (fetchError || !collabData) {
      return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
    }

    const userId = collabData.user_id
    const collabEmail = collabData.email || email

    // 3. Remover do Supabase Auth (se tiver user_id)
    if (userId) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authError) {
        console.error('⚠️ Erro ao deletar usuário do Auth:', authError.message)
      } else {
        console.log('✅ Usuário removido do Auth:', userId)
      }
    }

    // 4. Remover da tabela profiles (se tiver email)
    if (collabEmail) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('email', collabEmail)
      if (profileError) {
        console.error('⚠️ Erro ao remover profile:', profileError.message)
      } else {
        console.log('✅ Profile removido para:', collabEmail)
      }
    }

    // 5. Remover da tabela collaborators (por último)
    const { error: collabError } = await supabaseAdmin
      .from('collaborators')
      .delete()
      .eq('id', id)

    if (collabError) {
      console.error('❌ Erro ao deletar colaborador:', collabError.message)
      return NextResponse.json({ error: collabError.message }, { status: 400 })
    }

    console.log('✅ Colaborador deletado completamente:', id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro interno na rota de exclusão:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
