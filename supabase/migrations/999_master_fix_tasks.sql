-- SCRIPT MESTRE DE CORREÇÃO DE TAREFAS
-- Este script garante que o banco de dados aceite 'urgente' e 'pendente'

-- 1. Atualizar Status Permitidos
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pendente', 'a_fazer', 'em_andamento', 'finalizada'));

-- 2. Atualizar Prioridades Permitidas
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 3. Garantir Visibilidade de Perfis
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 4. Garantir Visibilidade de Tarefas (Admin vê tudo, Colaborador vê o que criou ou recebeu)
DROP POLICY IF EXISTS "Admins can view everything, others only their own" ON public.tasks;
CREATE POLICY "Admins can view everything, others only their own" ON public.tasks
  FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() = created_by)
    OR (auth.uid() = assigned_to)
  );

-- 5. Garantir Permissão de Inserção
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);
