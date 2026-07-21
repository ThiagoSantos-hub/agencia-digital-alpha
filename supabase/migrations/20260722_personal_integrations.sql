-- Agenda pessoal: cada usuario (admin ou colaborador) conecta seu proprio
-- Gmail e Google Agenda, diferente das integracoes da empresa (google_ads,
-- google_drive) que sao uma so por empresa. Por isso uma tabela separada,
-- ligada a auth.users em vez de companies.
CREATE TABLE IF NOT EXISTS personal_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('gmail', 'google_calendar')),
  status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected')),
  access_token    TEXT,
  refresh_token   TEXT,
  token_expiry    TIMESTAMPTZ,
  connected_email TEXT,
  connected_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type)
);

ALTER TABLE personal_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_integrations_own"
  ON personal_integrations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
