-- ==========================================
-- AGÊNCIA DIGITAL ALPHA — Migration 065
-- Módulo: WhatsApp Multi-tenant (por gestor)
-- ==========================================

-- Tabela de instâncias WhatsApp por usuário (gestor/empresa)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name   TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'disconnected'
                              CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  phone_number    TEXT,
  connected_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_instances_select_own" ON whatsapp_instances;
CREATE POLICY "whatsapp_instances_select_own" ON whatsapp_instances FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_instances_insert_own" ON whatsapp_instances;
CREATE POLICY "whatsapp_instances_insert_own" ON whatsapp_instances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_instances_update_own" ON whatsapp_instances;
CREATE POLICY "whatsapp_instances_update_own" ON whatsapp_instances FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_instances_delete_own" ON whatsapp_instances;
CREATE POLICY "whatsapp_instances_delete_own" ON whatsapp_instances FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS whatsapp_instances_updated_at ON whatsapp_instances;
CREATE TRIGGER whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cache de grupos WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id          TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  participant_count INTEGER     DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id)
);

ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_groups_select_own" ON whatsapp_groups;
CREATE POLICY "whatsapp_groups_select_own" ON whatsapp_groups FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_groups_insert_own" ON whatsapp_groups;
CREATE POLICY "whatsapp_groups_insert_own" ON whatsapp_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_groups_update_own" ON whatsapp_groups;
CREATE POLICY "whatsapp_groups_update_own" ON whatsapp_groups FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "whatsapp_groups_delete_own" ON whatsapp_groups;
CREATE POLICY "whatsapp_groups_delete_own" ON whatsapp_groups FOR DELETE
  USING (auth.uid() = user_id);
