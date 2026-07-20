import Stripe from 'stripe'

// Instancia só na primeira vez que alguma rota realmente usar o client (não no
// carregamento do módulo) -- o construtor do Stripe valida a chave na hora e
// lança erro se estiver ausente, o que travava a coleta de dados de página do
// Next.js durante o build inteiro caso STRIPE_SECRET_KEY não estivesse
// disponível nesse momento, mesmo em rotas que não seriam chamadas ainda.
let _stripe: Stripe | null = null

function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não configurado')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver)
  },
})
