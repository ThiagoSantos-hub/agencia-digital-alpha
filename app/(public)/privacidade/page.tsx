import { BackButton } from '@/components/ui/BackButton'

export const metadata = {
  title: 'Política de Privacidade | Digital Alpha',
}

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-text-main">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <BackButton />

        <h1 className="text-3xl font-bold text-text-main mt-6 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-text-muted mb-10">Última atualização: 31 de julho de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-text-main [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-main [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-3 [&_li]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold">

          <section>
            <p>
              Esta Política de Privacidade explica como a plataforma <strong>Digital Alpha</strong> (&quot;sistema&quot;, &quot;nós&quot;) coleta, usa,
              armazena e compartilha dados pessoais de quem usa o sistema: donos e gestores de agências de marketing
              (&quot;empresa cliente&quot;), colaboradores dessas agências, e os clientes finais que essas agências cadastram
              dentro do sistema.
            </p>
            <p>
              A Digital Alpha é operada por <strong>Thiago Santos</strong>, pessoa física, responsável pelo tratamento dos
              dados descritos aqui.
            </p>
          </section>

          <section>
            <h2>1. Quais dados coletamos</h2>
            <p><strong>Do administrador/gestor da empresa cliente, no cadastro:</strong></p>
            <ul>
              <li>Nome, e-mail, telefone</li>
              <li>Perfil do Facebook informado (nome de usuário ou link)</li>
              <li>Dados de pagamento (processados diretamente pelo Stripe, não guardamos número de cartão)</li>
            </ul>
            <p><strong>Sobre os clientes cadastrados pela agência dentro do sistema:</strong></p>
            <ul>
              <li>Nome, empresa, e-mail, telefone</li>
              <li>Mensalidade, dia de pagamento, status de pagamento (em dia, atrasado)</li>
              <li>Dados de contrato: CPF e endereço de quem assina, quando a agência usa o módulo de Contratos</li>
            </ul>
            <p><strong>Sobre colaboradores cadastrados pela agência:</strong></p>
            <ul>
              <li>Nome, e-mail, cargo, permissões de acesso, e (se a agência preencher) salário</li>
            </ul>
            <p><strong>Gerados pelo uso do sistema:</strong></p>
            <ul>
              <li>Conteúdo de relatórios e alertas enviados por WhatsApp</li>
              <li>Tokens de acesso às contas conectadas (Meta Ads, Google/Gmail, Google Agenda), usados só pra buscar
                os dados necessários às funções conectadas, nunca vendidos ou usados fora do sistema</li>
              <li>Transcrições de conversas com a Alpha AI (texto e voz), quando o usuário usa esse recurso</li>
              <li>Cookies de sessão, necessários pro login funcionar</li>
            </ul>
          </section>

          <section>
            <h2>2. Para que usamos cada dado</h2>
            <ul>
              <li><strong>Criar e manter sua conta</strong>, dar acesso ao sistema conforme o plano contratado.</li>
              <li><strong>Processar pagamentos</strong> (cartão recorrente ou Pix avulso), via Stripe.</li>
              <li><strong>Enviar relatórios e alertas automáticos</strong> por WhatsApp, conforme configurado pela agência.</li>
              <li><strong>Prevenir abuso do plano Gratuito</strong>: o perfil do Facebook informado no cadastro é comparado
                com o de outros cadastros pra impedir que a mesma pessoa crie múltiplas contas gratuitas com e-mails
                diferentes só pra renovar os limites mensais de uso. Esse é um uso adicional do mesmo dado que você já
                informa no cadastro, não uma coleta escondida.</li>
              <li><strong>Suporte e melhoria do sistema</strong>: entender uso, corrigir problemas, responder dúvidas.</li>
              <li><strong>Cumprir obrigação legal ou contratual</strong>, quando aplicável (ex: guarda de contrato assinado).</li>
            </ul>
          </section>

          <section>
            <h2>3. Com quem compartilhamos dados</h2>
            <p>
              Não vendemos dado pessoal. Compartilhamos com prestadores de serviço que processam dado em nosso nome,
              cada um só recebendo o necessário pra sua função:
            </p>
            <ul>
              <li><strong>Stripe</strong> (pagamentos), Estados Unidos</li>
              <li><strong>Supabase</strong> (banco de dados e autenticação), infraestrutura internacional</li>
              <li><strong>Vercel</strong> (hospedagem do sistema), Estados Unidos</li>
              <li><strong>Google</strong> (integração de Gmail/Agenda, quando você conecta sua conta), Estados Unidos</li>
              <li><strong>Meta</strong> (integração de Meta Ads, quando você conecta sua conta), Estados Unidos</li>
              <li><strong>OpenAI e/ou ElevenLabs</strong> (recursos de IA por texto/voz, quando o usuário conecta sua
                própria chave), Estados Unidos</li>
              <li>Provedor de envio de WhatsApp (Evolution API) e de e-mail transacional (Brevo)</li>
              <li><strong>Autentique/Assinafy</strong> (assinatura eletrônica de contratos), quando a agência usa esse módulo</li>
            </ul>
            <p>
              Alguns desses prestadores ficam fora do Brasil, o que envolve transferência internacional de dado, feita
              com base em cláusulas contratuais e nas garantias de proteção de dado exigidas pela LGPD.
            </p>
          </section>

          <section>
            <h2>4. Por quanto tempo guardamos os dados</h2>
            <p>
              Guardamos os dados enquanto sua conta estiver ativa. Se você cancelar ou sua empresa for desativada,
              mantemos os dados por um período razoável (até 12 meses) pra questões contábeis, fiscais e de segurança
              jurídica, e depois excluímos ou anonimizamos, salvo obrigação legal de guarda por prazo maior (ex: dados
              fiscais e contratos assinados).
            </p>
          </section>

          <section>
            <h2>5. Seus direitos</h2>
            <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode solicitar a qualquer momento:</p>
            <ul>
              <li>Confirmação de que tratamos seus dados, e acesso a eles</li>
              <li>Correção de dado incompleto, inexato ou desatualizado</li>
              <li>Anonimização, bloqueio ou eliminação de dado desnecessário ou tratado em desconformidade com a lei</li>
              <li>Portabilidade dos dados</li>
              <li>Eliminação dos dados tratados com seu consentimento</li>
              <li>Informação sobre com quem compartilhamos seus dados</li>
              <li>Revogação do consentimento, quando o tratamento se basear nele</li>
            </ul>
            <p>Pra exercer qualquer um desses direitos, entre em contato pelo canal abaixo.</p>
          </section>

          <section>
            <h2>6. Segurança</h2>
            <p>
              Usamos controle de acesso por empresa e por perfil (isolamento entre as agências clientes, e entre
              colaboradores dentro da mesma agência), conexão criptografada (HTTPS), e limite de tentativas em rotas
              públicas pra reduzir abuso automatizado. Nenhum sistema é 100% imune a incidentes; se algo relevante
              acontecer, avisaremos conforme exigido por lei.
            </p>
          </section>

          <section>
            <h2>7. Cookies</h2>
            <p>
              Usamos cookies estritamente necessários pra manter você logado (sessão de autenticação). Não usamos
              cookies de rastreamento publicitário próprios.
            </p>
          </section>

          <section>
            <h2>8. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política conforme o sistema evolui. A data no topo da página sempre mostra a
              versão mais recente.
            </p>
          </section>

          <section>
            <h2>9. Contato</h2>
            <p>
              Dúvidas, solicitações sobre seus dados, ou qualquer questão de privacidade: <strong>thiagogestorbm@gmail.com</strong> ou
              WhatsApp <strong>(85) 99230-7273</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
