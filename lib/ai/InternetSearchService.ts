// lib/ai/InternetSearchService.ts
// Busca na internet via Brave Search API
// Retorna [] silenciosamente se BRAVE_SEARCH_API_KEY não estiver configurada

export interface SearchResult {
  title:   string
  url:     string
  snippet: string
}

export class InternetSearchService {
  private readonly apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.BRAVE_SEARCH_API_KEY
  }

  async buscar(query: string, limite = 5): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn('[InternetSearchService] BRAVE_SEARCH_API_KEY não configurada — busca desabilitada.')
      return []
    }

    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limite}&country=BR&search_lang=pt`

      const response = await fetch(url, {
        headers: {
          'Accept':               'application/json',
          'Accept-Encoding':      'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      })

      if (!response.ok) {
        console.error('[InternetSearchService] Erro na busca:', response.status)
        return []
      }

      const data    = await response.json()
      const results = data.web?.results ?? []

      return results.slice(0, limite).map((r: any) => ({
        title:   r.title       ?? '',
        url:     r.url         ?? '',
        snippet: r.description ?? '',
      }))
    } catch (err) {
      console.error('[InternetSearchService] Erro:', err)
      return []
    }
  }

  formatarParaLLM(results: SearchResult[]): string {
    if (results.length === 0) return 'Nenhum resultado encontrado.'
    return results.map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.snippet}\nFonte: ${r.url}`
    ).join('\n\n')
  }
}

export const internetSearch = new InternetSearchService()
