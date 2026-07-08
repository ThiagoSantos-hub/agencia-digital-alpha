-- Migration 041: Atualizar status para Kanban (A Fazer, Em Andamento, Finalizada)

-- 1. Remover a constraint antiga
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 2. Adicionar a nova constraint com os status solicitados
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada'));

-- 3. Atualizar tarefas existentes para os novos status (se houver)
UPDATE tasks SET status = 'a_fazer' WHERE status = 'pendente';
UPDATE tasks SET status = 'finalizada' WHERE status IN ('concluida', 'cancelada');

-- 4. Garantir que o valor padrão seja 'a_fazer'
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'a_fazer';
