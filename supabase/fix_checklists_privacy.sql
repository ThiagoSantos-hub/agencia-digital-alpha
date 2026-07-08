-- 1. Limpar políticas antigas de checklists e itens
DROP POLICY IF EXISTS "checklists_select_policy" ON checklists;
DROP POLICY IF EXISTS "checklists_insert_policy" ON checklists;
DROP POLICY IF EXISTS "checklists_update_policy" ON checklists;
DROP POLICY IF EXISTS "checklists_delete_policy" ON checklists;
DROP POLICY IF EXISTS "checklist_items_select_policy" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert_policy" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_update_policy" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_delete_policy" ON checklist_items;

-- 2. Garantir que as tabelas tenham RLS habilitado
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- 3. NOVAS POLÍTICAS: PRIVACIDADE TOTAL (Cada um vê apenas o seu)

-- Checklists
CREATE POLICY "checklists_personal_access" ON checklists
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Checklist Items (Acesso via o checklist pai)
CREATE POLICY "checklist_items_personal_access" ON checklist_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_items.checklist_id
    AND checklists.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_items.checklist_id
    AND checklists.user_id = auth.uid()
  )
);

-- 4. Permissões de acesso
GRANT ALL ON TABLE checklists TO postgres, service_role, authenticated;
GRANT ALL ON TABLE checklist_items TO postgres, service_role, authenticated;
