-- Adicionar coluna de posição na tabela de checklists
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Adicionar coluna de posição na tabela de itens de checklist
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Atualizar posições existentes (opcional, mas bom para consistência)
WITH ranked_checklists AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 as new_pos
  FROM public.checklists
)
UPDATE public.checklists
SET position = ranked_checklists.new_pos
FROM ranked_checklists
WHERE public.checklists.id = ranked_checklists.id;

WITH ranked_items AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY checklist_id ORDER BY created_at ASC) - 1 as new_pos
  FROM public.checklist_items
)
UPDATE public.checklist_items
SET position = ranked_items.new_pos
FROM ranked_items
WHERE public.checklist_items.id = ranked_items.id;
