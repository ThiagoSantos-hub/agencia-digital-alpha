-- Migration 042: Sistema de Notificações em Tempo Real (Ajustado)

-- Garantir que a tabela tenha a estrutura que o hook useNotificacoes espera
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'geral', -- 'task', 'vencimento_5dias', etc
  titulo        TEXT NOT NULL,
  mensagem      TEXT NOT NULL,
  lida          BOOLEAN NOT NULL DEFAULT FALSE,
  finance_id    UUID, -- Opcional: link para financeiro
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "users_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;

-- Usuários só veem suas próprias notificações
CREATE POLICY "users_view_own_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem marcar suas notificações como lidas
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para criar notificação quando uma tarefa for atribuída a um colaborador
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notifica se a tarefa for atribuída a alguém que NÃO seja quem a criou (ex: Admin atribuindo a Colaborador)
  IF NEW.assigned_to != NEW.created_by THEN
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.assigned_to,
      'Nova Tarefa Atribuída',
      'Você recebeu uma nova tarefa: ' || NEW.title,
      'geral'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- Trigger para notificar quando o status da tarefa mudar
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifica o criador da tarefa quando o status muda (se não foi o próprio criador que mudou)
  IF OLD.status != NEW.status AND NEW.created_by != auth.uid() THEN
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.created_by,
      'Status de Tarefa Atualizado',
      'A tarefa "' || NEW.title || '" foi movida para ' || NEW.status,
      'geral'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_status_changed ON tasks;
CREATE TRIGGER on_task_status_changed
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_change();
