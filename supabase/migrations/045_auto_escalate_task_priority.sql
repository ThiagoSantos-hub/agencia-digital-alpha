-- Função para aumentar a prioridade das tarefas após 24 horas
CREATE OR REPLACE FUNCTION public.auto_escalate_task_priority()
RETURNS void AS $$
BEGIN
  -- Escalar de 'baixa' para 'media' tarefas criadas há mais de 24 horas
  UPDATE public.tasks
  SET priority = 'media'
  WHERE priority = 'baixa'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';

  -- Escalar de 'media' para 'alta' tarefas criadas há mais de 24 horas
  UPDATE public.tasks
  SET priority = 'alta'
  WHERE priority = 'media'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissão para execução
GRANT EXECUTE ON FUNCTION public.auto_escalate_task_priority() TO authenticated;
