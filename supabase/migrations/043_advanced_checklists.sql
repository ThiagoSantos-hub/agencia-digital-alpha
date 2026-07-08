-- Migration 043: Checklists Avançados com Recorrência e Reset

-- Adicionar colunas de recorrência e status à tabela checklists
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'once' CHECK (recurrence IN ('once', 'daily', 'weekly'));
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));

-- Função para verificar se todos os itens estão concluídos e atualizar o status da lista
CREATE OR REPLACE FUNCTION public.update_checklist_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se todos os itens do checklist estiverem marcados como 'completed = true'
  IF NOT EXISTS (
    SELECT 1 FROM public.checklist_items 
    WHERE checklist_id = NEW.checklist_id AND completed = false
  ) THEN
    UPDATE public.checklists SET status = 'completed' WHERE id = NEW.checklist_id;
  ELSE
    UPDATE public.checklists SET status = 'pending' WHERE id = NEW.checklist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar status do checklist quando um item for alterado
DROP TRIGGER IF EXISTS on_checklist_item_change ON checklist_items;
CREATE TRIGGER on_checklist_item_change
  AFTER UPDATE OF completed OR INSERT OR DELETE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_checklist_status();

-- Função para resetar checklists diários/semanais (pode ser chamada via API ou Edge Function)
CREATE OR REPLACE FUNCTION public.reset_recurring_checklists()
RETURNS void AS $$
BEGIN
  -- Reset Diário: Se passou de 24h
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE recurrence = 'daily' 
    AND last_reset_at < NOW() - INTERVAL '24 hours'
  );

  -- Reset Semanal: Se passou de 7 dias
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE recurrence = 'weekly' 
    AND last_reset_at < NOW() - INTERVAL '7 days'
  );

  -- Atualizar o timestamp de reset
  UPDATE public.checklists
  SET last_reset_at = NOW(), status = 'pending'
  WHERE (recurrence = 'daily' AND last_reset_at < NOW() - INTERVAL '24 hours')
     OR (recurrence = 'weekly' AND last_reset_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
