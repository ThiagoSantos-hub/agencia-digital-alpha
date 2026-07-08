-- 1. Garantir que as colunas de posição existam
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Atualizar políticas de RLS para permitir atualização das colunas de posição
-- Checklists
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.checklists;
CREATE POLICY "Users can update their own checklists" ON public.checklists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checklist Items
DROP POLICY IF EXISTS "Users can update items of their checklists" ON public.checklist_items;
CREATE POLICY "Users can update items of their checklists" ON public.checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.user_id = auth.uid()
    )
  );
