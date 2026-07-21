-- Adiciona o Assinafy como segundo provedor de assinatura eletrônica (ao lado
-- do Autentique). Cada empresa escolhe qual dos dois usa nos seus contratos.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS esignature_provider TEXT NOT NULL DEFAULT 'autentique'
    CHECK (esignature_provider IN ('autentique', 'assinafy'));

-- Semeia uma linha 'assinafy' desconectada pra cada empresa já existente
-- (mesmo padrão de 'autentique' semeado em 20260718_create_contracts.sql,
-- só que agora por empresa em vez de global).
INSERT INTO integrations (company_id, type, label, status)
SELECT id, 'assinafy', 'Assinafy', 'disconnected' FROM companies
ON CONFLICT (company_id, type) DO NOTHING;
