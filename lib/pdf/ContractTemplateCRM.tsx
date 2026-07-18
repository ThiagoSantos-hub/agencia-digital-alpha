import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface ContractTemplateCRMProps {
  cpf: string
  endereco: string
  cidadeEstado: string
  nomeCompleto: string
  dataDoDia: string
  currency: 'BRL' | 'USD'
  setupFee: number
  monthlyFee: number
  funisMax: number
  automacoesMax: number
  prazoImplantacaoDias: number
  prazoContratoMeses: number
  treinamentoH1: number
  treinamentoH2: number
}

const CONTRATADO = {
  nomeCompleto: 'Thiago dos Santos Pereira',
  cpf: '030.123.533-30',
  endereco: 'Rua Olegário Memória, 1362, Bloco 14, Sala 003 - Sapiranga, Fortaleza/CE',
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.4 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6 },
  label: { fontFamily: 'Helvetica-Bold' },
  row: { marginBottom: 2 },
  paragraph: { marginBottom: 6 },
  bullet: { marginBottom: 3, marginLeft: 10 },
  clauseTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, marginTop: 10, marginBottom: 4 },
  signatureBlock: { marginTop: 40 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1a1a1a', width: 260, marginTop: 30, paddingTop: 4 },
})

function fmtMoney(value: number, currency: 'BRL' | 'USD'): string {
  return currency === 'USD'
    ? `US$ ${value.toFixed(2)}`
    : `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function ContractTemplateCRM(props: ContractTemplateCRMProps) {
  const {
    cpf, endereco, cidadeEstado, nomeCompleto, dataDoDia,
    currency, setupFee, monthlyFee, funisMax, automacoesMax,
    prazoImplantacaoDias, prazoContratoMeses, treinamentoH1, treinamentoH2,
  } = props

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS – CRM DIGITAL ALPHA</Text>
        <Text style={styles.row}><Text style={styles.label}>Data: </Text>{dataDoDia}</Text>

        <Text style={styles.sectionTitle}>CONTRATADO</Text>
        <Text style={styles.row}>{CONTRATADO.nomeCompleto}</Text>
        <Text style={styles.row}><Text style={styles.label}>CPF: </Text>{CONTRATADO.cpf}</Text>
        <Text style={styles.row}><Text style={styles.label}>Endereço: </Text>{CONTRATADO.endereco}</Text>

        <Text style={styles.sectionTitle}>CONTRATANTE</Text>
        <Text style={styles.row}>{nomeCompleto}</Text>
        <Text style={styles.row}><Text style={styles.label}>CPF: </Text>{cpf}</Text>
        <Text style={styles.row}><Text style={styles.label}>Endereço: </Text>{endereco}, {cidadeEstado}</Text>

        <Text style={styles.clauseTitle}>1. OBJETO DO CONTRATO</Text>
        <Text style={styles.paragraph}>
          Prestação de serviços de implantação, configuração, treinamento e suporte do CRM Digital Alpha, com o objetivo de estruturar e otimizar a gestão de leads e clientes do CONTRATANTE.
        </Text>

        <Text style={styles.clauseTitle}>2. ESCOPO DOS SERVIÇOS</Text>
        <Text style={styles.paragraph}>O serviço inclui:</Text>
        <Text style={styles.bullet}>• Implantação do CRM</Text>
        <Text style={styles.bullet}>• Criação de até {funisMax} funis de vendas</Text>
        <Text style={styles.bullet}>• Configuração de até {automacoesMax} automações básicas</Text>
        <Text style={styles.paragraph}>Integrações:</Text>
        <Text style={styles.bullet}>• Possibilidade de até 2 números de WhatsApp não oficiais, ou 1 WhatsApp oficial (API) + 1 WhatsApp não oficial</Text>
        <Text style={styles.paragraph}>
          - A escolha do modelo de integração será definida no momento da implantação, conforme necessidade e viabilidade técnica.
        </Text>
        <Text style={styles.bullet}>• Estruturação de pipeline e etapas comerciais</Text>
        <Text style={styles.bullet}>• Treinamento completo de uso</Text>
        <Text style={styles.bullet}>• Orientação estratégica básica</Text>
        <Text style={styles.paragraph}>- Qualquer demanda fora deste escopo poderá ser cobrada à parte, mediante alinhamento prévio.</Text>

        <Text style={styles.clauseTitle}>3. PRAZO DE IMPLANTAÇÃO (INÍCIO DE USO)</Text>
        <Text style={styles.paragraph}>
          O prazo para disponibilização do CRM em funcionamento inicial é de até {prazoImplantacaoDias} dias úteis, contados a partir do envio completo das informações necessárias pelo CONTRATANTE.
        </Text>
        <Text style={styles.paragraph}>
          Este prazo refere-se ao sistema apto para uso inicial, podendo melhorias e ajustes ocorrer ao longo do contrato.
        </Text>

        <Text style={styles.clauseTitle}>4. PRAZO DO CONTRATO</Text>
        <Text style={styles.paragraph}>Duração de {prazoContratoMeses} {prazoContratoMeses === 1 ? 'mês' : 'meses'}, podendo ser renovado mediante acordo entre as partes.</Text>

        <Text style={styles.clauseTitle}>5. VALORES E CONDIÇÕES DE PAGAMENTO</Text>
        <Text style={styles.bullet}>• Implantação: {fmtMoney(setupFee, currency)} (pagamento único)</Text>
        <Text style={styles.bullet}>• Mensalidade: {fmtMoney(monthlyFee, currency)}/mês</Text>
        <Text style={styles.paragraph}>- Vencimento definido na ativação do sistema.</Text>
        <Text style={styles.paragraph}>- Em caso de atraso: multa de 2% e juros de 1% ao mês.</Text>

        <Text style={styles.clauseTitle}>6. TREINAMENTO</Text>
        <Text style={styles.paragraph}>O treinamento será realizado de forma online e ao vivo, conforme abaixo:</Text>
        <Text style={styles.bullet}>• Primeiro mês: até {treinamentoH1} horas por semana (podendo ser divididas em 2 encontros de 1 hora ou 1 encontro de {treinamentoH1} horas)</Text>
        <Text style={styles.bullet}>• A partir do segundo mês: até {treinamentoH2} hora(s) por semana</Text>
        <Text style={styles.paragraph}>
          - As sessões deverão ser previamente agendadas. Caso o CONTRATANTE não compareça, a sessão será considerada como realizada.
        </Text>

        <Text style={styles.clauseTitle}>7. SUPORTE (SLA)</Text>
        <Text style={styles.bullet}>• Atendimento de segunda a sexta-feira, das 08h às 18h</Text>
        <Text style={styles.paragraph}>- Tempo de resposta: até 24h úteis. Demandas urgentes: priorizadas dentro do mesmo dia útil.</Text>

        <Text style={styles.clauseTitle}>8. RESPONSABILIDADES</Text>
        <Text style={styles.paragraph}><Text style={styles.label}>Do CONTRATADO: </Text>Entregar o CRM funcional conforme escopo; garantir funcionamento inicial do sistema; prestar suporte e treinamento conforme definido.</Text>
        <Text style={styles.paragraph}><Text style={styles.label}>Do CONTRATANTE: </Text>Fornecer informações necessárias; participar dos treinamentos; utilizar o sistema conforme orientação; realizar os pagamentos.</Text>

        <Text style={styles.clauseTitle}>9. CONFIDENCIALIDADE E DADOS</Text>
        <Text style={styles.paragraph}>Ambas as partes se comprometem a manter sigilo absoluto sobre dados, informações e estratégias envolvidas.</Text>

        <Text style={styles.clauseTitle}>10. CANCELAMENTO</Text>
        <Text style={styles.paragraph}>
          O cancelamento deverá ser solicitado formalmente. Após a solicitação, o CONTRATANTE deverá efetuar o pagamento do próximo vencimento, o serviço permanecerá ativo até o final do período pago e, após esse período, o contrato será encerrado automaticamente.
        </Text>

        <Text style={styles.clauseTitle}>11. ATUALIZAÇÕES DO SISTEMA</Text>
        <Text style={styles.paragraph}>
          Todas as melhorias, atualizações e novas funcionalidades do CRM Digital Alpha estarão incluídas durante o período contratual, sem custo adicional.
        </Text>

        <Text style={styles.clauseTitle}>12. RESPONSABILIDADE SOBRE O SISTEMA</Text>
        <Text style={styles.paragraph}>O CONTRATADO garante a entrega do CRM funcional conforme escopo. Não se responsabiliza por:</Text>
        <Text style={styles.bullet}>• Resultados comerciais (Vendas)</Text>
        <Text style={styles.bullet}>• Instabilidades de terceiros (WhatsApp, Instagram, e-mail, APIs)</Text>
        <Text style={styles.bullet}>• Uso inadequado do sistema</Text>

        <Text style={styles.clauseTitle}>13. DISPOSIÇÕES GERAIS</Text>
        <Text style={styles.paragraph}>
          Este contrato não gera vínculo empregatício entre as partes. Ambas as partes concordam com os termos deste contrato.
        </Text>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <Text>{CONTRATADO.nomeCompleto}</Text>
            <Text>Assinatura do Contratado</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>{nomeCompleto}</Text>
            <Text>Assinatura do Contratante</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
