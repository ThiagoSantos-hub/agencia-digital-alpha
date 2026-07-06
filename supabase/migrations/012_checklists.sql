-- Tabela de checklists (cada usuário tem os seus)
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens de cada checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

-- RLS: habilitar nas duas tabelas
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para checklists (cada usuário vê só os seus)
CREATE POLICY "checklists_select" ON checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklists_insert" ON checklists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklists_update" ON checklists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "checklists_delete" ON checklists FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para checklist_items (cada usuário vê só os seus)
CREATE POLICY "checklist_items_select" ON checklist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklist_items_insert" ON checklist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklist_items_update" ON checklist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "checklist_items_delete" ON checklist_items FOR DELETE USING (auth.uid() = user_id);
