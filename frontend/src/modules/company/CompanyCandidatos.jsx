import './company.css'
import { CheckCircle, Mail, Star, Users } from 'lucide-react'
import Header from '../../components/Header'

const CANDIDATOS = [
  {
    id: 1,
    name: 'Mariana Gomez',
    role: 'Supervisor de Operaciones',
    match: 82,
    stage: 'Entrevista',
  },
  {
    id: 2,
    name: 'Carlos Perez',
    role: 'Auxiliar Administrativo',
    match: 64,
    stage: 'Preseleccion',
  },
  {
    id: 3,
    name: 'Daniela Rojas',
    role: 'Analista de Logistica',
    match: 76,
    stage: 'Revision',
  },
]

export default function CompanyCandidatos() {
  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              <Users className="w-4 h-4" /> Candidatos
            </span>
            <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
              Perfiles recomendados
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Revisa la compatibilidad y avanza a los mejores perfiles.
            </p>
          </div>
          <button className="px-5 py-2.5 bg-white border border-border rounded-lg font-medium flex items-center gap-2">
            <Star className="w-4 h-4" /> Favoritos
          </button>
        </section>

        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-4">
            {CANDIDATOS.map((candidate) => (
              <article key={candidate.id} className="company-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{candidate.name}</h2>
                    <p className="text-sm text-foreground/70">{candidate.role}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    {candidate.stage}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  {candidate.match}% compatibilidad
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-2 text-sm border border-border rounded-lg font-medium">
                    Ver perfil
                  </button>
                  <button className="px-3 py-2 text-sm bg-white border border-border rounded-lg font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Contactar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="company-card p-5 space-y-4">
            <h2 className="font-heading text-base font-semibold">Embudo de seleccion</h2>
            <div className="space-y-3 text-sm text-foreground/70">
              <div className="flex items-center justify-between">
                <span>Revision</span>
                <span className="font-semibold text-foreground">6</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Preseleccion</span>
                <span className="font-semibold text-foreground">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Entrevista</span>
                <span className="font-semibold text-foreground">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Oferta</span>
                <span className="font-semibold text-foreground">1</span>
              </div>
              <button className="mt-2 w-full px-3 py-2 text-sm border border-border rounded-lg font-medium">
                Ver tablero completo
              </button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
