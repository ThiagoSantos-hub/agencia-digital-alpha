-- Permite frequência semanal nos itens de valor dos modelos de contrato,
-- além de único e mensal.
ALTER TABLE contract_template_pricing_items DROP CONSTRAINT IF EXISTS contract_template_pricing_items_frequency_check;
ALTER TABLE contract_template_pricing_items ADD CONSTRAINT contract_template_pricing_items_frequency_check
  CHECK (frequency IN ('unico', 'mensal', 'semanal'));
