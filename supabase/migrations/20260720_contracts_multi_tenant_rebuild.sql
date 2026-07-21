-- Reconstrução do sistema de contratos: multi-tenant, modelos totalmente editáveis
-- por blocos (campos + cláusulas + itens de preço), galeria de exemplos prontos e
-- biblioteca de cláusulas reutilizáveis. Substitui os 3 tipos fixos da versão anterior.
-- Sem dados reais a preservar (confirmado) — recria do zero.

DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS contract_template_fields CASCADE;
DROP TABLE IF EXISTS contract_template_clauses CASCADE;
DROP TABLE IF EXISTS contract_template_pricing_items CASCADE;
DROP TABLE IF EXISTS contract_templates CASCADE;
DROP TABLE IF EXISTS clause_snippets CASCADE;

-- ─── contract_templates ─────────────────────────────────────────────────────

CREATE TABLE contract_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD')),
  active              BOOLEAN NOT NULL DEFAULT true,
  is_gallery_template BOOLEAN NOT NULL DEFAULT false,
  updated_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, slug)
);

CREATE TABLE contract_template_fields (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  field_key      TEXT NOT NULL,
  label          TEXT NOT NULL,
  field_type     TEXT NOT NULL CHECK (field_type IN
                    ('text','number','email','phone','cpf','cnpj','cep','select','date')),
  required       BOOLEAN NOT NULL DEFAULT true,
  options        JSONB,
  display_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (template_id, field_key)
);

CREATE TABLE contract_template_clauses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  display_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE contract_template_pricing_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  frequency      TEXT NOT NULL CHECK (frequency IN ('unico','mensal')),
  display_order  INTEGER NOT NULL DEFAULT 0
);

-- ─── biblioteca solta de cláusulas prontas (não presa a nenhum template) ────

CREATE TABLE clause_snippets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL CHECK (category IN
                   ('pagamento','rescisao','confidencialidade','prazo','comunicacao','foro','responsabilidade','outros')),
  title         TEXT NOT NULL,
  body_example  TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ─── contracts ───────────────────────────────────────────────────────────────

CREATE TABLE contracts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID NOT NULL REFERENCES companies(id),
  template_id              UUID NOT NULL REFERENCES contract_templates(id),
  status                   TEXT NOT NULL DEFAULT 'rascunho'
                            CHECK (status IN ('rascunho','aguardando_assinatura','assinado','expirado','cancelado')),
  field_values             JSONB NOT NULL DEFAULT '{}',
  clauses_snapshot         JSONB NOT NULL DEFAULT '[]',
  pricing_snapshot         JSONB NOT NULL DEFAULT '[]',
  currency_snapshot        TEXT NOT NULL,
  nome_completo            TEXT NOT NULL,
  email                    TEXT NOT NULL,
  telefone                 TEXT NOT NULL,
  data_contrato            DATE NOT NULL DEFAULT CURRENT_DATE,
  ip_address               TEXT,
  user_agent               TEXT,
  pdf_draft_path           TEXT,
  pdf_signed_path          TEXT,
  esignature_provider      TEXT NOT NULL DEFAULT 'autentique',
  esignature_document_id   TEXT,
  esignature_document_url  TEXT,
  signer_client_status     TEXT NOT NULL DEFAULT 'pendente' CHECK (signer_client_status IN ('pendente','assinado')),
  signer_company_status    TEXT NOT NULL DEFAULT 'pendente' CHECK (signer_company_status IN ('pendente','assinado')),
  webhook_payload_raw      JSONB,
  n8n_notified_at          TIMESTAMPTZ,
  sent_at                  TIMESTAMPTZ,
  signed_at                TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  cancelled_reason         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_pricing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- contract_templates: dono vê/edita os seus; qualquer autenticado vê os da galeria
CREATE POLICY "contract_templates_select_own_company" ON contract_templates FOR SELECT
  USING (company_id = public.get_current_company_id());
CREATE POLICY "contract_templates_select_gallery" ON contract_templates FOR SELECT
  USING (is_gallery_template = true);
CREATE POLICY "contract_templates_write_own_company" ON contract_templates FOR ALL
  USING (company_id = public.get_current_company_id())
  WITH CHECK (company_id = public.get_current_company_id());
-- Leitura pública (sem login) só de modelos ativos, pro formulário público:
CREATE POLICY "contract_templates_public_active" ON contract_templates FOR SELECT
  TO anon
  USING (active = true);

-- fields/clauses/pricing_items: mesma regra, via join no template
CREATE POLICY "ctf_read" ON contract_template_fields FOR SELECT
  USING (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id
                 AND (t.company_id = public.get_current_company_id() OR t.is_gallery_template = true OR t.active = true)));
CREATE POLICY "ctf_write" ON contract_template_fields FOR ALL
  USING (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id AND t.company_id = public.get_current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id AND t.company_id = public.get_current_company_id()));

CREATE POLICY "ctc_read" ON contract_template_clauses FOR SELECT
  USING (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id
                 AND (t.company_id = public.get_current_company_id() OR t.is_gallery_template = true OR t.active = true)));
CREATE POLICY "ctc_write" ON contract_template_clauses FOR ALL
  USING (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id AND t.company_id = public.get_current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id AND t.company_id = public.get_current_company_id()));

CREATE POLICY "ctp_read" ON contract_template_pricing_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id
                 AND (t.company_id = public.get_current_company_id() OR t.is_gallery_template = true OR t.active = true)));
CREATE POLICY "ctp_write" ON contract_template_pricing_items FOR ALL
  USING (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id AND t.company_id = public.get_current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM contract_templates t WHERE t.id = template_id AND t.company_id = public.get_current_company_id()));

-- clause_snippets: biblioteca global, leitura pra qualquer autenticado
CREATE POLICY "clause_snippets_read" ON clause_snippets FOR SELECT
  TO authenticated USING (true);

-- contracts: sem policy nenhuma — só service-role dentro das rotas de API, que
-- validam sessão + company_id manualmente (mesmo padrão já usado antes).

CREATE OR REPLACE TRIGGER contract_templates_updated_at
  BEFORE UPDATE ON contract_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX contracts_company_status_idx ON contracts(company_id, status);
CREATE INDEX contracts_esignature_document_id_idx ON contracts(esignature_document_id);
CREATE INDEX ctf_template_idx ON contract_template_fields(template_id);
CREATE INDEX ctc_template_idx ON contract_template_clauses(template_id);
CREATE INDEX ctp_template_idx ON contract_template_pricing_items(template_id);
CREATE INDEX contract_templates_gallery_idx ON contract_templates(is_gallery_template) WHERE is_gallery_template = true;

-- ─── Seed: galeria com os 3 modelos reais já usados pela Digital Alpha ──────

DO $$
DECLARE
  digital_alpha_id UUID;
  tpl_completo UUID;
  tpl_crm UUID;
  tpl_trafego UUID;
BEGIN
  SELECT id INTO digital_alpha_id FROM companies WHERE slug = 'digital-alpha';

  -- === Modelo 1: Tráfego Pago + CRM (Completo) ===
  INSERT INTO contract_templates (company_id, name, slug, currency, is_gallery_template)
  VALUES (digital_alpha_id, 'Tráfego Pago + CRM (Completo)', 'trafego-pago-crm-completo', 'BRL', true)
  RETURNING id INTO tpl_completo;

  INSERT INTO contract_template_fields (template_id, field_key, label, field_type, required, display_order) VALUES
    (tpl_completo, 'razao_social', 'Razão Social', 'text', true, 1),
    (tpl_completo, 'cnpj', 'CNPJ', 'cnpj', false, 2),
    (tpl_completo, 'cpf', 'CPF', 'cpf', false, 3),
    (tpl_completo, 'endereco', 'Endereço', 'text', true, 4),
    (tpl_completo, 'cidade', 'Cidade', 'text', true, 5),
    (tpl_completo, 'estado', 'Estado (UF)', 'text', true, 6),
    (tpl_completo, 'cep', 'CEP', 'cep', true, 7),
    (tpl_completo, 'nome_completo', 'Nome Completo (Representante Legal)', 'text', true, 8),
    (tpl_completo, 'email', 'E-mail', 'email', true, 9),
    (tpl_completo, 'telefone', 'Telefone', 'phone', true, 10);

  INSERT INTO contract_template_clauses (template_id, title, body, display_order) VALUES
    (tpl_completo, 'CLÁUSULA 1ª - DO OBJETO DO CONTRATO',
     '1.1. O objeto deste contrato é a prestação de serviços de marketing digital e consultoria pelo CONTRATADO ao CONTRATANTE, abrangendo os seguintes escopos:' || E'\n\n' ||
     '1.1.1. Gestão de Tráfego Pago: Criação, gerenciamento e otimização de campanhas de anúncios nas plataformas Meta Ads (Instagram/Facebook).' || E'\n\n' ||
     '1.1.2. Implementação de CRM com Automação: Configuração e implementação de sistema de CRM (Customer Relationship Management) com automações para otimizar o processo de vendas e gestão de clientes.', 1),
    (tpl_completo, 'CLÁUSULA 2ª - DAS OBRIGAÇÕES DO CONTRATADO',
     '2.1. Prestar os serviços descritos na Cláusula 1ª com diligência e profissionalismo.' || E'\n' ||
     '2.2. Cumprir com os canais e prazos de comunicação estabelecidos na Cláusula 6ª.' || E'\n' ||
     '2.3. Garantir a confidencialidade de todas as informações de negócio do CONTRATANTE.', 2),
    (tpl_completo, 'CLÁUSULA 3ª - DAS OBRIGAÇÕES DO CONTRATANTE',
     '3.1. Fornecer ao CONTRATADO todas as informações, acessos e materiais necessários para a execução dos serviços (ex: acesso às contas de anúncio, informações sobre o público e produtos).' || E'\n' ||
     '3.2. Realizar os pagamentos pontualmente, nas datas e valores acordados.' || E'\n' ||
     '3.3. Ser o único responsável pelo custeio do investimento em anúncios (verba de tráfego), a ser pago diretamente às plataformas (Google, Meta, etc.).' || E'\n' ||
     '3.4. Disponibilizar a equipe para participação e colaborar com o processo de implementação do CRM.', 3),
    (tpl_completo, 'CLÁUSULA 4ª - DO VALOR E DA FORMA DE PAGAMENTO',
     '4.1. Os valores pelos serviços descritos na Cláusula 1ª estão detalhados na tabela de valores deste contrato.' || E'\n' ||
     '4.2. Os pagamentos mensais deverão ser realizados impreterivelmente até o dia 05 (cinco) de cada mês, através do Pix.' || E'\n' ||
     '4.3. O atraso no pagamento implicará em multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês sobre o valor devido.', 4),
    (tpl_completo, 'CLÁUSULA 5ª - DO PRAZO E DA RESCISÃO',
     '5.1. O presente contrato tem vigência inicial de 3 (três) meses, a contar da data de sua assinatura. Após este período, poderá ser renovado automaticamente, caso não haja manifestação contrária de nenhuma das partes.' || E'\n' ||
     '5.2. Qualquer das partes poderá rescindir este contrato, sem qualquer ônus, mediante aviso prévio formal de 30 (trinta) dias.' || E'\n' ||
     '5.3. Caso o CONTRATANTE opte por rescindir o contrato antes do término do prazo inicial de 3 meses, os valores já pagos não serão reembolsados, servindo como compensação pelos serviços já prestados e pelo planejamento executado.', 5),
    (tpl_completo, 'CLÁUSULA 6ª - DA COMUNICAÇÃO, SUPORTE E ALINHAMENTO',
     '6.1. A comunicação oficial entre as partes será realizada através de um grupo exclusivo em aplicativo de mensagens (ex: WhatsApp), criado para esta finalidade.' || E'\n' ||
     '6.2. O CONTRATADO disponibilizará suporte e responderá às solicitações neste grupo de segunda a sexta-feira, das 08h00 às 18h00. Demandas enviadas fora deste horário serão atendidas no próximo dia útil.' || E'\n' ||
     '6.3. Serão enviados relatórios semanais de desempenho das campanhas diretamente no grupo de comunicação.' || E'\n' ||
     '6.4. Serão realizadas reuniões quinzenais de alinhamento estratégico, com data e hora a serem previamente agendadas entre as partes.', 6),
    (tpl_completo, 'CLÁUSULA 7ª - DO ACESSO ÀS PLATAFORMAS',
     '7.1. Para a execução dos serviços, o CONTRATANTE fornecerá ao CONTRATADO os dados de login e senha de suas contas de redes sociais e gerenciadores de anúncio. O CONTRATADO se compromete a utilizar esses dados estritamente para os fins acordados neste contrato, mantendo total sigilo e segurança.', 7),
    (tpl_completo, 'CLÁUSULA 8ª - DISPOSIÇÕES GERAIS',
     '8.1. Este contrato não estabelece qualquer vínculo empregatício entre as partes, tratando-se de uma relação estritamente comercial de prestação de serviços.', 8);

  INSERT INTO contract_template_pricing_items (template_id, label, amount, frequency, display_order) VALUES
    (tpl_completo, 'Taxa de Implementação (Setup)', 1000.00, 'unico', 1),
    (tpl_completo, 'Gestão de Tráfego Pago', 600.00, 'mensal', 2),
    (tpl_completo, 'Implementação de CRM com Automação', 600.00, 'mensal', 3);

  -- === Modelo 2: CRM Digital Alpha (Standalone) ===
  INSERT INTO contract_templates (company_id, name, slug, currency, is_gallery_template)
  VALUES (digital_alpha_id, 'CRM Digital Alpha (Standalone)', 'crm-standalone', 'USD', true)
  RETURNING id INTO tpl_crm;

  INSERT INTO contract_template_fields (template_id, field_key, label, field_type, required, display_order) VALUES
    (tpl_crm, 'nome_completo', 'Nome Completo', 'text', true, 1),
    (tpl_crm, 'cpf', 'CPF', 'cpf', true, 2),
    (tpl_crm, 'endereco', 'Endereço', 'text', true, 3),
    (tpl_crm, 'cidade', 'Cidade', 'text', true, 4),
    (tpl_crm, 'estado', 'Estado (UF)', 'text', true, 5),
    (tpl_crm, 'email', 'E-mail', 'email', true, 6),
    (tpl_crm, 'telefone', 'Telefone', 'phone', true, 7);

  INSERT INTO contract_template_clauses (template_id, title, body, display_order) VALUES
    (tpl_crm, '1. OBJETO DO CONTRATO',
     'Prestação de serviços de implantação, configuração, treinamento e suporte do CRM Digital Alpha, com o objetivo de estruturar e otimizar a gestão de leads e clientes do CONTRATANTE.', 1),
    (tpl_crm, '2. ESCOPO DOS SERVIÇOS',
     'O serviço inclui: implantação do CRM, criação de até 4 funis de vendas, configuração de até 5 automações básicas, integração com até 2 números de WhatsApp não oficiais (ou 1 WhatsApp oficial via API + 1 não oficial — a escolha é definida na implantação), estruturação de pipeline e etapas comerciais, treinamento completo de uso e orientação estratégica básica. Qualquer demanda fora deste escopo poderá ser cobrada à parte, mediante alinhamento prévio.', 2),
    (tpl_crm, '3. PRAZO DE IMPLANTAÇÃO',
     'O prazo para disponibilização do CRM em funcionamento inicial é de até 10 (dez) dias úteis, contados a partir do envio completo das informações necessárias pelo CONTRATANTE. Este prazo refere-se ao sistema apto para uso inicial, podendo melhorias e ajustes ocorrer ao longo do contrato.', 3),
    (tpl_crm, '4. PRAZO DO CONTRATO',
     'Duração de 3 (três) meses, podendo ser renovado mediante acordo entre as partes.', 4),
    (tpl_crm, '5. VALORES E CONDIÇÕES DE PAGAMENTO',
     'Os valores estão detalhados na tabela de valores deste contrato. Vencimento definido na ativação do sistema. Em caso de atraso: multa de 2% e juros de 1% ao mês.', 5),
    (tpl_crm, '6. TREINAMENTO',
     'O treinamento será realizado de forma online e ao vivo. No primeiro mês: até 2 horas por semana (2 encontros de 1 hora ou 1 encontro de 2 horas). A partir do segundo mês: até 1 hora por semana. As sessões deverão ser previamente agendadas; caso o CONTRATANTE não compareça, a sessão será considerada como realizada.', 6),
    (tpl_crm, '7. SUPORTE (SLA)',
     'Atendimento de segunda a sexta-feira, das 08h às 18h. Tempo de resposta: até 24h úteis. Demandas urgentes: priorizadas dentro do mesmo dia útil.', 7),
    (tpl_crm, '8. RESPONSABILIDADES',
     'Do CONTRATADO: entregar o CRM funcional conforme escopo, garantir funcionamento inicial do sistema, prestar suporte e treinamento conforme definido. Do CONTRATANTE: fornecer informações necessárias, participar dos treinamentos, utilizar o sistema conforme orientação, realizar os pagamentos.', 8),
    (tpl_crm, '9. CONFIDENCIALIDADE E DADOS',
     'Ambas as partes se comprometem a manter sigilo absoluto sobre dados, informações e estratégias envolvidas.', 9),
    (tpl_crm, '10. CANCELAMENTO',
     'O cancelamento deverá ser solicitado formalmente. Após a solicitação, o CONTRATANTE deverá efetuar o pagamento do próximo vencimento; o serviço permanecerá ativo até o final do período pago e, após esse período, o contrato será encerrado automaticamente.', 10),
    (tpl_crm, '11. ATUALIZAÇÕES DO SISTEMA',
     'Todas as melhorias, atualizações e novas funcionalidades do CRM Digital Alpha estarão incluídas durante o período contratual, sem custo adicional.', 11),
    (tpl_crm, '12. RESPONSABILIDADE SOBRE O SISTEMA',
     'O CONTRATADO garante a entrega do CRM funcional conforme escopo. Não se responsabiliza por resultados comerciais (vendas), instabilidades de terceiros (WhatsApp, Instagram, e-mail, APIs) ou uso inadequado do sistema.', 12),
    (tpl_crm, '13. DISPOSIÇÕES GERAIS',
     'Este contrato não gera vínculo empregatício entre as partes. Ambas as partes concordam com os termos deste contrato.', 13);

  INSERT INTO contract_template_pricing_items (template_id, label, amount, frequency, display_order) VALUES
    (tpl_crm, 'Implantação', 250.00, 'unico', 1),
    (tpl_crm, 'Mensalidade', 200.00, 'mensal', 2);

  -- === Modelo 3: Gestão de Tráfego Pago (Plano Mensal) ===
  INSERT INTO contract_templates (company_id, name, slug, currency, is_gallery_template)
  VALUES (digital_alpha_id, 'Gestão de Tráfego Pago (Plano Mensal)', 'trafego-pago-plano-mensal', 'BRL', true)
  RETURNING id INTO tpl_trafego;

  INSERT INTO contract_template_fields (template_id, field_key, label, field_type, required, display_order) VALUES
    (tpl_trafego, 'nome_completo', 'Nome (empresa ou pessoa)', 'text', true, 1),
    (tpl_trafego, 'cnpj', 'CNPJ', 'cnpj', false, 2),
    (tpl_trafego, 'cpf', 'CPF', 'cpf', false, 3),
    (tpl_trafego, 'endereco', 'Endereço', 'text', true, 4),
    (tpl_trafego, 'cidade', 'Cidade', 'text', true, 5),
    (tpl_trafego, 'estado', 'Estado (UF)', 'text', true, 6),
    (tpl_trafego, 'email', 'E-mail', 'email', true, 7),
    (tpl_trafego, 'telefone', 'Telefone', 'phone', true, 8);

  INSERT INTO contract_template_clauses (template_id, title, body, display_order) VALUES
    (tpl_trafego, 'CLÁUSULA 1 – OBJETO',
     'O presente contrato tem como objeto a prestação de serviços de gestão de tráfego pago, incluindo planejamento, criação, otimização e monitoramento de campanhas em plataformas digitais.', 1),
    (tpl_trafego, 'CLÁUSULA 2 – PRAZO',
     'O presente contrato possui duração de 30 (trinta) dias, iniciando-se após a confirmação do pagamento. Ao término do período, o contrato será automaticamente encerrado, salvo renovação mediante novo acordo entre as partes.', 2),
    (tpl_trafego, 'CLÁUSULA 3 – VALOR E FORMA DE PAGAMENTO',
     'Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor descrito na tabela de valores deste contrato. Formas de pagamento: Pix (à vista) ou cartão de crédito (parcelamento em até 6x, com acréscimos conforme taxas da operadora). O serviço será iniciado somente após a confirmação do pagamento.', 3),
    (tpl_trafego, 'CLÁUSULA 4 – OBRIGAÇÕES DO CONTRATADO',
     'O CONTRATADO se compromete a: realizar a gestão estratégica de tráfego pago; enviar relatórios semanais contendo investimentos realizados, desempenho das campanhas e resultados obtidos; realizar reuniões a cada 15 dias para alinhamento estratégico; criar e gerenciar campanhas com foco em geração de resultados; disponibilizar suporte por meio de grupo no WhatsApp.', 4),
    (tpl_trafego, 'CLÁUSULA 5 – COMUNICAÇÃO',
     'Será criado um grupo no WhatsApp, incluindo CONTRATADO, gestor responsável e CONTRATANTE. O grupo será o principal canal de comunicação para suporte, alinhamentos e acompanhamento das campanhas.', 5),
    (tpl_trafego, 'CLÁUSULA 6 – OBRIGAÇÕES DO CONTRATANTE',
     'O CONTRATANTE se compromete a: fornecer todas as informações necessárias para execução do serviço; realizar os pagamentos nas datas acordadas; aprovar materiais e estratégias quando solicitado; manter comunicação ativa com a equipe.', 6),
    (tpl_trafego, 'CLÁUSULA 7 – INVESTIMENTO EM TRÁFEGO',
     'Os valores investidos em anúncios (Meta Ads, Google Ads, etc.) não estão inclusos no valor deste contrato, sendo de responsabilidade exclusiva do CONTRATANTE.', 7),
    (tpl_trafego, 'CLÁUSULA 8 – RESULTADOS',
     'O CONTRATADO compromete-se com a execução estratégica e técnica do serviço, não garantindo resultados específicos, uma vez que estes dependem de fatores externos como mercado, concorrência e comportamento do público.', 8),
    (tpl_trafego, 'CLÁUSULA 9 – CANCELAMENTO',
     'Por se tratar de um plano mensal, não há reembolso após o início da execução do serviço.', 9),
    (tpl_trafego, 'CLÁUSULA 10 – DISPOSIÇÕES GERAIS',
     'Este contrato refere-se à prestação de serviços técnicos especializados, incluindo planejamento, execução e acompanhamento estratégico durante o período contratado.', 10),
    (tpl_trafego, 'CLÁUSULA 11 – FORO',
     'Fica eleito o foro da comarca de Fortaleza/CE para dirimir quaisquer dúvidas oriundas deste contrato.', 11);

  INSERT INTO contract_template_pricing_items (template_id, label, amount, frequency, display_order) VALUES
    (tpl_trafego, 'Plano Mensal de Gestão de Tráfego', 1500.00, 'mensal', 1);
END $$;

-- ─── Seed: biblioteca de cláusulas prontas (reutilizáveis em qualquer modelo) ─

INSERT INTO clause_snippets (category, title, body_example, display_order) VALUES
  ('pagamento', 'Forma de pagamento simples', 'O CONTRATANTE pagará ao CONTRATADO o valor descrito na tabela de valores deste contrato, através de Pix, até o dia 05 (cinco) de cada mês.', 1),
  ('pagamento', 'Multa por atraso', 'O atraso no pagamento implicará em multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês sobre o valor devido.', 2),
  ('rescisao', 'Rescisão com aviso prévio', 'Qualquer das partes poderá rescindir este contrato, sem qualquer ônus, mediante aviso prévio formal de 30 (trinta) dias.', 3),
  ('rescisao', 'Sem reembolso após início', 'Por se tratar de um plano com execução imediata, não há reembolso dos valores já pagos após o início da prestação do serviço.', 4),
  ('confidencialidade', 'Sigilo de informações', 'Ambas as partes se comprometem a manter sigilo absoluto sobre dados, informações e estratégias de negócio compartilhadas durante a vigência deste contrato.', 5),
  ('prazo', 'Vigência com renovação automática', 'O presente contrato tem vigência inicial de 3 (três) meses, a contar da data de sua assinatura, podendo ser renovado automaticamente caso não haja manifestação contrária de nenhuma das partes.', 6),
  ('comunicacao', 'Canal oficial via WhatsApp', 'A comunicação oficial entre as partes será realizada através de um grupo exclusivo em aplicativo de mensagens (ex: WhatsApp), criado especificamente para esta finalidade.', 7),
  ('foro', 'Eleição de foro', 'Fica eleito o foro da comarca de %%contratado_endereco%% para dirimir quaisquer dúvidas ou litígios oriundos deste contrato.', 8),
  ('responsabilidade', 'Isenção de resultados garantidos', 'O CONTRATADO compromete-se com a execução estratégica e técnica do serviço, não garantindo resultados específicos, uma vez que estes dependem de fatores externos como mercado, concorrência e comportamento do público.', 9),
  ('outros', 'Sem vínculo empregatício', 'Este contrato não estabelece qualquer vínculo empregatício entre as partes, tratando-se de uma relação estritamente comercial de prestação de serviços.', 10);
