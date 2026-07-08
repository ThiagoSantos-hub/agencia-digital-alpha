-- 1. Atualizar a constraint de check na coluna priority para incluir 'urgente'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 2. Atualizar a função de escalonamento automático para incluir o nível 'urgente'
CREATE OR REPLACE FUNCTION public.auto_escalate_task_priority()
RETURNS void AS $$
BEGIN
  -- Escalar de 'baixa' para 'media'
  UPDATE public.tasks
  SET priority = 'media'
  WHERE priority = 'baixa'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';

  -- Escalar de 'media' para 'alta'
  UPDATE public.tasks
  SET priority = 'alta'
  WHERE priority = 'media'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';

  -- Escalar de 'alta' para 'urgente'
  UPDATE public.tasks
  SET priority = 'urgente'
  WHERE priority = 'alta'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
