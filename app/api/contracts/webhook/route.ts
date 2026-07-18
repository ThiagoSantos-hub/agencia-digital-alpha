import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAutentiqueWebhookSecret } from '@/lib/esignature/autentique'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Formato do payload de webhook da Autentique — confirmar contra a documentação atual
// antes de ativar em produção (nomes de evento/campos podem variar).
interface AutentiqueWebhookPayload {
  event?: string
  document: {
    id: string // esignature_document_id
    signatures?: Array<{ email: string; signed?: { created_at: string } }>
    files?: { signed?: string } // URL do PDF assinado, quando disponível
  }
}

async function fireN8nWebhook(payload: Record<string, unknown>) {
  try {
    await fetch('https://webhook.digitalalpha.cloud/webhook/contrato-assinado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Falha ao disparar webhook n8n de contrato assinado:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validação por shared-secret (integrations.config.webhook_secret) já que este
    // endpoint precisa ficar público para a Autentique conseguir chamá-lo.
    const secret = await getAutentiqueWebhookSecret()
    if (secret) {
      const provided = request.headers.get('x-autentique-webhook-secret') ?? new URL(request.url).searchParams.get('secret')
      if (provided !== secret) {
        return NextResponse.json({ error: 'Assinatura de webhook inválida' }, { status: 401 })
      }
    }

    const payload: AutentiqueWebhookPayload = await request.json()
    const documentId = payload.document.id

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('esignature_document_id', documentId)
      .single()

    if (error || !contract) {
      return NextResponse.json({ error: 'Contrato não encontrado para este documento' }, { status: 404 })
    }

    if (contract.status === 'assinado' || contract.status === 'cancelado') {
      // Já processado — evita reprocessar em reentregas do webhook.
      return NextResponse.json({ ok: true })
    }

    const clientSigner = payload.document.signatures?.find((s) => s.email === contract.email)
    const thiagoSigner = payload.document.signatures?.find((s) => s.email === 'thiagogestorbm@gmail.com')

    const signerClientStatus = clientSigner?.signed ? 'assinado' : contract.signer_client_status
    const signerThiagoStatus = thiagoSigner?.signed ? 'assinado' : contract.signer_thiago_status

    const updates: Record<string, unknown> = {
      signer_client_status: signerClientStatus,
      signer_thiago_status: signerThiagoStatus,
      webhook_payload_raw: payload,
    }

    const bothSigned = signerClientStatus === 'assinado' && signerThiagoStatus === 'assinado'
    const signedFileUrl = payload.document.files?.signed

    if (bothSigned && signedFileUrl) {
      const fileRes = await fetch(signedFileUrl)
      const fileBuffer = Buffer.from(await fileRes.arrayBuffer())
      const signedPath = `${contract.id}/signed.pdf`
      await supabase.storage.from('contracts').upload(signedPath, fileBuffer, { contentType: 'application/pdf', upsert: true })

      updates.pdf_signed_path = signedPath
      updates.status = 'assinado'
      updates.signed_at = new Date().toISOString()
    }

    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', contract.id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (updatedContract.status === 'assinado' && !updatedContract.n8n_notified_at) {
      await fireN8nWebhook({
        contract_id: updatedContract.id,
        contract_type: updatedContract.contract_type,
        razao_social: updatedContract.razao_social,
        cnpj: updatedContract.cnpj,
        cpf: updatedContract.cpf,
        nome_completo: updatedContract.nome_completo,
        email: updatedContract.email,
        telefone: updatedContract.telefone,
        signed_at: updatedContract.signed_at,
        signed_pdf_storage_path: updatedContract.pdf_signed_path,
      })
      await supabase.from('contracts').update({ n8n_notified_at: new Date().toISOString() }).eq('id', contract.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error('Erro no webhook de contratos:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
