import { CheckCircle, Mail, Users, Zap } from 'lucide-react'
import Header from '../../components/Header'

export default function CompanyHome() {
  return (
    <div className="min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-16">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              <CheckCircle className="w-4 h-4" /> Empresa verificada
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              Publica vacantes y recibe candidatos listos para trabajar
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Gestiona tus procesos de reclutamiento en un solo lugar y prioriza los perfiles
              mejor calificados.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold mb-4">Actividad reciente</h2>
            <div className="space-y-3 text-sm text-foreground/70">
              <p>3 nuevas postulaciones en las ultimas 24 horas.</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                2 vacantes activas
              </div>
              <button className="w-full mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium">
                Publicar vacante
              </button>
            </div>
          </div>
        </section>

        <section id="vacantes" className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Vacantes activas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'Supervisor de Operaciones', applicants: 12 },
              { title: 'Auxiliar Administrativo', applicants: 6 },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-foreground/70">{item.applicants} postulaciones</p>
                  </div>
                  <Zap className="w-5 h-5 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="candidatos" className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Candidatos destacados</h2>
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 text-sm text-foreground/70">
              <Users className="w-5 h-5 text-primary" />
              8 perfiles listos para entrevistar esta semana.
            </div>
          </div>
        </section>

        <section id="mensajes" className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Mensajes</h2>
          <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <p className="text-sm text-foreground/70">No tienes mensajes pendientes.</p>
          </div>
        </section>

        <section id="empresa" className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Perfil de empresa</h2>
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-sm text-foreground/70">
              Completa los datos de tu empresa para mejorar la visibilidad de tus vacantes.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
