-- Corrige vazamento entre empresas: notify_new_feedback() notificava TODOS os
-- admins da plataforma (WHERE role = 'admin', sem filtro de empresa), então o
-- admin de uma agência recebia o sino de feedback enviado por colaborador de
-- outra agência. O sino só deve tocar para quem foi designado: o(s) admin(s)
-- da própria empresa de quem enviou o feedback.
CREATE OR REPLACE FUNCTION public.notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN
    SELECT id FROM public.profiles WHERE role = 'admin' AND company_id = NEW.company_id
  LOOP
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      admin_record.id,
      CASE WHEN NEW.tipo = 'bug' THEN '🚨 Novo Bug Reportado' ELSE '💡 Nova Sugestão Recebida' END,
      'O colaborador enviou um novo feedback: ' || NEW.titulo,
      'geral'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
