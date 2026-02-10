import './company.css'
import { Briefcase, CheckCircle, Mail, TrendingUp, Users, Zap } from 'lucide-react'
import Header from '../../components/Header'

export default function CompanyHome() {
  const vacantes = [
    { title: 'Supervisor de Operaciones', applicants: 12, status: 'Activa' },
    { title: 'Auxiliar Administrativo', applicants: 0, status: 'Pausada' },
    { title: 'Analista de Logistica', applicants: 4, status: 'Activa' },
  ]

  const candidatos = [
    { name: 'Mariana Gomez', role: 'Supervisor de Operaciones', match: 82 },
    { name: 'Carlos Perez', role: 'Auxiliar Administrativo', match: 64 },
    { name: 'Daniela Rojas', role: 'Analista de Logistica', match: 76 },
  ]

  const ultimoMensaje = {
    candidate: 'Mariana Gomez',
    date: 'Hoy, 9:40 AM',
    text: 'Gracias por la invitacion, quedo atenta.',
  }

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
              Publica vacantes y recibe candidatos listos para trabajar
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Gestiona tus procesos de reclutamiento en un solo lugar y prioriza los perfiles
              mejor calificados.
            </p>
            <p className="text-xs text-foreground/60">
              La mayoria de empresas contratan en menos de 7 dias.
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
          <div className="company-card p-5 space-y-4">
            <h2 className="font-heading text-base font-semibold">Actividad reciente</h2>
            <div className="space-y-3 text-sm text-foreground/70">
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
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">Vacantes activas</h2>
            <button className="text-sm text-primary font-semibold">Ver candidatos</button>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            {vacantes.map((item) => (
              <div key={item.title} className="company-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-foreground/70">
                      {item.applicants} postulaciones
                    </p>
                    {item.applicants === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Sin postulaciones en 7 dias
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      item.status === 'Pausada'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <button className="mt-3 w-full px-3 py-2 text-sm border border-border rounded-lg font-medium">
                  Ver candidatos
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.75fr] gap-6">
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Candidatos destacados</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidatos.map((item) => (
                <div key={item.name} className="company-card p-4 space-y-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-foreground/70">{item.role}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <Zap className="w-4 h-4 text-primary" /> {item.match}% compatibilidad
                  </div>
                  <button className="w-full px-3 py-2 text-sm border border-border rounded-lg font-medium">
                    Revisar perfil
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Mensajes</h2>
            <div className="company-card p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <Mail className="w-4 h-4 text-primary" />
                Ultimo mensaje recibido
              </div>
              <div className="border border-border rounded-xl p-3 space-y-1 text-sm">
                <p className="font-semibold">{ultimoMensaje.candidate}</p>
                <p className="text-foreground/60">{ultimoMensaje.date}</p>
                <p className="text-foreground/70">{ultimoMensaje.text}</p>
              </div>
              <button className="px-3 py-2 text-sm border border-border rounded-lg font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> Responder
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
