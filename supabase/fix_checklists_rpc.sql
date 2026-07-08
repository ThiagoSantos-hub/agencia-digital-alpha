-- 1. Criar ou substituir a função de reset por dia da semana
CREATE OR REPLACE FUNCTION public.reset_recurring_checklists_by_day()
RETURNS void AS $$
DECLARE
  current_day INT;
BEGIN
  -- Obter o dia da semana atual (0=Domingo, 1=Segunda, ..., 6=Sábado)
  current_day := EXTRACT(DOW FROM NOW())::INT;

  -- 1. Resetar os itens dos checklists que estão marcados para o dia de hoje
  -- e que ainda não foram resetados hoje
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE current_day = ANY(recurrence_days)
    AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL)
  );

  -- 2. Atualizar o status e o timestamp de reset dos checklists
  -- Forçamos o status para 'pending' para que elas subam para o topo
  UPDATE public.checklists
  SET 
    status = 'pending',
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE current_day = ANY(recurrence_days)
  AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Dar permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO service_role;
