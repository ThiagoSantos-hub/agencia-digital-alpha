import { renderToBuffer } from '@react-pdf/renderer'
import { ContractTemplateCompleto, ContractTemplateCompletoProps } from './ContractTemplateCompleto'
import { ContractTemplateCRM, ContractTemplateCRMProps } from './ContractTemplateCRM'

export function formatDataDoDia(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export async function renderContractPdf(
  type: 'completo',
  props: ContractTemplateCompletoProps
): Promise<Buffer>
export async function renderContractPdf(
  type: 'crm',
  props: ContractTemplateCRMProps
): Promise<Buffer>
export async function renderContractPdf(
  type: 'completo' | 'crm',
  props: ContractTemplateCompletoProps | ContractTemplateCRMProps
): Promise<Buffer> {
  const doc = type === 'completo'
    ? ContractTemplateCompleto(props as ContractTemplateCompletoProps)
    : ContractTemplateCRM(props as ContractTemplateCRMProps)

  return renderToBuffer(doc)
}
