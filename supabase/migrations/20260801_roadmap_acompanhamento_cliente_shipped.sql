-- Reflete no roadmap "Próximas Atualizações" o que o módulo Acompanhamento
-- do Cliente realmente entregou nesta leva: Crescimento, Instagram, Meta Ads
-- (no acompanhamento), IA de Análise e Modo Reunião viram disponível. Alguns
-- itens estavam bundlados (Instagram+Facebook, Meta Ads+Google Ads) e só
-- metade foi entregue agora, por isso foram separados em duas linhas cada.

UPDATE roadmap_features
SET status = 'disponivel', updated_at = NOW()
WHERE category = 'Acompanhamento do Cliente' AND name = 'Crescimento (Diário, Semanal, Mensal, Anual)';

UPDATE roadmap_features
SET
  name = 'Métricas de Instagram',
  description = 'Seguidores e visitas ao perfil do Instagram vinculado à conta de anúncios do cliente, atualizado automaticamente todo dia.',
  status = 'disponivel',
  updated_at = NOW()
WHERE category = 'Acompanhamento do Cliente' AND name = 'Métricas de Instagram e Facebook';

INSERT INTO roadmap_features (category, name, description, benefits, how_to_use, problem_solved, status, display_order)
SELECT 'Acompanhamento do Cliente', 'Métricas de Facebook (Página)',
  'Curtidas, comentários, compartilhamentos e alcance da página do Facebook do cliente.',
  'Completa o quadro de social media junto com o Instagram.',
  'Aba de Acompanhamento, na seção de Redes Sociais.',
  'Depende de uma permissão nova do Meta (pages_read_engagement) e passar pelo App Review de novo.',
  'planejado', 7
WHERE NOT EXISTS (SELECT 1 FROM roadmap_features WHERE category = 'Acompanhamento do Cliente' AND name = 'Métricas de Facebook (Página)');

UPDATE roadmap_features
SET
  name = 'Métricas de Google Ads',
  description = 'Cliques, impressões, CTR, CPC e conversões do Google Ads no Acompanhamento do Cliente.',
  problem_solved = 'Bloqueado até conseguir o Developer Token do Google Ads (precisa de uma conta MCC).',
  updated_at = NOW()
WHERE category = 'Acompanhamento do Cliente' AND name = 'Métricas de Meta Ads e Google Ads';

INSERT INTO roadmap_features (category, name, description, benefits, how_to_use, problem_solved, status, display_order)
SELECT 'Acompanhamento do Cliente', 'Métricas de Meta Ads no Acompanhamento',
  'Investimento, impressões, cliques e leads do Meta Ads dentro do histórico de crescimento do cliente, atualizado automaticamente todo dia.',
  'Dá pra ver a performance paga junto com o crescimento, sem abrir o Gerenciador de Anúncios.',
  'Aba de Acompanhamento, na seção de Tráfego Pago.',
  'Antes só dava pra ver métricas de campanha isoladas, sem histórico por dia.',
  'disponivel', 8
WHERE NOT EXISTS (SELECT 1 FROM roadmap_features WHERE category = 'Acompanhamento do Cliente' AND name = 'Métricas de Meta Ads no Acompanhamento');

UPDATE roadmap_features
SET status = 'disponivel', updated_at = NOW()
WHERE category = 'Acompanhamento do Cliente' AND name = 'IA de Análise do Cliente';

UPDATE roadmap_features
SET
  description = 'Uma visão em tela cheia com os gráficos de crescimento, métricas e o diagnóstico de IA em formato grande, pronta pra compartilhar a tela numa reunião com o cliente.',
  problem_solved = 'Montar uma apresentação pra reunião de cliente manualmente toma bastante tempo. (Exportar em PDF/slides ainda não existe, é tela cheia dentro do próprio sistema.)',
  status = 'disponivel',
  updated_at = NOW()
WHERE category = 'Acompanhamento do Cliente' AND name = 'Modo Reunião';
