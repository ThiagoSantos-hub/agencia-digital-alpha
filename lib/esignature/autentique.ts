import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const AUTENTIQUE_GRAPHQL_URL = 'https://api.autentique.com.br/v2/graphql'

export class AutentiqueNotConfiguredError extends Error {
  constructor() {
    super('Autentique não está configurado. Cadastre a API key em /integracoes.')
    this.name = 'AutentiqueNotConfiguredError'
  }
}

async function getAutentiqueConfig(): Promise<{ accessToken: string; webhookSecret: string | null }> {
  const { data } = await supabase
    .from('integrations')
    .select('access_token, config')
    .eq('type', 'autentique')
    .eq('status', 'connected')
    .maybeSingle()

  if (!data?.access_token) throw new AutentiqueNotConfiguredError()

  return {
    accessToken: data.access_token,
    webhookSecret: (data.config as { webhook_secret?: string } | null)?.webhook_secret ?? null,
  }
}

// A API da Autentique é GraphQL com upload multipart (spec graphql-multipart-request).
// NOTA: nomes exatos de campos/mutations abaixo seguem a doc pública da Autentique no
// momento da implementação — confirmar contra a documentação atual antes de ativar em
// produção, já que este é o único lugar do sistema que conhece o formato da API.
async function autentiqueGraphQL(accessToken: string, query: string, variables: Record<string, unknown>, file?: Buffer, fileName?: string) {
  const form = new FormData()

  if (file) {
    form.append('operations', JSON.stringify({ query, variables: { ...variables, file: null } }))
    form.append('map', JSON.stringify({ '0': ['variables.file'] }))
    form.append('0', new Blob([new Uint8Array(file)], { type: 'application/pdf' }), fileName ?? 'contrato.pdf')
  } else {
    form.append('operations', JSON.stringify({ query, variables }))
    form.append('map', JSON.stringify({}))
  }

  const res = await fetch(AUTENTIQUE_GRAPHQL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })

  const json = await res.json()
  if (!res.ok || json.errors) {
    throw new Error(`Falha na API da Autentique: ${res.status} ${JSON.stringify(json.errors ?? json)}`)
  }
  return json.data
}

export interface CreateSignatureRequestInput {
  contractId: string
  pdfBuffer: Buffer
  clientName: string
  clientEmail: string
  clientPhone: string
}

export interface CreateSignatureRequestResult {
  documentId: string
  documentUrl: string
}

const CREATE_DOCUMENT_MUTATION = `
  mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file) {
      id
      signatures {
        public_id
        email
        link { short_link }
      }
    }
  }
`

// Cliente assina primeiro, Thiago (CONTRATADO) assina em seguida.
export async function createSignatureRequest(
  input: CreateSignatureRequestInput
): Promise<CreateSignatureRequestResult> {
  const { accessToken } = await getAutentiqueConfig()

  const data = await autentiqueGraphQL(
    accessToken,
    CREATE_DOCUMENT_MUTATION,
    {
      document: { name: `Contrato ${input.contractId}` },
      signers: [
        { email: input.clientEmail, action: 'SIGN' },
        { email: 'thiagogestorbm@gmail.com', action: 'SIGN' },
      ],
    },
    input.pdfBuffer,
    `contrato-${input.contractId}.pdf`
  )

  return {
    documentId: data.createDocument.id,
    documentUrl: data.createDocument.signatures?.[0]?.link?.short_link ?? '',
  }
}

const DOCUMENT_STATUS_QUERY = `
  query DocumentQuery($id: UUID!) {
    document(id: $id) {
      id
      signatures { email signed { created_at } rejected { created_at } }
    }
  }
`

export async function getSignatureStatus(
  documentId: string
): Promise<{ status: string; signers: Array<{ email: string; status: string }> }> {
  const { accessToken } = await getAutentiqueConfig()
  const data = await autentiqueGraphQL(accessToken, DOCUMENT_STATUS_QUERY, { id: documentId })

  const signers = (data.document.signatures ?? []).map((s: { email: string; signed?: { created_at: string } }) => ({
    email: s.email,
    status: s.signed ? 'signed' : 'pending',
  }))
  const allSigned = signers.length > 0 && signers.every((s: { status: string }) => s.status === 'signed')

  return { status: allSigned ? 'signed' : 'pending', signers }
}

const DELETE_DOCUMENT_MUTATION = `
  mutation DeleteDocumentMutation($id: UUID!) {
    deleteDocument(id: $id)
  }
`

export async function cancelSignatureRequest(documentId: string): Promise<void> {
  const { accessToken } = await getAutentiqueConfig()
  await autentiqueGraphQL(accessToken, DELETE_DOCUMENT_MUTATION, { id: documentId })
}

export async function getAutentiqueWebhookSecret(): Promise<string | null> {
  const { webhookSecret } = await getAutentiqueConfig()
  return webhookSecret
}
