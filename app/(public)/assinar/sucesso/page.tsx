import { CheckCircle2 } from 'lucide-react'

export default function AssinarSucessoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm text-center">
          <CheckCircle2 size={40} className="text-cta mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-main mb-2">Pagamento confirmado!</h1>
          <p className="text-sm text-text-muted">
            Estamos preparando seu acesso. Você vai receber um e-mail em instantes com seu login e senha temporária.
            Se não chegar em alguns minutos, verifique o spam ou fale com o suporte.
          </p>
        </div>
      </div>
    </div>
  )
}
