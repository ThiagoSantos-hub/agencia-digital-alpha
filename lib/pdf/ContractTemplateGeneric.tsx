import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface ContractTemplateGenericProps {
  templateName: string
  companyIdentity: {
    nomeFantasia: string
    nomeCompleto: string
    cpf: string
    endereco: string
    email: string
    telefone: string
  }
  contractantFieldRows: Array<{ label: string; value: string }>
  clauses: Array<{ title: string; body: string }>
  pricingItems: Array<{ label: string; amount: number; frequency: 'unico' | 'mensal' | 'semanal' }>
  currency: 'BRL' | 'USD'
  dataDoDia: string
  signerName: string
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.4 },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6 },
  label: { fontFamily: 'Helvetica-Bold' },
  row: { marginBottom: 2 },
  paragraph: { marginBottom: 6 },
  clauseTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, marginTop: 10, marginBottom: 4 },
  table: { marginTop: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 2 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableCellLabel: { flex: 3, padding: 6 },
  tableCellFreq: { flex: 1, padding: 6, textAlign: 'center' },
  tableCellAmount: { flex: 1.2, padding: 6, textAlign: 'right' },
  signatureBlock: { marginTop: 40 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1a1a1a', width: 260, marginTop: 30, paddingTop: 4 },
})

function fmtMoney(value: number, currency: 'BRL' | 'USD'): string {
  return currency === 'USD' ? `US$ ${value.toFixed(2)}` : `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function ContractTemplateGeneric(props: ContractTemplateGenericProps) {
  const { templateName, companyIdentity, contractantFieldRows, clauses, pricingItems, currency, dataDoDia, signerName } = props

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{templateName}</Text>

        <Text style={styles.sectionTitle}>CONTRATANTE:</Text>
        {contractantFieldRows.map((row) => (
          <Text key={row.label} style={styles.row}><Text style={styles.label}>{row.label}: </Text>{row.value}</Text>
        ))}

        <Text style={styles.sectionTitle}>CONTRATADO:</Text>
        <Text style={styles.row}><Text style={styles.label}>Nome Fantasia: </Text>{companyIdentity.nomeFantasia}</Text>
        <Text style={styles.row}><Text style={styles.label}>Nome Completo: </Text>{companyIdentity.nomeCompleto}</Text>
        <Text style={styles.row}><Text style={styles.label}>CPF: </Text>{companyIdentity.cpf}</Text>
        <Text style={styles.row}><Text style={styles.label}>Endereço: </Text>{companyIdentity.endereco}</Text>
        <Text style={styles.row}><Text style={styles.label}>E-mail: </Text>{companyIdentity.email}</Text>
        <Text style={styles.row}><Text style={styles.label}>Telefone: </Text>{companyIdentity.telefone}</Text>

        <Text style={styles.paragraph}>
          As partes acima qualificadas celebram o presente Contrato de Prestação de Serviços, regido pelas cláusulas e condições a seguir.
        </Text>

        {clauses.map((clause, i) => (
          <View key={i}>
            <Text style={styles.clauseTitle}>{clause.title}</Text>
            {clause.body.split('\n').map((line, j) => (
              <Text key={j} style={styles.paragraph}>{line}</Text>
            ))}
          </View>
        ))}

        {pricingItems.length > 0 && (
          <View>
            <Text style={styles.clauseTitle}>TABELA DE VALORES</Text>
            <View style={styles.table}>
              {pricingItems.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCellLabel}>{item.label}</Text>
                  <Text style={styles.tableCellFreq}>{item.frequency === 'unico' ? 'Único' : item.frequency === 'semanal' ? 'Semanal' : 'Mensal'}</Text>
                  <Text style={styles.tableCellAmount}>{fmtMoney(item.amount, currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={{ marginTop: 20 }}>Fortaleza, {dataDoDia}.</Text>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <Text>{signerName}</Text>
            <Text>CONTRATANTE</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>{companyIdentity.nomeCompleto}</Text>
            <Text>CONTRATADO</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
