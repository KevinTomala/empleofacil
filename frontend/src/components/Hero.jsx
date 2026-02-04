import { ArrowRight, CheckCircle, Users, Building2 } from 'lucide-react'

export default function Hero() {
  return (
    <section className="bg-background">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-accent">
                Plataforma lider en Ecuador
              </span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Conectamos guardias de seguridad certificados con empresas
            </h1>

            <p className="text-lg text-foreground/70 leading-relaxed max-w-xl">
              La plataforma de empleo especializada en el sector de seguridad privada. 
              Agentes con credencial ministerial y empresas que buscan personal calificado.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
                Soy Agente de Seguridad
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground font-medium rounded-lg hover:bg-muted transition-colors border border-border">
                Soy Empresa
                <Building2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Guardias certificados</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Verificacion ministerial</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>100% gratuito</span>
              </div>
            </div>
          </div>

          {/* Right Content - Stats Cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary text-white p-6 rounded-2xl">
                <Users className="w-10 h-10 mb-4 opacity-80" />
                <p className="font-heading text-4xl font-bold">500+</p>
                <p className="text-white/80 mt-1">Agentes registrados</p>
              </div>
              <div className="bg-secondary p-6 rounded-2xl border border-border mt-8">
                <Building2 className="w-10 h-10 mb-4 text-primary" />
                <p className="font-heading text-4xl font-bold text-foreground">50+</p>
                <p className="text-foreground/70 mt-1">Empresas activas</p>
              </div>
              <div className="bg-accent/10 p-6 rounded-2xl border border-accent/20">
                <div className="w-10 h-10 mb-4 bg-accent rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <p className="font-heading text-4xl font-bold text-foreground">98%</p>
                <p className="text-foreground/70 mt-1">Tasa de colocacion</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm -mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full border-2 border-white" />
                    <div className="w-8 h-8 bg-accent/20 rounded-full border-2 border-white" />
                    <div className="w-8 h-8 bg-foreground/20 rounded-full border-2 border-white" />
                  </div>
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">24/7</p>
                <p className="text-foreground/70 mt-1">Soporte disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
