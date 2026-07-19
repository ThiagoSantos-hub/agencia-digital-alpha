-- Estado de verificação dos alertas (Meta Ads), pra POST /api/alerts/check saber se já
-- disparou esse alerta (evita mandar WhatsApp de novo a cada checagem enquanto o problema
-- persiste) e resetar quando a conta voltar ao normal.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS last_status TEXT CHECK (last_status IN ('ok', 'triggered'));
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;
