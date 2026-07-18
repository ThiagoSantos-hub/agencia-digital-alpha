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

  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'collaborator') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { userId: user.id }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', params.id)
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
      .single()

    if (error || !contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

    if (action === 'cancel') {
      if (contract.esignature_document_id) {
        await cancelSignatureRequest(contract.esignature_document_id)
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
      if (contract.status === 'rascunho') {
        const { data: template } = await supabase
          .from('contract_templates')
          .select('*')
          .eq('type', contract.contract_type)
          .single()
        const extra = (template?.extra_config ?? contract.extra_config_snapshot) as Record<string, number>
        const dataDoDia = formatDataDoDia()

        const pdfBuffer = contract.contract_type === 'completo'
          ? await renderContractPdf('completo', {
              razaoSocial: contract.razao_social || '',
              cnpj: contract.cnpj || '',
              cpf: contract.cpf || '',
              endereco: contract.endereco,
              cidadeEstado: `${contract.cidade}-${contract.estado}`,
              cep: contract.cep || '',
              nomeCompleto: contract.nome_completo,
              email: contract.email,
              telefone: contract.telefone,
              dataDoDia,
              currency: contract.currency_snapshot,
              setupFee: Number(contract.setup_fee_snapshot),
              monthlyFee: Number(contract.monthly_fee_snapshot),
              monthlyTrafego: Number(extra.monthly_trafego ?? 0),
              monthlyCrm: Number(extra.monthly_crm ?? 0),
            })
          : contract.contract_type === 'crm'
          ? await renderContractPdf('crm', {
              cpf: contract.cpf || '',
              endereco: contract.endereco,
              cidadeEstado: `${contract.cidade}/${contract.estado}`,
              nomeCompleto: contract.nome_completo,
              dataDoDia,
              currency: contract.currency_snapshot,
              setupFee: Number(contract.setup_fee_snapshot),
              monthlyFee: Number(contract.monthly_fee_snapshot),
              funisMax: Number(extra.funis_max ?? 0),
              automacoesMax: Number(extra.automacoes_max ?? 0),
              prazoImplantacaoDias: Number(extra.prazo_implantacao_dias ?? 0),
              treinamentoH1: Number(extra.treinamento_h_mes1 ?? 0),
              treinamentoH2: Number(extra.treinamento_h_apartir_mes2 ?? 0),
            })
          : await renderContractPdf('trafego', {
              nomeCompleto: contract.nome_completo,
              cnpj: contract.cnpj || '',
              cpf: contract.cpf || '',
              endereco: contract.endereco,
              cidadeEstado: `${contract.cidade}/${contract.estado}`,
              dataDoDia,
              currency: contract.currency_snapshot,
              valorPlano: Number(contract.setup_fee_snapshot),
              prazoDias: Number(extra.prazo_dias ?? 30),
              parcelamentoMaxCartao: Number(extra.parcelamento_max_cartao ?? 6),
            })

        const draftPath = `${contract.id}/draft.pdf`
        await supabase.storage.from('contracts').upload(draftPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

        const signature = await createSignatureRequest({
          contractId: contract.id,
          pdfBuffer,
          clientName: contract.nome_completo,
          clientEmail: contract.email,
          clientPhone: contract.telefone,
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

      // Já enviado — apenas atualiza sent_at como registro do reenvio manual.
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
