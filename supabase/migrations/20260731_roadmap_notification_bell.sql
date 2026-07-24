-- Adiciona ao roadmap "Próximas Atualizações" o sino de notificações em
-- tempo real (som + pop-up), que passou de bugado (nunca tocava, ver
-- lib/notificationPrefs.ts) para disponível nesta sessão. Fica separado do
-- item "Central de Notificações" (que ainda é o plano maior de WhatsApp/
-- e-mail/push, esse continua planejado).
INSERT INTO roadmap_features (category, name, description, benefits, how_to_use, problem_solved, status, display_order)
SELECT
  'Notificações',
  'Sino de Notificações em Tempo Real',
  'Toque de som e pop-up automático na tela assim que chega uma tarefa nova, uma novidade da agência ou um feedback, sem precisar atualizar a página.',
  'Você fica sabendo na hora do que aconteceu, mesmo com o sistema aberto em outra aba.',
  'Já funciona sozinho em qualquer tela do sistema. Só precisa ter dado um clique em qualquer lugar da página para o navegador liberar o som.',
  'Antes era preciso ficar atualizando a página pra descobrir se chegou alguma coisa nova.',
  'disponivel',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM roadmap_features WHERE category = 'Notificações' AND name = 'Sino de Notificações em Tempo Real'
);
