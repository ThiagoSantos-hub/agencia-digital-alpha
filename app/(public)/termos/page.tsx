import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'

export const metadata = {
  title: 'Termos de Uso | Digital Alpha',
}

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-background text-text-main">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <BackButton />

        <h1 className="text-3xl font-bold text-text-main mt-6 mb-2">Termos de Uso</h1>
        <p className="text-sm text-text-muted mb-10">Última atualização: 31 de julho de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-text-main [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-main [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-3 [&_li]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold">

          <section>
            <p>
              Estes Termos de Uso regem o uso da plataforma <strong>Digital Alpha</strong>, um sistema de gestão pra
              agências de marketing, operado por Thiago Santos (&quot;nós&quot;). Ao criar uma conta, você concorda com estes termos.
              Se você está criando uma conta em nome de uma agência, você declara ter autoridade pra isso, e &quot;você&quot;
              se refere tanto a você quanto à agência.
            </p>
          </section>

          <section>
            <h2>1. O que é o serviço</h2>
            <p>
              A Digital Alpha é um sistema (SaaS) que ajuda agências de marketing a gerenciar clientes, campanhas de
              tráfego pago, relatórios, alertas, financeiro, contratos, equipe e atendimento com IA. O sistema
              funciona conectando-se a serviços de terceiros (Meta Ads, Google, WhatsApp) por conta e risco de cada
              usuário, não somos donos nem controlamos esses serviços de terceiro.
            </p>
          </section>

          <section>
            <h2>2. Cadastro e conta</h2>
            <ul>
              <li>Você é responsável por manter sua senha em sigilo e por tudo que acontecer na sua conta.</li>
              <li>As informações que você cadastra (nome, e-mail, telefone, perfil do Facebook) precisam ser
                verdadeiras. Cadastros com dado falso, ou usados pra burlar limites do plano Gratuito (ex: criar
                várias contas pra renovar limite mensal), podem ser suspensos sem aviso prévio.</li>
              <li>Colaboradores cadastrados pela agência têm acesso conforme as permissões que a própria agência define.</li>
            </ul>
          </section>

          <section>
            <h2>3. Planos e pagamento</h2>
            <ul>
              <li>O plano <strong>Gratuito</strong> não exige cartão de crédito e tem limites mensais de uso (relatórios e alertas).</li>
              <li>Planos pagos são cobrados via <strong>cartão de crédito</strong> (assinatura mensal recorrente, renovada
                automaticamente até cancelamento) ou <strong>Pix</strong> (pagamento avulso, libera 30 dias de acesso,
                não renova sozinho, pra continuar é preciso pagar de novo).</li>
              <li>Pagamentos são processados pelo Stripe. Não temos acesso ao número do seu cartão.</li>
              <li>Cancelamento do cartão pode ser feito a qualquer momento em Assinatura, dentro do sistema; o acesso
                continua até o fim do período já pago, sem reembolso proporcional do período em curso, salvo exigência legal.</li>
              <li>Atraso ou falha de pagamento pode suspender o acesso à conta até a regularização.</li>
            </ul>
          </section>

          <section>
            <h2>4. Uso aceitável</h2>
            <p>Ao usar o sistema, você concorda em não:</p>
            <ul>
              <li>Usar o sistema pra enviar spam, conteúdo ilegal, ou mensagens não solicitadas via WhatsApp;</li>
              <li>Tentar acessar dado de outra empresa cliente, ou burlar os limites de acesso da sua própria conta;</li>
              <li>Fazer engenharia reversa, copiar ou revender o sistema;</li>
              <li>Sobrecarregar o sistema de propósito (ex: automatizar chamadas em massa às rotas do sistema).</li>
            </ul>
          </section>

          <section>
            <h2>5. Integrações de terceiros</h2>
            <p>
              Funções como Meta Ads, Gmail, Google Agenda, WhatsApp e IA (OpenAI/ElevenLabs) dependem de serviços de
              terceiro fora do nosso controle. Instabilidade, mudança de API, ou suspensão dessas contas por parte do
              próprio provedor pode afetar essas funções, e não somos responsáveis por indisponibilidade causada por
              terceiros. Quando o recurso de IA exige chave própria do usuário, o custo de uso dessa API é do usuário,
              não da Digital Alpha.
            </p>
          </section>

          <section>
            <h2>6. Propriedade intelectual</h2>
            <p>
              O sistema, sua marca e seu código pertencem à Digital Alpha. Os dados que você cadastra (seus clientes,
              contratos, campanhas) pertencem a você, nós só os processamos pra fornecer o serviço.
            </p>
          </section>

          <section>
            <h2>7. Limitação de responsabilidade</h2>
            <p>
              O sistema é fornecido &quot;como está&quot;. Fazemos o possível pra manter disponibilidade e corrigir problemas
              rapidamente, mas não garantimos operação livre de falhas. Na medida permitida por lei, nossa
              responsabilidade por qualquer dano se limita ao valor pago pelo plano contratado nos últimos 3 meses.
            </p>
          </section>

          <section>
            <h2>8. Cancelamento e encerramento</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar contas que violem estes
              termos, mediante aviso quando possível. Dados são tratados conforme nossa{' '}
              <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link> mesmo após o encerramento.
            </p>
          </section>

          <section>
            <h2>9. Alterações nestes termos</h2>
            <p>
              Podemos atualizar estes termos conforme o sistema evolui. Mudanças relevantes serão avisadas dentro do
              sistema. Uso continuado após a mudança significa aceite dos novos termos.
            </p>
          </section>

          <section>
            <h2>10. Lei aplicável</h2>
            <p>
              Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca de
              domicílio do responsável pela Digital Alpha, salvo disposição legal em contrário.
            </p>
          </section>

          <section>
            <h2>11. Contato</h2>
            <p>
              Dúvidas sobre estes termos: <strong>thiagogestorbm@gmail.com</strong> ou WhatsApp <strong>(85) 99230-7273</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
