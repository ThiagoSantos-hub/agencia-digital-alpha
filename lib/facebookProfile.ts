// Normaliza um link/nome de perfil do Facebook pra comparar entradas diferentes
// como o mesmo perfil (ex: "facebook.com/joaosilva", "https://www.facebook.com/joaosilva/",
// "Facebook.com/JoaoSilva?x=1" devem todas virar "facebook.com/joaosilva").
export function normalizeFacebookProfile(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')
}
