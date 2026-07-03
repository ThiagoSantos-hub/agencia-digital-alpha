-- ==========================================
-- Integração Meta Ads e Visibilidade de Campanhas
-- Agência Digital Alpha
-- ==========================================

-- 1. Adicionar campos de Meta Ads na tabela de clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS show_campaigns BOOLEAN DEFAULT true;

-- 2. Adicionar campos de Meta Ads na tabela de campanhas
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date DATE;

-- 3. Comentários explicativos
COMMENT ON COLUMN clients.meta_ad_account_id IS 'ID da conta de anúncios do Meta para este cliente';
COMMENT ON COLUMN clients.show_campaigns IS 'Se as campanhas deste cliente devem aparecer no módulo de análise';
COMMENT ON COLUMN campaigns.meta_campaign_id IS 'ID real da campanha no Meta Ads';
