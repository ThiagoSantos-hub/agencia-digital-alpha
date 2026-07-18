import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { renderContractPdf, formatDataDoDia } from '@/lib/pdf/renderContractPdf'
import { createSignatureRequest } from '@/lib/esignature/autentique'
import { isValidCPF, isValidCNPJ, isValidCEP } from '@/lib/validators'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ContractBody {
  contract_type: 'completo' | 'crm'
  razao_social?: string
  cnpj?: string
  cpf?: string
  endereco: string
  cidade: string
  estado: string
  cep?: string
  nome_completo: string
  email: string
  telefone: string
}

function validateBody(body: ContractBody): string | null {
  if (body.contract_type !== 'completo' && body.contract_type !== 'crm') {
    return 'Tipo de contrato inválido.'
  }
  if (!body.nome_completo?.trim()) return 'Nome completo é obrigatório.'
  if (!body.email?.trim()) return 'E-mail é obrigatório.'
  if (!body.telefone?.trim()) return 'Telefone é obrigatório.'
  if (!body.endereco?.trim()) return 'Endereço é obrigatório.'
  if (!body.cidade?.trim()) return 'Cidade é obrigatória.'
  if (!body.estado?.trim()) return 'Estado é obrigatório.'

  if (body.contract_type === 'completo') {
    const hasCnpj = !!body.cnpj?.trim()
    const hasCpf = !!body.cpf?.trim()
    if (!body.razao_social?.trim()) return 'Razão social é obrigatória.'
    if (!hasCnpj && !hasCpf) return 'Informe CNPJ ou CPF.'
    if (hasCnpj && !isValidCNPJ(body.cnpj!)) return 'CNPJ inválido.'
    if (hasCpf && !isValidCPF(body.cpf!)) return 'CPF inválido.'
    if (body.cep && !isValidCEP(body.cep)) return 'CEP inválido.'
  } else {
    if (!body.cpf?.trim()) return 'CPF é obrigatório.'
    if (!isValidCPF(body.cpf)) return 'CPF inválido.'
  }

  return null
}

export async function POST(request: NextRequest) {
  let contractId: string | null = null

  try {
    const body: ContractBody = await request.json()
    const validationError = validateBody(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('type', body.contract_type)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Modelo de contrato não encontrado.' }, { status: 500 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') ?? null
    const userAgent = request.headers.get('user-agent') ?? null

    const { data: contract, error: insertError } = await supabase
      .from('contracts')
      .insert({
        contract_type: body.contract_type,
        status: 'rascunho',
        razao_social: body.razao_social?.trim() || null,
        cnpj: body.cnpj?.trim() || null,
        cpf: body.cpf?.trim() || null,
        endereco: body.endereco.trim(),
        cidade: body.cidade.trim(),
        estado: body.estado.trim(),
        cep: body.cep?.trim() || null,
        nome_completo: body.nome_completo.trim(),
        email: body.email.trim(),
        telefone: body.telefone.trim(),
        currency_snapshot: template.currency,
        setup_fee_snapshot: template.setup_fee,
        monthly_fee_snapshot: template.monthly_fee,
        extra_config_snapshot: template.extra_config,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (insertError || !contract) {
      return NextResponse.json({ error: 'Erro ao registrar contrato.' }, { status: 500 })
    }

    contractId = contract.id
    const dataDoDia = formatDataDoDia()
    const extra = template.extra_config as Record<string, number>

    const pdfBuffer = body.contract_type === 'completo'
      ? await renderContractPdf('completo', {
          razaoSocial: body.razao_social?.trim() || '',
          cnpj: body.cnpj?.trim() || '',
          cpf: body.cpf?.trim() || '',
          endereco: body.endereco.trim(),
          cidadeEstado: `${body.cidade.trim()}-${body.estado.trim()}`,
          cep: body.cep?.trim() || '',
          nomeCompleto: body.nome_completo.trim(),
          email: body.email.trim(),
          telefone: body.telefone.trim(),
          dataDoDia,
          currency: template.currency,
          setupFee: Number(template.setup_fee),
          monthlyFee: Number(template.monthly_fee),
          monthlyTrafego: Number(extra.monthly_trafego ?? 0),
          monthlyCrm: Number(extra.monthly_crm ?? 0),
        })
      : await renderContractPdf('crm', {
          cpf: body.cpf?.trim() || '',
          endereco: body.endereco.trim(),
          cidadeEstado: `${body.cidade.trim()}/${body.estado.trim()}`,
          nomeCompleto: body.nome_completo.trim(),
          dataDoDia,
          currency: template.currency,
          setupFee: Number(template.setup_fee),
          monthlyFee: Number(template.monthly_fee),
          funisMax: Number(extra.funis_max ?? 0),
          automacoesMax: Number(extra.automacoes_max ?? 0),
          prazoImplantacaoDias: Number(extra.prazo_implantacao_dias ?? 0),
          treinamentoH1: Number(extra.treinamento_h_mes1 ?? 0),
          treinamentoH2: Number(extra.treinamento_h_apartir_mes2 ?? 0),
        })

    const draftPath = `${contract.id}/draft.pdf`
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(draftPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Erro ao gerar PDF do contrato.' }, { status: 500 })
    }

    const signature = await createSignatureRequest({
      contractId: contract.id,
      pdfBuffer,
      clientName: body.nome_completo.trim(),
      clientEmail: body.email.trim(),
      clientPhone: body.telefone.trim(),
    })

    await supabase
      .from('contracts')
      .update({
        pdf_draft_path: draftPath,
        esignature_document_id: signature.documentId,
        esignature_document_url: signature.documentUrl,
        status: 'aguardando_assinatura',
        sent_at: new Date().toISOString(),
      })
      .eq('id', contract.id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao processar contrato:', error)
    // Se o insert já aconteceu, a row fica em 'rascunho' pro gestor reenviar manualmente.
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message, contractId }, { status: 500 })
  }
}

export async function GET() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'collaborator') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
