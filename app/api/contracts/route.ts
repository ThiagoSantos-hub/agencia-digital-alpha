import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { renderContractPdf, formatDataDoDia } from '@/lib/pdf/renderContractPdf'
import { getEsignatureClient } from '@/lib/esignature/provider'
import { substituteTokens } from '@/lib/tokens'
import { sendContractNotification } from '@/lib/email'
import { isValidCPF, isValidCNPJ, isValidCEP, isValidEmail, isValidPhone } from '@/lib/validators'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TemplateField {
  field_key: string
  label: string
  field_type: 'text' | 'number' | 'email' | 'phone' | 'cpf' | 'cnpj' | 'cep' | 'select' | 'date'
  required: boolean
  display_order: number
}

function validateFieldValue(field: TemplateField, value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (field.required && !trimmed) return `${field.label} é obrigatório.`
  if (!trimmed) return null

  switch (field.field_type) {
    case 'cpf': return isValidCPF(trimmed) ? null : `${field.label} inválido.`
    case 'cnpj': return isValidCNPJ(trimmed) ? null : `${field.label} inválido.`
    case 'cep': return isValidCEP(trimmed) ? null : `${field.label} inválido.`
    case 'email': return isValidEmail(trimmed) ? null : `${field.label} inválido.`
    case 'phone': return isValidPhone(trimmed) ? null : `${field.label} inválido.`
    default: return null
  }
}

export async function POST(request: NextRequest) {
  let contractId: string | null = null

  try {
    const body: { templateId: string; fieldValues: Record<string, string> } = await request.json()
    const { templateId, fieldValues } = body

    if (!templateId || !fieldValues) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .eq('active', true)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Modelo de contrato não encontrado.' }, { status: 404 })
    }

    const [{ data: fields }, { data: clauses }, { data: pricingItems }, { data: company }] = await Promise.all([
      supabase.from('contract_template_fields').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('contract_template_clauses').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('contract_template_pricing_items').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('companies').select('*').eq('id', template.company_id).single(),
    ])

    if (!fields || !company) {
      return NextResponse.json({ error: 'Modelo de contrato incompleto.' }, { status: 500 })
    }

    for (const field of fields as TemplateField[]) {
      const validationError = validateFieldValue(field, fieldValues[field.field_key])
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (!fieldValues.nome_completo?.trim() || !fieldValues.email?.trim() || !fieldValues.telefone?.trim()) {
      return NextResponse.json({ error: 'Nome, e-mail e telefone são obrigatórios.' }, { status: 400 })
    }

    if (!company.contract_signer_email) {
      return NextResponse.json({ error: 'Esta empresa ainda não configurou os dados de assinatura do contrato.' }, { status: 500 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') ?? null
    const userAgent = request.headers.get('user-agent') ?? null
    const dataDoDia = formatDataDoDia()

    const tokenValues: Record<string, string> = {
      ...Object.fromEntries(Object.entries(fieldValues).map(([k, v]) => [k, String(v ?? '').trim()])),
      data_do_dia: dataDoDia,
      contratado_nome: company.contract_signer_name ?? '',
      contratado_cpf: company.contract_signer_cpf ?? '',
      contratado_endereco: company.contract_signer_address ?? '',
      contratado_email: company.contract_signer_email ?? '',
      contratado_telefone: company.contract_signer_phone ?? '',
    }

    const clausesSnapshot = (clauses ?? []).map((c) => ({
      title: substituteTokens(c.title, tokenValues),
      body: substituteTokens(c.body, tokenValues),
    }))
    const pricingSnapshot = (pricingItems ?? []).map((p) => ({
      label: p.label, amount: Number(p.amount), frequency: p.frequency,
    }))

    const esignatureProvider = company.esignature_provider ?? 'autentique'

    const { data: contract, error: insertError } = await supabase
      .from('contracts')
      .insert({
        company_id: template.company_id,
        template_id: template.id,
        status: 'rascunho',
        field_values: fieldValues,
        clauses_snapshot: clausesSnapshot,
        pricing_snapshot: pricingSnapshot,
        currency_snapshot: template.currency,
        esignature_provider: esignatureProvider,
        nome_completo: fieldValues.nome_completo.trim(),
        email: fieldValues.email.trim(),
        telefone: fieldValues.telefone.trim(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (insertError || !contract) {
      return NextResponse.json({ error: 'Erro ao registrar contrato.' }, { status: 500 })
    }

    contractId = contract.id

    const contractantFieldRows = (fields as TemplateField[])
      .filter((f) => fieldValues[f.field_key]?.trim())
      .map((f) => ({ label: f.label, value: fieldValues[f.field_key].trim() }))

    const pdfBuffer = await renderContractPdf({
      templateName: template.name,
      companyIdentity: {
        nomeFantasia: company.name,
        nomeCompleto: company.contract_signer_name ?? company.name,
        cpf: company.contract_signer_cpf ?? '',
        endereco: company.contract_signer_address ?? '',
        email: company.contract_signer_email,
        telefone: company.contract_signer_phone ?? '',
      },
      contractantFieldRows,
      clauses: clausesSnapshot,
      pricingItems: pricingSnapshot,
      currency: template.currency,
      dataDoDia,
      signerName: fieldValues.nome_completo.trim(),
    })

    const draftPath = `${template.company_id}/${contract.id}/draft.pdf`
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(draftPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Erro ao gerar PDF do contrato.' }, { status: 500 })
    }

    const signature = await getEsignatureClient(esignatureProvider).createSignatureRequest({
      companyId: template.company_id,
      contractId: contract.id,
      pdfBuffer,
      clientName: fieldValues.nome_completo.trim(),
      clientEmail: fieldValues.email.trim(),
      clientPhone: fieldValues.telefone.trim(),
      companySignerEmail: company.contract_signer_email,
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

    try {
      await sendContractNotification({
        toEmail: company.contract_signer_email,
        toName: company.contract_signer_name ?? company.name,
        clientName: fieldValues.nome_completo.trim(),
        event: 'preenchido',
      })
    } catch (err) {
      console.error('Falha ao enviar aviso de contrato preenchido:', err)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao processar contrato:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message, contractId }, { status: 500 })
  }
}

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

export async function GET() {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('contracts')
    .select('*, contract_templates(name)')
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
