import { Briefcase, MapPin, Star } from 'lucide-react'
import Header from '../../components/Header'

const VACANTES = [
  { title: 'Asistente Operativo', company: 'Servicios S.A.', city: 'Guayaquil', type: 'Tiempo completo' },
  { title: 'Supervisor de Operaciones', company: 'Centro Comercial', city: 'Quito', type: 'Turnos rotativos' },
  { title: 'Auxiliar Administrativo', company: 'Logistica Pro', city: 'Cuenca', type: 'Medio tiempo' },
]

export default function CandidateVacantes() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-10">
        <section className="space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
            <Star className="w-4 h-4" /> Vacantes recomendadas
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Explora vacantes activas</h1>
          <p className="text-foreground/70 max-w-2xl">
            Encuentra oportunidades verificadas y postula con un solo clic.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          {VACANTES.map((item) => (
            <article key={item.title} className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">{item.title}</h2>
                  <p className="text-sm text-foreground/70">{item.company}</p>
                </div>
                <Briefcase className="w-5 h-5 text-accent" />
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60 mt-3">
                <MapPin className="w-3 h-3" /> {item.city} • {item.type}
              </div>
              <button className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg font-medium">
                Postular ahora
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
