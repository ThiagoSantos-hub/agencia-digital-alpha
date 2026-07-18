import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface ContractTemplateTrafegoProps {
  nomeCompleto: string
  cnpj: string
  cpf: string
  endereco: string
  cidadeEstado: string
  dataDoDia: string
  currency: 'BRL' | 'USD'
  valorPlano: number
  prazoDias: number
  parcelamentoMaxCartao: number
}

const CONTRATADO = {
  nomeCompleto: 'Thiago Santos',
  cpf: '030.123.533-30',
  endereco: 'Rua Olegário Memória, 1362, Bloco 14, Sala 003 - Bairro Sapiranga, Fortaleza-Ceará, CEP: 60833-045',
}

const FORO = 'Fortaleza/CE'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.4 },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 16 },
  label: { fontFamily: 'Helvetica-Bold' },
  row: { marginBottom: 4 },
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

export function ContractTemplateTrafego(props: ContractTemplateTrafegoProps) {
  const {
    nomeCompleto, cnpj, cpf, endereco, cidadeEstado, dataDoDia,
    currency, valorPlano, prazoDias, parcelamentoMaxCartao,
  } = props

  const documentoContratante = cnpj || cpf

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE TRÁFEGO PAGO{'\n'}(PLANO MENSAL)</Text>

        <Text style={styles.row}>
          <Text style={styles.label}>CONTRATANTE: </Text>
          {nomeCompleto}, inscrito no CPF/CNPJ sob nº {documentoContratante}, com sede/endereço em {endereco}, {cidadeEstado}.
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>CONTRATADO: </Text>
          {CONTRATADO.nomeCompleto}, inscrito no CPF sob nº {CONTRATADO.cpf}, com sede/endereço em {CONTRATADO.endereco}.
        </Text>

        <Text style={styles.paragraph}>
          As partes acima identificadas têm entre si justo e contratado o presente contrato de prestação de serviços, que se regerá pelas cláusulas seguintes:
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 1 – OBJETO</Text>
        <Text style={styles.paragraph}>
          O presente contrato tem como objeto a prestação de serviços de gestão de tráfego pago, incluindo planejamento, criação, otimização e monitoramento de campanhas em plataformas digitais.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 2 – PRAZO</Text>
        <Text style={styles.paragraph}>
          O presente contrato possui duração de {prazoDias} dias, iniciando-se após a confirmação do pagamento.
        </Text>
        <Text style={styles.paragraph}>
          Ao término do período, o contrato será automaticamente encerrado, salvo renovação mediante novo acordo entre as partes.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 3 – VALOR E FORMA DE PAGAMENTO</Text>
        <Text style={styles.paragraph}>
          Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor de {fmtMoney(valorPlano, currency)}.
        </Text>
        <Text style={styles.paragraph}>Formas de pagamento:</Text>
        <Text style={styles.bullet}>• Pix: pagamento à vista (valor integral)</Text>
        <Text style={styles.bullet}>• Cartão de crédito: parcelamento em até {parcelamentoMaxCartao}x, com acréscimos conforme taxas da operadora</Text>
        <Text style={styles.paragraph}>Parágrafo único: O serviço será iniciado somente após a confirmação do pagamento.</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 4 – OBRIGAÇÕES DO CONTRATADO</Text>
        <Text style={styles.paragraph}>O CONTRATADO se compromete a:</Text>
        <Text style={styles.bullet}>• Realizar a gestão estratégica de tráfego pago</Text>
        <Text style={styles.bullet}>• Enviar relatórios semanais contendo investimentos realizados, desempenho das campanhas e resultados obtidos conforme dados das plataformas</Text>
        <Text style={styles.bullet}>• Realizar reuniões a cada 15 dias para alinhamento estratégico</Text>
        <Text style={styles.bullet}>• Criar e gerenciar campanhas com foco em geração de resultados</Text>
        <Text style={styles.bullet}>• Disponibilizar suporte por meio de grupo no WhatsApp</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 5 – COMUNICAÇÃO</Text>
        <Text style={styles.paragraph}>Será criado um grupo no WhatsApp, incluindo: CONTRATADO, Gestor responsável e CONTRATANTE.</Text>
        <Text style={styles.paragraph}>O grupo será o principal canal de comunicação para suporte, alinhamentos e acompanhamento das campanhas.</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 6 – OBRIGAÇÕES DO CONTRATANTE</Text>
        <Text style={styles.paragraph}>O CONTRATANTE se compromete a:</Text>
        <Text style={styles.bullet}>• Fornecer todas as informações necessárias para execução do serviço</Text>
        <Text style={styles.bullet}>• Realizar os pagamentos nas datas acordadas</Text>
        <Text style={styles.bullet}>• Aprovar materiais e estratégias quando solicitado</Text>
        <Text style={styles.bullet}>• Manter comunicação ativa com a equipe</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 7 – INVESTIMENTO EM TRÁFEGO</Text>
        <Text style={styles.paragraph}>
          Os valores investidos em anúncios (Meta Ads, Google Ads, etc.) não estão inclusos no valor deste contrato, sendo de responsabilidade exclusiva do CONTRATANTE.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 8 – RESULTADOS</Text>
        <Text style={styles.paragraph}>
          O CONTRATADO compromete-se com a execução estratégica e técnica do serviço, não garantindo resultados específicos, uma vez que estes dependem de fatores externos como mercado, concorrência e comportamento do público.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 9 – CANCELAMENTO</Text>
        <Text style={styles.paragraph}>Por se tratar de um plano mensal, não há reembolso após o início da execução do serviço.</Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 10 – DISPOSIÇÕES GERAIS</Text>
        <Text style={styles.paragraph}>
          Este contrato refere-se à prestação de serviços técnicos especializados, incluindo planejamento, execução e acompanhamento estratégico durante o período contratado.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 11 – FORO</Text>
        <Text style={styles.paragraph}>Fica eleito o foro da comarca de {FORO} para dirimir quaisquer dúvidas oriundas deste contrato.</Text>

        <Text style={styles.paragraph}>E por estarem assim justos e contratados, firmam o presente instrumento.</Text>
        <Text style={{ marginTop: 8 }}>{FORO}, {dataDoDia}.</Text>

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
