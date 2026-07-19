-- is_ghost existia desde 20260711 mas nunca foi usado de verdade (nenhum código lia ou
-- escrevia nela) — grupos "fantasma" da Evolution API continuavam aparecendo porque
-- /api/whatsapp/groups fazia delete+insert a cada sync, perdendo qualquer marcação.
-- Agora a rota faz upsert (preserva is_ghost) e filtra grupos escondidos na resposta.
UPDATE whatsapp_groups SET is_ghost = false WHERE is_ghost IS NULL;
ALTER TABLE whatsapp_groups ALTER COLUMN is_ghost SET NOT NULL;
ALTER TABLE whatsapp_groups ALTER COLUMN is_ghost SET DEFAULT false;
