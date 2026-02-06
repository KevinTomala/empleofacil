import { useMemo, useState } from 'react'
import { CheckCircle, Clock, FileText } from 'lucide-react'
import Header from '../../components/Header'

const POSTULACIONES = [
  {
    title: 'Auxiliar Administrativo',
    company: 'Logistica Pro',
    status: 'En revision',
    appliedAt: '2026-01-12',
    nextStep: 'Esperar respuesta del reclutador',
    cta: null,
  },
  {
    title: 'Supervisor de Operaciones',
    company: 'Centro Comercial',
    status: 'Entrevista',
    appliedAt: '2026-01-28',
    nextStep: 'Confirmar horario',
    cta: { label: 'Confirmar entrevista' },
  },
  {
    title: 'Analista de Inventario',
    company: 'Bodega Central',
    status: 'Finalizado',
    appliedAt: '2025-12-20',
    nextStep: 'Proceso finalizado',
    cta: { label: 'Ver detalles' },
  },
]

export default function CandidatePostulaciones() {
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dateFilter, setDateFilter] = useState('Ultimos 30 dias')

  const filteredPostulaciones = useMemo(() => {
    const now = new Date()
    const daysAgo = (days) => {
      const cutoff = new Date(now)
      cutoff.setDate(now.getDate() - days)
      return cutoff
    }

    return POSTULACIONES.filter((item) => {
      const appliedDate = new Date(item.appliedAt)
      const statusOk = statusFilter === 'Todos' || item.status === statusFilter
      let dateOk = true

      if (dateFilter === 'Ultimos 7 dias') {
        dateOk = appliedDate >= daysAgo(7)
      } else if (dateFilter === 'Ultimos 30 dias') {
        dateOk = appliedDate >= daysAgo(30)
      } else if (dateFilter === 'Mas antiguos') {
        dateOk = appliedDate < daysAgo(30)
      }

      return statusOk && dateOk
    })
  }, [statusFilter, dateFilter])

  const formatDate = (value) =>
    new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(value))

  const statusStyles = {
    'En revision': 'bg-amber-500/10 text-amber-600',
    Entrevista: 'bg-primary/10 text-primary',
    Finalizado: 'bg-emerald-500/10 text-emerald-600',
    Rechazado: 'bg-rose-500/10 text-rose-600',
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-10">
        <section className="space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
            <FileText className="w-4 h-4" /> Panel de seguimiento
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Tus postulaciones</h1>
          <p className="text-foreground/70 max-w-2xl">
            Aqui puedes ver en que etapa esta cada proceso y que hacer a continuacion.
          </p>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-foreground/70">
              Estado
              <select
                className="ml-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="En revision">En revision</option>
                <option value="Entrevista">Entrevista</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground/70">
              Fecha
              <select
                className="ml-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="Ultimos 7 dias">Ultimos 7 dias</option>
                <option value="Ultimos 30 dias">Ultimos 30 dias</option>
                <option value="Mas antiguos">Mas antiguos</option>
              </select>
            </label>
          </div>

          {POSTULACIONES.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-foreground/70">
              Aun no tienes postulaciones activas.
            </div>
          ) : filteredPostulaciones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-foreground/70">
              No hay procesos con ese estado.
            </div>
          ) : (
            filteredPostulaciones.map((item) => (
              <article key={item.title} className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold text-lg text-foreground">{item.title}</h2>
                    <p className="text-sm text-foreground/70">{item.company}</p>
                    <p className="text-xs text-foreground/50">
                      Postulado el {formatDate(item.appliedAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[item.status]}`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-foreground/70">
                  <p className="font-medium text-foreground/80">Estado actual: {item.status}</p>
                  <p className="flex items-center gap-2 text-foreground/60">
                    {item.status === 'Entrevista' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    Siguiente paso: {item.nextStep}
                  </p>
                </div>
                {item.cta ? (
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {item.cta.label}
                  </button>
                ) : null}
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  )
}
