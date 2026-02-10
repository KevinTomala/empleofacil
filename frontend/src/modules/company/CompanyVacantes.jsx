import './company.css'
import { Briefcase, PauseCircle, PlayCircle, Plus, Users } from 'lucide-react'
import Header from '../../components/Header'

const VACANTES = [
  {
    id: 1,
    title: 'Supervisor de Operaciones',
    applicants: 12,
    status: 'Activa',
    updated: 'Hoy',
  },
  {
    id: 2,
    title: 'Auxiliar Administrativo',
    applicants: 0,
    status: 'Pausada',
    updated: 'Hace 3 dias',
  },
  {
    id: 3,
    title: 'Analista de Logistica',
    applicants: 4,
    status: 'Activa',
    updated: 'Ayer',
  },
]

export default function CompanyVacantes() {
  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              <Briefcase className="w-4 h-4" /> Gestion de vacantes
            </span>
            <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
              Tus vacantes activas
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Publica nuevas posiciones, pausa procesos y revisa candidatos en un solo lugar.
            </p>
          </div>
          <button className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva vacante
          </button>
        </section>

        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-4">
            {VACANTES.map((vacante) => (
              <article key={vacante.id} className="company-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{vacante.title}</h2>
                    <p className="text-sm text-foreground/70">
                      Actualizada: {vacante.updated}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      vacante.status === 'Pausada'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {vacante.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Users className="w-4 h-4 text-primary" />
                  {vacante.applicants} postulaciones
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-2 text-sm border border-border rounded-lg font-medium">
                    Ver candidatos
                  </button>
                  {vacante.status === 'Pausada' ? (
                    <button className="px-3 py-2 text-sm bg-white border border-border rounded-lg font-medium flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" /> Reactivar
                    </button>
                  ) : (
                    <button className="px-3 py-2 text-sm bg-white border border-border rounded-lg font-medium flex items-center gap-2">
                      <PauseCircle className="w-4 h-4" /> Pausar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <aside className="company-card p-5 space-y-4">
            <h2 className="font-heading text-base font-semibold">Resumen semanal</h2>
            <div className="space-y-3 text-sm text-foreground/70">
              <p>16 postulaciones nuevas en los ultimos 7 dias.</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                2 vacantes activas
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                1 vacante pausada
              </div>
              <button className="mt-2 w-full px-3 py-2 text-sm border border-border rounded-lg font-medium">
                Descargar reporte
              </button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
