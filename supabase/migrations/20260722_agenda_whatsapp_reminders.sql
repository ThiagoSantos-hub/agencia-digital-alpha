-- Guarda o grupo/número do WhatsApp escolhido na criação de uma reunião, pra
-- um cron reenviar o link 30 minutos antes do início. O aviso imediato (na
-- hora de criar) já é disparado direto pela rota de criação, sem precisar
-- disso — essa tabela é só pro lembrete futuro.
CREATE TABLE IF NOT EXISTS agenda_whatsapp_reminders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id          TEXT NOT NULL,
  title             TEXT NOT NULL,
  start_at          TIMESTAMPTZ NOT NULL,
  meet_link         TEXT,
  whatsapp_destino  TEXT NOT NULL,
  whatsapp_fonte    TEXT NOT NULL DEFAULT 'own' CHECK (whatsapp_fonte IN ('own', 'agency')),
  lembrete_enviado_em TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_whatsapp_reminders_pendentes
  ON agenda_whatsapp_reminders(start_at) WHERE lembrete_enviado_em IS NULL;

ALTER TABLE agenda_whatsapp_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_whatsapp_reminders_own" ON agenda_whatsapp_reminders;
CREATE POLICY "agenda_whatsapp_reminders_own"
  ON agenda_whatsapp_reminders FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
