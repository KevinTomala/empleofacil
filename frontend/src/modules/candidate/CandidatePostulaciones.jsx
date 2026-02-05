import { CheckCircle, Clock, FileText } from 'lucide-react'
import Header from '../../components/Header'

const POSTULACIONES = [
  { title: 'Auxiliar Administrativo', company: 'Logistica Pro', status: 'En revision' },
  { title: 'Supervisor de Operaciones', company: 'Centro Comercial', status: 'Entrevista' },
]

export default function CandidatePostulaciones() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-10">
        <section className="space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
            <FileText className="w-4 h-4" /> Historial de postulaciones
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Tus postulaciones</h1>
          <p className="text-foreground/70 max-w-2xl">
            Revisa el estado de cada proceso y toma acciones rapidas.
          </p>
        </section>

        <section className="grid gap-4">
          {POSTULACIONES.map((item) => (
            <article key={item.title} className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">{item.title}</h2>
                  <p className="text-sm text-foreground/70">{item.company}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-accent/10 text-accent">
                  {item.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/60 mt-3">
                {item.status === 'Entrevista' ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Proxima accion: confirmar horario
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" /> Proxima accion: esperar respuesta
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
