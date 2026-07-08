-- Remove a constraint de check que está causando o erro 400 (violação de constraint)
-- Esta constraint impede que status como 'a_fazer' sejam inseridos se não estiverem na lista antiga.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Garante que a coluna status tenha um valor padrão válido caso não seja enviado
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'a_fazer';
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'media';

-- Remove qualquer outra restrição de check que possa existir
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check1') THEN
        ALTER TABLE tasks DROP CONSTRAINT tasks_status_check1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check2') THEN
        ALTER TABLE tasks DROP CONSTRAINT tasks_status_check2;
    END IF;
END $$;
