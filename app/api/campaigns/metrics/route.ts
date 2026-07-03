-- ==========================================
-- Migration 010 — Métricas selecionadas por campanha
-- Agência Digital Alpha
-- ==========================================

-- Coluna que guarda quais métricas o gestor escolheu para esta campanha
-- Ex: ["impressions", "clicks", "spend", "actions_whatsapp"]
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS selected_metrics TEXT[] DEFAULT NULL;

COMMENT ON COLUMN campaigns.selected_metrics IS
  'Array com os metric_keys escolhidos pelo gestor para exibir nesta campanha';
