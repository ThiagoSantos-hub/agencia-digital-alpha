// Substitui tokens %%chave%% em texto de cláusula pelos valores informados.
// Mesmo padrão de .replaceAll() já usado em app/api/relatorios/gerar-mensagem/route.ts,
// adaptado para o delimitador %%chave%% usado nos modelos de contrato.
export function substituteTokens(text: string, values: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`%%${key}%%`, value)
  }
  return result.replace(/%%[a-z0-9_]+%%/gi, '—')
}
