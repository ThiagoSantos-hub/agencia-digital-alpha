-- Contratos Automáticos: templates de contrato, contratos gerados e bucket de PDFs.

CREATE TABLE contract_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT UNIQUE NOT NULL CHECK (type IN ('completo','crm','trafego')),
  label           TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD')),
  setup_fee       NUMERIC(10,2) NOT NULL,
  monthly_fee     NUMERIC(10,2) NOT NULL,
  -- Campos extras de escopo por tipo (não precisam de coluna nova a cada ajuste):
  -- completo: { "monthly_trafego": 600, "monthly_crm": 600 }
  -- crm:      { "funis_max": 4, "automacoes_max": 5, "prazo_implantacao_dias": 10,
  --             "treinamento_h_mes1": 2, "treinamento_h_apartir_mes2": 1 }
  extra_config    JSONB NOT NULL DEFAULT '{}',
  updated_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/gestor pode ler modelos" ON contract_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role != 'collaborator'
    )
  );

CREATE POLICY "Admin/gestor pode editar modelos" ON contract_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role != 'collaborator'
    )
  );

CREATE OR REPLACE TRIGGER contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO contract_templates (type, label, currency, setup_fee, monthly_fee, extra_config) VALUES
  ('completo', 'Tráfego Pago + CRM (Completo)', 'BRL', 1000.00, 1200.00,
    '{"monthly_trafego": 600, "monthly_crm": 600}'),
  ('crm', 'CRM Digital Alpha (Standalone)', 'USD', 250.00, 200.00,
    '{"funis_max": 4, "automacoes_max": 5, "prazo_implantacao_dias": 10, "treinamento_h_mes1": 2, "treinamento_h_apartir_mes2": 1}'),
  ('trafego', 'Gestão de Tráfego Pago (Plano Mensal)', 'BRL', 1500.00, 0.00,
    '{"prazo_dias": 30, "parcelamento_max_cartao": 6}')
ON CONFLICT (type) DO NOTHING;

CREATE TABLE contracts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type            TEXT NOT NULL CHECK (contract_type IN ('completo','crm','trafego')),
  status                   TEXT NOT NULL DEFAULT 'rascunho'
                            CHECK (status IN ('rascunho','aguardando_assinatura','assinado','expirado','cancelado')),
  -- CONTRATANTE (do formulário público; razao_social/cnpj só se aplicam ao tipo 'completo')
  razao_social             TEXT,
  cnpj                     TEXT,
  cpf                      TEXT,
  endereco                 TEXT NOT NULL,
  cidade                   TEXT NOT NULL,
  estado                   TEXT NOT NULL,
  cep                      TEXT,
  nome_completo            TEXT NOT NULL,
  email                    TEXT NOT NULL,
  telefone                 TEXT NOT NULL,
  data_contrato            DATE NOT NULL DEFAULT CURRENT_DATE,
  -- snapshot dos valores do contract_templates no momento da geração (nunca muda depois)
  currency_snapshot        TEXT NOT NULL,
  setup_fee_snapshot       NUMERIC(10,2) NOT NULL,
  monthly_fee_snapshot     NUMERIC(10,2) NOT NULL,
  extra_config_snapshot    JSONB NOT NULL DEFAULT '{}',
  -- auditoria (documento com peso jurídico)
  ip_address               TEXT,
  user_agent               TEXT,
  -- PDFs (Storage object paths, bucket privado)
  pdf_draft_path           TEXT,
  pdf_signed_path          TEXT,
  -- assinatura eletrônica
  esignature_provider      TEXT NOT NULL DEFAULT 'autentique',
  esignature_document_id   TEXT,
  esignature_document_url  TEXT,
  signer_client_status     TEXT NOT NULL DEFAULT 'pendente' CHECK (signer_client_status IN ('pendente','assinado')),
  signer_thiago_status     TEXT NOT NULL DEFAULT 'pendente' CHECK (signer_thiago_status IN ('pendente','assinado')),
  webhook_payload_raw      JSONB,
  n8n_notified_at          TIMESTAMPTZ,
  sent_at                  TIMESTAMPTZ,
  signed_at                TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  cancelled_reason         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
-- Sem políticas: acesso só via service-role dentro das API routes (mesmo padrão de
-- app/api/relatorios/gerar-mensagem/route.ts). O painel do gestor nunca lê esta tabela
-- direto do client; sempre via app/api/contracts/*, que valida a sessão manualmente.

CREATE OR REPLACE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX contracts_status_idx ON contracts(status);
CREATE INDEX contracts_type_idx ON contracts(contract_type);
CREATE INDEX contracts_esignature_document_id_idx ON contracts(esignature_document_id);

-- Bucket privado para os PDFs (rascunho e assinado). Sem policies de storage.objects —
-- só o service-role acessa (upload/download feitos nas API routes).
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Provedor de assinatura eletrônica, seguindo o padrão já usado para meta_ads/google_ads/etc.
INSERT INTO integrations (type, label, status) VALUES
  ('autentique', 'Autentique', 'disconnected')
ON CONFLICT (type) DO NOTHING;
