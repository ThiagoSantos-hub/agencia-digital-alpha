-- Empresas criadas antes desta correção (ex: "Agencia Teste") nasceram sem as
-- linhas de meta_ads/google_ads/gmail/google_drive/google_calendar em
-- integrations -- a tela de Integrações só exibe cartões que já existem no
-- banco, então a seção "Conexões OAuth" ficava completamente vazia pra elas.
-- Backfill idempotente: só insere o que ainda não existe, pra qualquer
-- empresa que já esteja no sistema.
INSERT INTO integrations (company_id, type, label, status)
SELECT c.id, t.type, t.label, 'disconnected'
FROM companies c
CROSS JOIN (VALUES
  ('meta_ads', 'Meta Ads'),
  ('google_ads', 'Google Ads'),
  ('gmail', 'Gmail'),
  ('google_drive', 'Google Drive'),
  ('google_calendar', 'Google Calendar')
) AS t(type, label)
WHERE NOT EXISTS (
  SELECT 1 FROM integrations i WHERE i.company_id = c.id AND i.type = t.type
);
