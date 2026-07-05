-- Migration 017: Integrações do colaborador

CREATE TABLE IF NOT EXISTS collaborator_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'openai',
    'elevenlabs',
    'whatsapp',
    'meta_ads',
    'google_ads',
    'google_drive'
  )),
  api_key TEXT,
  extra_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collaborator_id, type)
);

-- Índice
CREATE INDEX IF NOT EXISTS collaborator_integrations_collaborator_id_idx
  ON collaborator_integrations(collaborator_id);

-- RLS: somente o próprio colaborador acessa
ALTER TABLE collaborator_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborator owns integrations"
  ON collaborator_integrations
  FOR ALL
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );
