// Máscaras e validações para documentos brasileiros usados no fluxo de contratos.
// Implementação manual (sem dependência nova) para manter o padrão do projeto.

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8)
  return d.replace(/^(\d{5})(\d)/, '$1-$2')
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)
  const calcCheckDigit = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += digits[i] * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calcCheckDigit(9) === digits[9] && calcCheckDigit(10) === digits[10]
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  const digits = cnpj.split('').map(Number)
  const calcCheckDigit = (length: number) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < length; i++) sum += digits[i] * weights[i]
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return calcCheckDigit(12) === digits[12] && calcCheckDigit(13) === digits[13]
}
