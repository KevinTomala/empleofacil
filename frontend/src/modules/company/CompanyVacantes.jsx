import './company.css'
import {
  Briefcase,
  CheckCircle,
  Eye,
  FileText,
  MapPin,
  PauseCircle,
  Pencil,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Header from '../../components/Header'

export default function CompanyVacantes() {
  const vacantes = [
    {
      title: 'Supervisor de Operaciones',
      area: 'Operaciones · Turno diurno',
      location: 'Barranquilla, Atlántico',
      contract: 'Tiempo completo',
      status: 'Activa',
      lastApplication: 'Ayer',
      lastView: 'Hoy',
      applicants: 12,
      views: 384,
      match: 68,
      published: 'Hace 3 días',
    },
    {
      title: 'Auxiliar Administrativo',
      area: 'Administración · Backoffice',
      location: 'Bogotá, DC',
      contract: 'Híbrido',
      status: 'Pausada',
      lastApplication: 'Hace 6 días',
      lastView: 'Ayer',
      applicants: 6,
      views: 210,
      match: 54,
      published: 'Hace 6 días',
    },
    {
      title: 'Analista de Logística',
      area: 'Cadena de suministro',
      location: 'Medellín, Antioquia',
      contract: 'Contrato fijo',
      status: 'Cerrada',
      lastApplication: 'Hace 10 días',
      lastView: 'Hace 4 días',
      applicants: 18,
      views: 520,
      match: 72,
      published: 'Hace 12 días',
    },
  ]

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              <CheckCircle className="w-4 h-4" /> Empresa verificada
            </span>
            <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
              Vacantes activas y rendimiento de tu equipo
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Prioriza las vacantes con mejor rendimiento y actua rapido sobre las
              postulaciones mas compatibles.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Publicar vacante
              </button>
              <button className="px-5 py-2.5 bg-white border border-border rounded-lg font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Ver rendimiento
              </button>
            </div>
          </div>
          <div className="company-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Resumen de hoy</h2>
              <span className="text-xs text-foreground/60">Actualizado hace 2 horas</span>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/70">Postulaciones nuevas</span>
                <span className="font-semibold">+3</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/70">Vacantes activas</span>
                <span className="font-semibold">2</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/70">Perfiles compatibles</span>
                <span className="font-semibold">18</span>
              </div>
            </div>
            <div className="bg-secondary rounded-xl p-4 text-sm text-foreground/70 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              La vacante de Supervisor tiene 68% de match. Considera abrir entrevistas.
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">Vacantes</h2>
              <p className="text-sm text-foreground/70">
                Lista de vacantes activas con estado, postulaciones y metricas clave.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Publicar vacante
              </button>
              <button className="px-4 py-2 bg-white border border-border rounded-lg font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Ver rendimiento
              </button>
            </div>
          </div>

          <div className="company-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Filtros clave
              </div>
              <button className="text-sm text-primary font-semibold">Limpiar filtros</button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
              {['Estado', 'Cargo', 'Fecha de publicación', 'Tipo de contrato', 'Ubicación'].map(
                (label) => (
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

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="company-list space-y-4">
              {vacantes.map((vacante) => (
                <article key={vacante.title} className="company-card p-4">
                  <div className="space-y-2">
                    <h3 className="font-heading text-base font-semibold">{vacante.title}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          vacante.status === 'Activa'
                            ? 'bg-slate-100 text-slate-600'
                            : vacante.status === 'Pausada'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {vacante.status}
                      </span>
                      <span className="text-xs text-foreground/50">{vacante.published}</span>
                    </div>
                    <p className="text-sm text-foreground/70">{vacante.area}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/60">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {vacante.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-4 h-4" /> {vacante.contract}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                      <span>Ultima postulacion: {vacante.lastApplication}</span>
                      <span>Ultima vista: {vacante.lastView}</span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 mt-3">
                    <div className="border border-border rounded-xl p-2.5">
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <Eye className="w-4 h-4 text-primary" /> Vistas
                      </div>
                      <p className="text-base font-semibold mt-1">{vacante.views}</p>
                    </div>
                    <div className="border border-border rounded-xl p-2.5">
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <Users className="w-4 h-4 text-primary" /> Postulaciones
                      </div>
                      <p className="text-base font-semibold mt-1">{vacante.applicants}</p>
                      <p className="text-xs text-emerald-600 mt-1">Buen interes</p>
                    </div>
                    <div className="border border-border rounded-xl p-2.5">
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <Zap className="w-4 h-4 text-primary" /> % compatibilidad
                      </div>
                      <p className="text-base font-semibold mt-1">{vacante.match}%</p>
                      <p className="text-xs text-amber-600 mt-1">Destacado</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg flex items-center gap-2">
                      <Users className="w-4 h-4" /> Ver candidatos
                    </button>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                        <PauseCircle className="w-4 h-4" />
                        {vacante.status === 'Pausada' ? 'Reactivar' : 'Pausar'}
                      </button>
                      <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                        <Pencil className="w-4 h-4" /> Mas
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-4">
              <div className="company-card p-4">
                <h3 className="font-heading text-base font-semibold">Mejor rendimiento hoy</h3>
                <p className="text-sm text-foreground/70 mt-1">
                  Comparativa de vacantes con mayor interacción.
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Supervisor de Operaciones', value: '68% match', hint: 'Mejor vacante' },
                    { label: 'Analista de Logística', value: '18 postulaciones', hint: 'Mayor interes' },
                    { label: 'Auxiliar Administrativo', value: '210 vistas', hint: 'Alta visibilidad' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-foreground/70">{item.label}</p>
                        <p className="text-xs text-foreground/50">{item.hint}</p>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="company-card p-4">
                <h3 className="font-heading text-base font-semibold">Actividad reciente</h3>
                <div className="mt-4 space-y-3 text-sm text-foreground/70">
                  <p>3 nuevas postulaciones en las ultimas 24 horas.</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    2 vacantes activas
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                    1 vacante pausada
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
