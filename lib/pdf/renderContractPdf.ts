import { renderToBuffer } from '@react-pdf/renderer'
import { ContractTemplateGeneric, ContractTemplateGenericProps } from './ContractTemplateGeneric'

export function formatDataDoDia(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export async function renderContractPdf(props: ContractTemplateGenericProps): Promise<Buffer> {
  return renderToBuffer(ContractTemplateGeneric(props))
}
