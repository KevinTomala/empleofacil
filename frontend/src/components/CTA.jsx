import { ArrowRight, Shield } from 'lucide-react'

export default function CTA() {
  return (
    <section className="py-20 bg-background">
      <div className="page-container">
        <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
              Empieza hoy mismo
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              Unete a la plataforma de empleo especializada en seguridad privada mas grande de Ecuador. 
              Es completamente gratis para agentes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors">
                Soy Agente
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20">
                Soy Empresa
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <p className="text-white/60 text-sm mt-6">
              Sin cargos ocultos. Sin compromisos. Cancela cuando quieras.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
