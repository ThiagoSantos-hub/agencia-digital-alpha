-- Migration 044: Checklists com Recorrência por Dias da Semana

-- Adicionar coluna para armazenar os dias da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS recurrence_days INT[] DEFAULT '{}';

-- Atualizar a função de reset para considerar os dias da semana
CREATE OR REPLACE FUNCTION public.reset_recurring_checklists_by_day()
RETURNS void AS $$
DECLARE
  current_day INT;
BEGIN
  -- Obter o dia da semana atual (0-6, onde 0 é Domingo no PostgreSQL 'dow')
  current_day := EXTRACT(DOW FROM NOW())::INT;

  -- Resetar checklists que estão configurados para o dia de hoje e que ainda não foram resetados hoje
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE current_day = ANY(recurrence_days)
    AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL)
  );

  -- Atualizar o timestamp de reset e o status das listas resetadas hoje
  UPDATE public.checklists
  SET last_reset_at = NOW(), status = 'pending'
  WHERE current_day = ANY(recurrence_days)
  AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
