-- ==========================================
-- Fix: Constraint UNIQUE em meta_campaign_id
-- Necessário para o upsert da sincronização Meta Ads funcionar
-- Agência Digital Alpha
-- ==========================================

-- Remover duplicatas antes de criar a constraint
-- (mantém o registro mais recente por meta_campaign_id)
DELETE FROM campaigns
WHERE id NOT IN (
  SELECT DISTINCT ON (meta_campaign_id) id
  FROM campaigns
  WHERE meta_campaign_id IS NOT NULL
  ORDER BY meta_campaign_id, created_at DESC
);

-- Adicionar constraint UNIQUE em meta_campaign_id
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_meta_campaign_id_unique
  UNIQUE (meta_campaign_id);
