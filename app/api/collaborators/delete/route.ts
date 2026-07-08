import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: Request) {
  try {
    const { id, email } = await request.json()

    // 1. Buscar o user_id vinculado ao colaborador
    const { data: collabData } = await supabaseAdmin
      .from('collaborators')
      .select('user_id, email')
      .eq('id', id)
      .single()

    const userId = collabData?.user_id
    const collabEmail = collabData?.email || email

    // 2. Remover do Supabase Auth (se tiver user_id)
    if (userId) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authError) {
        console.error('⚠️ Erro ao deletar usuário do Auth:', authError.message)
        // Não bloqueia — continua tentando limpar o resto
      } else {
        console.log('✅ Usuário removido do Auth:', userId)
      }
    }

    // 3. Remover da tabela profiles (se tiver email)
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

    // 4. Remover da tabela collaborators
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
