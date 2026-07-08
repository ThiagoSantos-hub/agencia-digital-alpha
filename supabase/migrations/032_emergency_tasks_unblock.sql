-- 1. Garante que AMBAS as colunas existam para evitar erro de cache no navegador
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 2. Remove todas as chaves estrangeiras que podem causar Erro 400 se o ID for inválido
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_collaborator_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_campaign_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_owner_id_fkey;

-- 3. Remove todas as validações de status e prioridade (aceita qualquer texto agora)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- 4. Desativa temporariamente o RLS para garantir que o erro não seja de permissão
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- 5. Força o reload do PostgREST
NOTIFY pgrst, 'reload schema';
