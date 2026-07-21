-- Atualiza o roadmap "Proximas Atualizacoes" depois de construir a Agenda
-- (calendario, criacao de reuniao com Google Meet e participantes, envio de
-- e-mail pelo Gmail, resumo por IA). Cada linha e atualizada pelo par
-- category+name, sem tocar nas outras categorias.

UPDATE roadmap_features
SET status = 'disponivel',
    description = 'Agende reuniões direto no sistema, elas também aparecem no seu Google Agenda de verdade, com link de videochamada (Google Meet) gerado automaticamente e convite enviado por e-mail pra quem você adicionar como participante.',
    updated_at = NOW()
WHERE category = 'Agenda' AND name = 'Reuniões';

UPDATE roadmap_features
SET status = 'disponivel',
    description = 'Veja sua agenda inteira num calendário visual de mês, navegando entre os meses e clicando em qualquer dia pra ver os compromissos daquele dia.',
    updated_at = NOW()
WHERE category = 'Agenda' AND name = 'Visualização de Calendário';

UPDATE roadmap_features
SET status = 'disponivel',
    description = 'Conecte seu Google Agenda pessoal direto no sistema (cada pessoa com a própria conta). Outlook e Apple Calendar ainda não estão disponíveis.',
    updated_at = NOW()
WHERE category = 'Agenda' AND name = 'Integrações de Calendário';

UPDATE roadmap_features
SET status = 'em_desenvolvimento',
    updated_at = NOW()
WHERE category = 'Agenda' AND name = 'IA na Agenda';

-- Funcionalidade nova que não estava na lista original: enviar e-mail
-- direto pelo Gmail conectado, sem precisar sair do sistema.
INSERT INTO roadmap_features (category, name, description, benefits, how_to_use, problem_solved, status, display_order)
SELECT
  'Agenda',
  'Enviar e-mail pelo sistema',
  'Escreva e envie um e-mail de verdade direto pela tela de Agenda, usando o seu próprio Gmail conectado.',
  'Não precisa abrir o Gmail em outra aba só pra mandar uma mensagem rápida pra um cliente.',
  'Botão "Novo e-mail" na tela de Agenda, com Gmail conectado.',
  'Antes não tinha nenhum jeito de mandar e-mail direto do sistema.',
  'disponivel',
  6
WHERE NOT EXISTS (
  SELECT 1 FROM roadmap_features WHERE category = 'Agenda' AND name = 'Enviar e-mail pelo sistema'
);
