import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface ContractTemplateCompletoProps {
  razaoSocial: string
  cnpj: string
  cpf: string
  endereco: string
  cidadeEstado: string
  cep: string
  nomeCompleto: string
  email: string
  telefone: string
  dataDoDia: string
  currency: 'BRL' | 'USD'
  setupFee: number
  monthlyFee: number
  monthlyTrafego: number
  monthlyCrm: number
}

const CONTRATADO = {
  nomeFantasia: 'Digital Alpha',
  nomeCompleto: 'Thiago dos Santos Pereira',
  cpf: '030.123.533-30',
  endereco: 'Rua Olegário Memória, 1362, Bloco 14, Sala 003 - Bairro Sapiranga, Fortaleza-Ceará, CEP: 60833-045',
  email: 'thiagogestorbm@gmail.com',
  telefone: '85 9 9230-7273',
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.4 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6 },
  label: { fontFamily: 'Helvetica-Bold' },
  row: { marginBottom: 2 },
  paragraph: { marginBottom: 6 },
  clauseTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, marginTop: 10, marginBottom: 4 },
  signatureBlock: { marginTop: 40 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1a1a1a', width: 260, marginTop: 30, paddingTop: 4 },
})

function fmtMoney(value: number, currency: 'BRL' | 'USD'): string {
  return currency === 'USD'
    ? `US$ ${value.toFixed(2)}`
    : `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function ContractTemplateCompleto(props: ContractTemplateCompletoProps) {
  const {
    razaoSocial, cnpj, cpf, endereco, cidadeEstado, cep,
    nomeCompleto, email, telefone, dataDoDia,
    currency, setupFee, monthlyFee, monthlyTrafego, monthlyCrm,
  } = props

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRÁFEGO PAGO, CRM E AUTOMAÇÃO</Text>

        <Text style={styles.sectionTitle}>CONTRATANTE:</Text>
        <Text style={styles.row}><Text style={styles.label}>Razão Social: </Text>{razaoSocial}</Text>
        {cnpj ? <Text style={styles.row}><Text style={styles.label}>CNPJ: </Text>{cnpj}</Text> : null}
        {cpf ? <Text style={styles.row}><Text style={styles.label}>CPF: </Text>{cpf}</Text> : null}
        <Text style={styles.row}><Text style={styles.label}>Endereço: </Text>{endereco}, {cidadeEstado} - CEP: {cep}</Text>
        <Text style={styles.row}><Text style={styles.label}>Representante Legal: </Text>{nomeCompleto}</Text>
        <Text style={styles.row}><Text style={styles.label}>E-mail: </Text>{email}</Text>
        <Text style={styles.row}><Text style={styles.label}>Telefone: </Text>{telefone}</Text>

        <Text style={styles.sectionTitle}>CONTRATADO:</Text>
        <Text style={styles.row}><Text style={styles.label}>Nome Fantasia: </Text>{CONTRATADO.nomeFantasia}</Text>
        <Text style={styles.row}><Text style={styles.label}>Nome Completo: </Text>{CONTRATADO.nomeCompleto}</Text>
        <Text style={styles.row}><Text style={styles.label}>CPF: </Text>{CONTRATADO.cpf}</Text>
        <Text style={styles.row}><Text style={styles.label}>Endereço: </Text>{CONTRATADO.endereco}</Text>
        <Text style={styles.row}><Text style={styles.label}>E-mail: </Text>{CONTRATADO.email}</Text>
        <Text style={styles.row}><Text style={styles.label}>Telefone: </Text>{CONTRATADO.telefone}</Text>

        <Text style={styles.paragraph}>
          As partes acima qualificadas celebram o presente Contrato de Prestação de Serviços, regido pelas cláusulas e condições a seguir.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 1ª - DO OBJETO DO CONTRATO</Text>
        <Text style={styles.paragraph}>
          1.1. O objeto deste contrato é a prestação de serviços de marketing digital e consultoria pelo CONTRATADO ao CONTRATANTE, abrangendo os seguintes escopos:
        </Text>
        <Text style={styles.paragraph}>
          1.1.1. Gestão de Tráfego Pago: Criação, gerenciamento e otimização de campanhas de anúncios nas plataformas Meta Ads (Instagram/Facebook).
        </Text>
        <Text style={styles.paragraph}>
          1.1.2. Implementação de CRM com Automação: Configuração e implementação de sistema de CRM (Customer Relationship Management) com automações para otimizar o processo de vendas e gestão de clientes.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 2ª - DAS OBRIGAÇÕES DO CONTRATADO</Text>
        <Text style={styles.paragraph}>2.1. Prestar os serviços descritos na Cláusula 1ª com diligência e profissionalismo.</Text>
        <Text style={styles.paragraph}>2.2. Cumprir com os canais e prazos de comunicação estabelecidos na Cláusula 6ª.</Text>
        <Text style={styles.paragraph}>2.3. Garantir a confidencialidade de todas as informações de negócio do CONTRATANTE.</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 3ª - DAS OBRIGAÇÕES DO CONTRATANTE</Text>
        <Text style={styles.paragraph}>
          3.1. Fornecer ao CONTRATADO todas as informações, acessos e materiais necessários para a execução dos serviços (ex: acesso às contas de anúncio, informações sobre o público e produtos).
        </Text>
        <Text style={styles.paragraph}>3.2. Realizar os pagamentos pontualmente, nas datas e valores acordados.</Text>
        <Text style={styles.paragraph}>
          3.3. Ser o único responsável pelo custeio do investimento em anúncios (verba de tráfego), a ser pago diretamente às plataformas (Google, Meta, etc.).
        </Text>
        <Text style={styles.paragraph}>3.4. Disponibilizar a equipe para participação e colaborar com o processo de implementação do CRM.</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 4ª - DO VALOR E DA FORMA DE PAGAMENTO</Text>
        <Text style={styles.paragraph}>4.1. Pelos serviços descritos na Cláusula 1ª, o CONTRATANTE pagará ao CONTRATADO:</Text>
        <Text style={styles.paragraph}>
          a) Uma taxa única de implementação (setup fee) no valor de {fmtMoney(setupFee, currency)} pela Implementação de CRM com Automação, a ser paga no ato da assinatura deste contrato.
        </Text>
        <Text style={styles.paragraph}>
          b) O valor mensal de {fmtMoney(monthlyFee, currency)}, sendo {fmtMoney(monthlyTrafego, currency)} para Gestão de Tráfego Pago e {fmtMoney(monthlyCrm, currency)} para Implementação de CRM com Automação.
        </Text>
        <Text style={styles.paragraph}>4.2. Os pagamentos mensais deverão ser realizados impreterivelmente até o dia 05 (cinco) de cada mês, através do Pix.</Text>
        <Text style={styles.paragraph}>4.3. O atraso no pagamento implicará em multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês sobre o valor devido.</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 5ª - DO PRAZO E DA RESCISÃO</Text>
        <Text style={styles.paragraph}>
          5.1. O presente contrato tem vigência inicial de 3 (três) meses, a contar da data de sua assinatura. Após este período, poderá ser renovado automaticamente, caso não haja manifestação contrária de nenhuma das partes.
        </Text>
        <Text style={styles.paragraph}>5.2. Qualquer das partes poderá rescindir este contrato, sem qualquer ônus, mediante aviso prévio formal de 30 (trinta) dias.</Text>
        <Text style={styles.paragraph}>
          5.3. Caso o CONTRATANTE opte por rescindir o contrato antes do término do prazo inicial de 3 meses, os valores já pagos não serão reembolsados, servindo como compensação pelos serviços já prestados e pelo planejamento executado.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 6ª - DA COMUNICAÇÃO, SUPORTE E ALINHAMENTO</Text>
        <Text style={styles.paragraph}>
          6.1. A comunicação oficial entre as partes será realizada através de um grupo exclusivo em aplicativo de mensagens (ex: WhatsApp), criado para esta finalidade.
        </Text>
        <Text style={styles.paragraph}>
          6.2. O CONTRATADO disponibilizará suporte e responderá às solicitações neste grupo de segunda a sexta-feira, das 08h00 às 18h00. Demandas enviadas fora deste horário serão atendidas no próximo dia útil.
        </Text>
        <Text style={styles.paragraph}>6.3. Serão enviados relatórios semanais de desempenho das campanhas diretamente no grupo de comunicação.</Text>
        <Text style={styles.paragraph}>
          6.4. Serão realizadas reuniões quinzenais de alinhamento estratégico, com data e hora a serem previamente agendadas entre as partes.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 7ª - DO ACESSO ÀS PLATAFORMAS</Text>
        <Text style={styles.paragraph}>
          7.1 Para a execução dos serviços, o CONTRATANTE fornecerá ao CONTRATADO os dados de login e senha de suas contas de redes sociais e gerenciadores de anúncio. O CONTRATADO se compromete a utilizar esses dados estritamente para os fins acordados neste contrato, mantendo total sigilo e segurança. O CONTRATANTE está ciente de que este acesso é necessário para a configuração inicial e gestão das campanhas.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 8ª - DISPOSIÇÕES GERAIS</Text>
        <Text style={styles.paragraph}>
          8.1. Este contrato não estabelece qualquer vínculo empregatício entre as partes, tratando-se de uma relação estritamente comercial de prestação de serviços.
        </Text>

        <Text style={{ marginTop: 20 }}>Fortaleza, {dataDoDia}.</Text>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <Text>{nomeCompleto}</Text>
            <Text>CONTRATANTE</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>{CONTRATADO.nomeCompleto}</Text>
            <Text>CONTRATADO</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
