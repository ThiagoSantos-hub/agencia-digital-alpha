-- Permite mostrar "Criado por: [nome]" em Relatórios e Alertas. reports.user_id
-- e alerts.user_id já referenciavam auth.users, mas não profiles diretamente,
-- então o embed do PostgREST (profiles:user_id(...)) não funcionava. Adiciona
-- o FK direto pra profiles, mesmo padrão de tasks_created_by_fkey.
ALTER TABLE reports ADD CONSTRAINT reports_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE alerts ADD CONSTRAINT alerts_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
