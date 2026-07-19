-- is_ghost devia existir desde 20260711, mas essa migration nunca rodou em produção
-- (só o resto dela — as policies de reports/report_history — chegou a ser aplicado
-- manualmente antes). Nenhum código lia ou escrevia nela mesmo quando existia — grupos
-- "fantasma" da Evolution API continuavam aparecendo porque /api/whatsapp/groups fazia
-- delete+insert a cada sync, perdendo qualquer marcação. Agora a rota faz upsert
-- (preserva is_ghost) e filtra grupos escondidos na resposta.
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN DEFAULT false;
UPDATE whatsapp_groups SET is_ghost = false WHERE is_ghost IS NULL;
ALTER TABLE whatsapp_groups ALTER COLUMN is_ghost SET NOT NULL;
ALTER TABLE whatsapp_groups ALTER COLUMN is_ghost SET DEFAULT false;
