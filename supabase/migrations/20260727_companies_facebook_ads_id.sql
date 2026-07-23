-- Identidade real do Facebook, capturada no momento em que a empresa conecta
-- o Meta Ads de verdade (OAuth, GET /me na Graph API) — diferente do
-- meta_tester_profile (texto autodeclarado). Usada só pra travar o plano
-- Gratuito: a mesma conta real do Facebook não pode "dar valor de verdade"
-- (gerenciar clientes reais) em mais de uma empresa Gratuita ao mesmo tempo.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_ads_id TEXT;
CREATE INDEX IF NOT EXISTS idx_companies_facebook_ads_id ON companies(facebook_ads_id) WHERE facebook_ads_id IS NOT NULL;
