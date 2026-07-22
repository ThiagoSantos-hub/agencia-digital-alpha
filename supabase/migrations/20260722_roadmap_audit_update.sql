-- Auditoria do roadmap "Proximas Atualizacoes": marca como disponivel 2 itens
-- que ja estao construidos e funcionando na producao, mas ainda apareciam
-- como planejado.

UPDATE roadmap_features
SET status = 'disponivel',
    updated_at = NOW()
WHERE category = 'Contratos' AND name = 'Editor de Contratos e Modelos';

UPDATE roadmap_features
SET status = 'disponivel',
    description = 'Configure e gerencie suas próprias chaves de API, como OpenAI, Meta, Google e Evolution, na tela de Integrações.',
    how_to_use = 'Menu Integrações.',
    updated_at = NOW()
WHERE category = 'Configurações' AND name = 'Gerenciamento de APIs';
