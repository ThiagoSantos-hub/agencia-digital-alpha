-- Atualizar a constraint de check na coluna status para incluir 'pendente'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pendente', 'a_fazer', 'em_andamento', 'finalizada'));
