-- Migration 056: Corrige políticas RLS conflitantes que impedem o UPDATE de position

-- 1. Remover TODAS as políticas antigas de UPDATE (por nome, para garantir limpeza total)
DROP POLICY IF EXISTS "checklists_update" ON public.checklists;
DROP POLICY IF EXISTS "checklists_update_policy" ON public.checklists;
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.checklists;
DROP POLICY IF EXISTS "checklists_personal_access" ON public.checklists;

DROP POLICY IF EXISTS "checklist_items_update" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_update_policy" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can update items of their checklists" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_personal_access" ON public.checklist_items;

-- 2. Recriar políticas de UPDATE limpas e claras

-- Checklists: o usuário pode atualizar apenas os próprios checklists
CREATE POLICY "Users can update their own checklists" ON public.checklists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checklist Items: o usuário pode atualizar itens dos seus próprios checklists
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
