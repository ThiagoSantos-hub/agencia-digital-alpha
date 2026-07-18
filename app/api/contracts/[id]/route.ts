import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { renderContractPdf, formatDataDoDia } from '@/lib/pdf/renderContractPdf'
import { createSignatureRequest, cancelSignatureRequest } from '@/lib/esignature/autentique'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireManager() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'collaborator') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { companyId: profile.company_id as string }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', auth.companyId)
    .single()

  if (error || !contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  const path = contract.pdf_signed_path || contract.pdf_draft_path
  let pdfUrl: string | null = null
  if (path) {
    const { data: signed } = await supabase.storage.from('contracts').createSignedUrl(path, 600)
    pdfUrl = signed?.signedUrl ?? null
  }

  return NextResponse.json({ ...contract, pdf_url: pdfUrl })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  try {
    const { action, reason } = await request.json()

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .single()

    if (error || !contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

    if (action === 'cancel') {
      if (contract.esignature_document_id) {
        await cancelSignatureRequest(contract.esignature_document_id, contract.company_id)
      }
      const { data, error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'cancelado', cancelled_at: new Date().toISOString(), cancelled_reason: reason ?? null })
        .eq('id', params.id)
        .select()
        .single()
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      return NextResponse.json(data)
    }

    if (action === 'resend') {
      const { data: company } = await supabase.from('companies').select('*').eq('id', contract.company_id).single()
      if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 500 })

      if (contract.status === 'rascunho') {
        const { data: template } = await supabase.from('contract_templates').select('name').eq('id', contract.template_id).single()
        const dataDoDia = formatDataDoDia()

        // Usa o clauses_snapshot/pricing_snapshot já congelados no contrato — não relê
        // o template ao vivo, que pode ter sido editado entre o rascunho e o reenvio.
        const fieldValues = contract.field_values as Record<string, string>
        const contractantFieldRows = Object.entries(fieldValues)
          .filter(([, v]) => v?.trim())
          .map(([k, v]) => ({ label: k, value: v }))

        const pdfBuffer = await renderContractPdf({
          templateName: template?.name ?? 'Contrato',
          companyIdentity: {
            nomeFantasia: company.name,
            nomeCompleto: company.contract_signer_name ?? company.name,
            cpf: company.contract_signer_cpf ?? '',
            endereco: company.contract_signer_address ?? '',
            email: company.contract_signer_email ?? '',
            telefone: company.contract_signer_phone ?? '',
          },
          contractantFieldRows,
          clauses: contract.clauses_snapshot,
          pricingItems: contract.pricing_snapshot,
          currency: contract.currency_snapshot,
          dataDoDia,
          signerName: contract.nome_completo,
        })

        const draftPath = `${contract.company_id}/${contract.id}/draft.pdf`
        await supabase.storage.from('contracts').upload(draftPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

        const signature = await createSignatureRequest({
          companyId: contract.company_id,
          contractId: contract.id,
          pdfBuffer,
          clientName: contract.nome_completo,
          clientEmail: contract.email,
          clientPhone: contract.telefone,
          companySignerEmail: company.contract_signer_email,
        })

        const { data, error: updateError } = await supabase
          .from('contracts')
          .update({
            pdf_draft_path: draftPath,
            esignature_document_id: signature.documentId,
            esignature_document_url: signature.documentUrl,
            status: 'aguardando_assinatura',
            sent_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .select()
          .single()
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
        return NextResponse.json(data)
      }

      const { data, error: updateError } = await supabase
        .from('contracts')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single()
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
