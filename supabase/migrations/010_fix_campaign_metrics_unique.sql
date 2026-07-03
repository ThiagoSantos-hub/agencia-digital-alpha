-- ==========================================
-- Fix: Constraint UNIQUE em campaign_metrics
-- Necessário para o upsert de métricas funcionar
-- Agência Digital Alpha
-- ==========================================

-- Remover duplicatas antes de criar a constraint
DELETE FROM campaign_metrics
WHERE id NOT IN (
  SELECT DISTINCT ON (campaign_id, metric_key) id
  FROM campaign_metrics
  ORDER BY campaign_id, metric_key, updated_at DESC
);

-- Adicionar constraint UNIQUE composta
ALTER TABLE campaign_metrics
  ADD CONSTRAINT campaign_metrics_campaign_metric_unique
  UNIQUE (campaign_id, metric_key);
