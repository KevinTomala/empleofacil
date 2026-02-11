import './company.css';
import { Briefcase, Crown, Eye, FileText, Mail, Users } from 'lucide-react';
import Header from '../../components/Header';

export default function CompanyCandidatos() {
  const candidatos = [
    {
      name: 'Mariana Gomez',
      role: 'Supervisor de Operaciones',
      status: 'Nuevo',
      appliedAt: 'Postulo hace 2 semanas',
      lastActivity: 'Ultima actividad hace 3 dias',
      city: 'Barranquilla',
      experience: '5 años',
      education: 'Tecnólogo',
      availability: 'Inmediata',
      match: 82,
      featured: true,
    },
    {
      name: 'Carlos Perez',
      role: 'Auxiliar Administrativo',
      status: 'En revisión',
      appliedAt: 'Postulo hace 6 dias',
      lastActivity: 'Ultima actividad hace 2 dias',
      city: 'Bogotá',
      experience: '2 años',
      education: 'Técnico',
      availability: '2 semanas',
      match: 64,
      featured: false,
    },
    {
      name: 'Daniela Rojas',
      role: 'Analista de Logística',
      status: 'Entrevista',
      appliedAt: 'Postulo hace 3 semanas',
      lastActivity: 'Ultima actividad ayer',
      city: 'Medellín',
      experience: '4 años',
      education: 'Profesional',
      availability: '1 semana',
      match: 76,
      featured: false,
    },
  ]

  const estados = [
    { label: 'Nuevo', count: 4 },
    { label: 'En revisión', count: 3 },
    { label: 'Contactado', count: 2 },
    { label: 'Entrevista', count: 1 },
    { label: 'Seleccionado', count: 1 },
    { label: 'Descartado', count: 2 },
  ]

  const estadoClass = (status) => {
    switch (status) {
      case 'Nuevo':
        return 'bg-slate-100 text-slate-600'
      case 'En revisión':
        return 'bg-amber-100 text-amber-700'
      case 'Contactado':
        return 'bg-blue-100 text-blue-700'
      case 'Entrevista':
        return 'bg-indigo-100 text-indigo-700'
      case 'Seleccionado':
        return 'bg-emerald-100 text-emerald-700'
      case 'Descartado':
        return 'bg-rose-100 text-rose-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
                Candidatos
              </h1>
              <p className="text-sm text-foreground/70">
                Operacion diaria del reclutador con filtros y estados del proceso.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {estados.map((estado, index) => (
                <button
                  key={estado.label}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border border-border ${
                    index === 0 ? 'bg-primary text-white border-transparent' : 'bg-secondary text-foreground/70'
                  }`}
                >
                  {estado.label} ({estado.count})
                </button>
              ))}
            </div>
          </div>

          <div className="company-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Filtros potentes
              </div>
              <button className="text-sm text-primary font-semibold">Limpiar filtros</button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
              {[
                'Ciudad / provincia',
                'Experiencia',
                'Educación',
                'Disponibilidad',
                'Coincidencia (%)',
              ].map((label) => (
                <button
                  key={label}
                  className="flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm text-foreground/70 hover:border-primary/40"
                >
                  <span>{label}</span>
                  <span className="text-xs text-foreground/40">Seleccionar</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="company-list space-y-2">
            {candidatos.map((candidato) => (
              <article
                key={candidato.name}
                className="company-card p-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoClass(
                          candidato.status
                        )}`}
                      >
                        {candidato.status}
                      </span>
                      <span className="text-xs text-foreground/50">{candidato.role}</span>
                    </div>
                    <h3 className="font-heading text-sm font-semibold">{candidato.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                      <span>
                        {candidato.city} · {candidato.experience} · {candidato.education}
                      </span>
                      <span>Disponibilidad: {candidato.availability}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                      <span>{candidato.appliedAt}</span>
                      <span>{candidato.lastActivity}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg flex items-center gap-2">
                      <Users className="w-4 h-4" /> Ver perfil
                    </button>
                    <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Cambiar estado
                    </button>
                    <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Enviar mensaje
                    </button>
                    <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                      <Crown className="w-4 h-4" /> Destacar
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-foreground/60">
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> {candidato.match}% coincidencia
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> {candidato.role}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> {candidato.status}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="company-card p-4 bg-secondary/60 shadow-none">
              <h3 className="font-heading text-sm font-semibold">Agrupaciones clave</h3>
              <p className="text-sm text-foreground/70 mt-1">
                Vista rapida por vacante y estado del proceso.
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Supervisor de Operaciones', value: '5 candidatos' },
                  { label: 'Auxiliar Administrativo', value: '3 candidatos' },
                  { label: 'Analista de Logística', value: '4 candidatos' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none">
              <h3 className="font-heading text-sm font-semibold">Estado del proceso</h3>
              <div className="mt-4 space-y-3 text-sm text-foreground/70">
                {[
                  'Nuevo (4)',
                  'En revisión (3)',
                  'Contactado (2)',
                  'Entrevista (1)',
                  'Seleccionado (1)',
                  'Descartado (2)',
                ].map((estado) => (
                  <div key={estado} className="flex items-center justify-between">
                    <span>{estado}</span>
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
