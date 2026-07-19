import { createClient } from '@supabase/supabase-js'
import type { CreateSignatureRequestInput, CreateSignatureRequestResult } from './autentique'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ASSINAFY_API_URL = 'https://api.assinafy.com.br/v1'

export class AssinafyNotConfiguredError extends Error {
  constructor() {
    super('Assinafy não está configurado. Cadastre a API key da sua empresa em /integracoes.')
    this.name = 'AssinafyNotConfiguredError'
  }
}

async function getAssinafyConfig(companyId: string): Promise<{ accessToken: string; accountId: string; webhookSecret: string | null }> {
  const { data } = await supabase
    .from('integrations')
    .select('access_token, config')
    .eq('company_id', companyId)
    .eq('type', 'assinafy')
    .eq('status', 'connected')
    .maybeSingle()

  const config = data?.config as { account_id?: string; webhook_secret?: string } | null
  if (!data?.access_token || !config?.account_id) throw new AssinafyNotConfiguredError()

  return {
    accessToken: data.access_token,
    accountId: config.account_id,
    webhookSecret: config.webhook_secret ?? null,
  }
}

// A API da Assinafy é REST (não GraphQL, ao contrário da Autentique). O fluxo abaixo
// (upload de documento -> cadastro de signatários -> criação da assignment que dispara
// o envio) segue a documentação pública da Assinafy no momento da implementação —
// NOTA: nomes exatos de endpoints/campos e o formato de resposta precisam ser
// confirmados contra a documentação/sandbox atual da Assinafy antes de ativar em
// produção, já que este é o único lugar do sistema que conhece o formato dessa API
// (mesmo cuidado já sinalizado em lib/esignature/autentique.ts para a Autentique).
async function assinafyRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ASSINAFY_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`Falha na API da Assinafy: ${res.status} ${JSON.stringify(json)}`)
  }
  return json as T
}

interface AssinafyUploadResponse { data: { id: string } }
interface AssinafyAssignmentResponse { data: { id: string; url?: string } }

// Cliente assina primeiro, o representante da empresa (CONTRATADO) assina em seguida —
// mesma ordem usada na integração com a Autentique.
export async function createSignatureRequest(
  input: CreateSignatureRequestInput
): Promise<CreateSignatureRequestResult> {
  const { accessToken, accountId } = await getAssinafyConfig(input.companyId)

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(input.pdfBuffer)], { type: 'application/pdf' }), `contrato-${input.contractId}.pdf`)

  const upload = await assinafyRequest<AssinafyUploadResponse>(
    accessToken,
    `/accounts/${accountId}/documents`,
    { method: 'POST', body: form }
  )
  const documentId = upload.data.id

  const assignment = await assinafyRequest<AssinafyAssignmentResponse>(
    accessToken,
    `/accounts/${accountId}/documents/${documentId}/assignments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'virtual',
        signers: [
          { name: input.clientName, email: input.clientEmail, sign_as: 'party' },
          { name: 'Representante', email: input.companySignerEmail, sign_as: 'party' },
        ],
      }),
    }
  )

  return {
    documentId,
    documentUrl: assignment.data.url ?? '',
  }
}

interface AssinafyDocumentStatusResponse {
  data: { status: string; signers?: Array<{ email: string; status: string }> }
}

export async function getSignatureStatus(
  documentId: string,
  companyId: string
): Promise<{ status: string; signers: Array<{ email: string; status: string }> }> {
  const { accessToken, accountId } = await getAssinafyConfig(companyId)
  const data = await assinafyRequest<AssinafyDocumentStatusResponse>(
    accessToken,
    `/accounts/${accountId}/documents/${documentId}`
  )

  const signers = (data.data.signers ?? []).map((s) => ({
    email: s.email,
    status: s.status === 'signed' ? 'signed' : 'pending',
  }))
  const allSigned = signers.length > 0 && signers.every((s) => s.status === 'signed')

  return { status: allSigned ? 'signed' : 'pending', signers }
}

export async function cancelSignatureRequest(documentId: string, companyId: string): Promise<void> {
  const { accessToken, accountId } = await getAssinafyConfig(companyId)
  await assinafyRequest(accessToken, `/accounts/${accountId}/documents/${documentId}`, { method: 'DELETE' })
}

export async function getAssinafyWebhookSecret(companyId: string): Promise<string | null> {
  const { webhookSecret } = await getAssinafyConfig(companyId)
  return webhookSecret
}
