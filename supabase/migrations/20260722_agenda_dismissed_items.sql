-- Permite "esconder" uma reuniao ou e-mail da tela de Agenda sem apagar de
-- verdade no Google (o escopo de OAuth conectado e readonly, entao apagar de
-- fato exigiria pedir uma permissao mais forte e um novo consentimento).
CREATE TABLE IF NOT EXISTS agenda_dismissed_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type  TEXT NOT NULL CHECK (item_type IN ('event', 'email')),
  item_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_id)
);

ALTER TABLE agenda_dismissed_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_dismissed_items_own" ON agenda_dismissed_items;

CREATE POLICY "agenda_dismissed_items_own"
  ON agenda_dismissed_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
