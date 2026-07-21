-- Cada usuario (admin ou colaborador) passa a ter sua propria IA: chave da
-- OpenAI (chat, TTS de fallback e transcricao) e da ElevenLabs (voz), uma
-- linha por pessoa. Antes disso a IA inteira usava uma unica chave de
-- ambiente compartilhada por todo o sistema, sem nenhum isolamento.
CREATE TABLE IF NOT EXISTS personal_ai_keys (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key      TEXT,
  elevenlabs_api_key  TEXT,
  elevenlabs_voice_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE personal_ai_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_ai_keys_own" ON personal_ai_keys;

CREATE POLICY "personal_ai_keys_own"
  ON personal_ai_keys FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
