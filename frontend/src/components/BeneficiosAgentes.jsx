import { Briefcase, TrendingUp, Bell, Award, Calendar, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const beneficios = [
  {
    icon: Briefcase,
    title: 'Oportunidades Verificadas',
    description: 'Accede a vacantes reales de empresas establecidas que buscan talento.'
  },
  {
    icon: TrendingUp,
    title: 'Mejora tu Perfil',
    description: 'Destaca tu experiencia, certificaciones y habilidades para ser mas visible ante empleadores.'
  },
  {
    icon: Bell,
    title: 'Alertas de Empleo',
    description: 'Recibe notificaciones cuando se publiquen vacantes que coincidan con tu perfil.'
  },
  {
    icon: Award,
    title: 'Credencial Validada',
    description: 'Tu documentacion y experiencia validada generan confianza ante las empresas.'
  },
  {
    icon: Calendar,
    title: 'Flexibilidad Laboral',
    description: 'Encuentra trabajos temporales, fijos, de medio tiempo o para eventos especiales.'
  },
  {
    icon: MapPin,
    title: 'Cerca de Ti',
    description: 'Filtra oportunidades por ubicacion y encuentra trabajo en tu zona.'
  }
]

export default function BeneficiosAgentes() {
  return (
    <section id="beneficios-candidatos" className="py-20 bg-background">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <span className="inline-block px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
              Para Candidatos
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
              Tu proxima oportunidad laboral esta aqui
            </h2>
            <p className="text-foreground/70 text-lg mb-8">
              Si estas buscando empleo, EmpleoFácil es tu plataforma para conectar con empresas que valoran tu experiencia.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {beneficios.map((beneficio, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                    <beneficio.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {beneficio.title}
                    </h3>
                    <p className="text-sm text-foreground/70">
                      {beneficio.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                Registrarme como Candidato
              </Link>
            </div>
          </div>

          {/* Right - Visual */}
          <div className="relative">
            <div className="bg-linear-to-br from-primary/5 to-accent/5 rounded-3xl p-8 border border-border">
              <div className="space-y-4">
                {/* Sample Job Card */}
                <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded mb-2">
                        Temporal
                      </span>
                      <h4 className="font-semibold text-foreground">Asistente Operativo</h4>
                      <p className="text-sm text-foreground/70">Empresa de Servicios S.A.</p>
                    </div>
                    <span className="text-sm font-medium text-accent">$600/mes</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground/60">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Guayaquil
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Inmediato
                    </span>
                  </div>
                </div>

                {/* Sample Job Card 2 */}
                <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded mb-2">
                        Fijo
                      </span>
                      <h4 className="font-semibold text-foreground">Supervisor de Operaciones</h4>
                      <p className="text-sm text-foreground/70">Centro Comercial</p>
                    </div>
                    <span className="text-sm font-medium text-primary">$850/mes</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground/60">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Quito
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Disponible
                    </span>
                  </div>
                </div>

                {/* Sample Job Card 3 */}
                <div className="bg-background p-4 rounded-xl border border-border shadow-sm opacity-70">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2 py-1 bg-foreground/10 text-foreground text-xs font-medium rounded mb-2">
                        Evento
                      </span>
                      <h4 className="font-semibold text-foreground">Apoyo para Evento</h4>
                      <p className="text-sm text-foreground/70">Productora</p>
                    </div>
                    <span className="text-sm font-medium text-foreground">$50/dia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
