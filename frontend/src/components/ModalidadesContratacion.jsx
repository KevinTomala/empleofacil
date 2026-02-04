import { Clock, CalendarDays, Briefcase, Timer, Star } from 'lucide-react'

const modalidades = [
  {
    icon: Clock,
    title: 'Temporal',
    description: 'Contratos por tiempo definido para cubrir necesidades puntuales.',
    ejemplos: ['Reemplazos', 'Proyectos', 'Temporada alta']
  },
  {
    icon: CalendarDays,
    title: 'Ocasional',
    description: 'Personal para situaciones especificas o eventos determinados.',
    ejemplos: ['Eventos', 'Ferias', 'Inauguraciones']
  },
  {
    icon: Briefcase,
    title: 'Fijo',
    description: 'Contratacion permanente para roles clave y equipos estables.',
    ejemplos: ['Administracion', 'Operaciones', 'Comercial']
  },
  {
    icon: Timer,
    title: 'Medio Tiempo',
    description: 'Horarios parciales ideales para cubrir franjas y picos de demanda.',
    ejemplos: ['Fines de semana', 'Tardes', 'Horarios especificos']
  },
  {
    icon: Star,
    title: 'Eventos Especiales',
    description: 'Refuerzos puntuales para ocasiones que requieren personal extra.',
    ejemplos: ['Conciertos', 'Conferencias', 'Promociones']
  }
]

export default function ModalidadesContratacion() {
  return (
    <section className="py-20 bg-secondary">
      <div className="page-container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
            Flexibilidad Total
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Modalidades de contratacion
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto text-lg">
            Adaptamos las opciones de contratacion a las necesidades de cada empresa y la disponibilidad de cada candidato.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modalidades.map((modalidad, index) => (
            <div
              key={index}
              className="bg-background p-6 rounded-xl border border-border hover:border-accent/30 transition-all group"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                <modalidad.icon className="w-7 h-7 text-accent group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                {modalidad.title}
              </h3>
              <p className="text-foreground/70 mb-4">
                {modalidad.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {modalidad.ejemplos.map((ejemplo, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-muted text-foreground/70 text-xs rounded-full"
                  >
                    {ejemplo}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
