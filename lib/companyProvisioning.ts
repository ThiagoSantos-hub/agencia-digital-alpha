import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function resolveUniqueSlug(companyName: string): Promise<string> {
  const base = slugify(companyName)
  let candidate = base
  let suffix = 2
  // Empresas criadas manualmente já escolhem o slug na hora; aqui (cadastro
  // público, sem humano pra digitar) precisamos resolver colisão sozinhos.
  while (true) {
    const { data } = await supabaseAdmin.from('companies').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${suffix}`
    suffix++
  }
}

export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64url')
}

export interface ProvisionCompanyInput {
  companyName: string
  adminName: string
  adminEmail: string
  adminPassword: string
  companySlug?: string
  metaTesterProfile?: string | null
  phone?: string | null
  plan?: 'basico' | 'pro' | 'premium' | null
  paymentMethod?: 'card' | 'pix' | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  subscriptionStatus?: string | null
  accessExpiresAt?: string | null
}

export type ProvisionCompanyResult =
  | { success: true; company: Record<string, unknown> }
  | { success: false; error: string; status: number }

// Cria a empresa + primeiro usuário admin + integrações pré-criadas —
// extraído de app/api/superadmin/companies/route.ts pra ser reutilizado tanto
// pelo cadastro manual (Superadmin) quanto pelo webhook do Stripe. NÃO envia
// e-mail — quem chama decide o que mandar (ver lib/email.ts).
export async function provisionCompany(input: ProvisionCompanyInput): Promise<ProvisionCompanyResult> {
  const slug = input.companySlug || (await resolveUniqueSlug(input.companyName))

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: input.companyName,
      slug,
      meta_tester_profile: input.metaTesterProfile || null,
      phone: input.phone || null,
      plan: input.plan || null,
      payment_method: input.paymentMethod || null,
      stripe_customer_id: input.stripeCustomerId || null,
      stripe_subscription_id: input.stripeSubscriptionId || null,
      subscription_status: input.subscriptionStatus || null,
      access_expires_at: input.accessExpiresAt || null,
    })
    .select()
    .single()

  if (companyError || !company) {
    return { success: false, error: companyError?.message || 'Erro ao criar empresa.', status: 400 }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.adminEmail,
    password: input.adminPassword,
    email_confirm: true,
    user_metadata: { name: input.adminName, role: 'admin', company_id: company.id },
  })

  if (authError || !authData.user) {
    // Rollback: sem admin, a empresa fica órfã — remove pra permitir tentar de novo.
    await supabaseAdmin.from('companies').delete().eq('id', company.id)
    return { success: false, error: authError?.message || 'Erro ao criar usuário admin.', status: 400 }
  }

  await supabaseAdmin
    .from('profiles')
    .upsert({ id: authData.user.id, email: input.adminEmail, name: input.adminName, role: 'admin', company_id: company.id, must_change_password: true })

  // As rotas de assinatura eletrônica só fazem UPDATE (não upsert) em integrations,
  // e a tela de Integrações só mostra cartões de integrações que já existem no
  // banco — sem isso a empresa nasce com a seção "Conexões OAuth" vazia.
  await supabaseAdmin.from('integrations').insert([
    { company_id: company.id, type: 'autentique', label: 'Autentique', status: 'disconnected' },
    { company_id: company.id, type: 'assinafy', label: 'Assinafy', status: 'disconnected' },
    { company_id: company.id, type: 'meta_ads', label: 'Meta Ads', status: 'disconnected' },
    { company_id: company.id, type: 'google_ads', label: 'Google Ads', status: 'disconnected' },
    { company_id: company.id, type: 'gmail', label: 'Gmail', status: 'disconnected' },
    { company_id: company.id, type: 'google_drive', label: 'Google Drive', status: 'disconnected' },
    { company_id: company.id, type: 'google_calendar', label: 'Google Calendar', status: 'disconnected' },
  ])

  return { success: true, company }
}
