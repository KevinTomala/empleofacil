import './company.css'
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Tag,
  UserCircle2,
} from 'lucide-react'
import Header from '../../components/Header'

export default function CompanyMensajes() {
  const conversaciones = [
    {
      name: 'Mariana Gomez',
      role: 'Supervisor de Operaciones',
      location: 'Quito',
      stage: 'Entrevista',
      featured: true,
      context: 'Vacante #SO-023 · Quito',
      preview: 'Gracias por la invitacion, estoy disponible.',
      time: 'Hace 1 h',
      unread: true,
    },
    {
      name: 'Carlos Perez',
      role: 'Auxiliar Administrativo',
      location: 'Bogota',
      stage: 'Seguimiento',
      featured: false,
      context: 'Vacante #AD-112 · Bogota',
      preview: 'Adjunto mi hoja de vida actualizada.',
      time: 'Ayer',
      unread: false,
    },
    {
      name: 'Daniela Rojas',
      role: 'Analista de Logistica',
      location: 'Medellin',
      stage: 'Nuevo',
      featured: false,
      context: 'Vacante #LG-086 · Medellin',
      preview: 'Quedo pendiente de la fecha de entrevista.',
      time: 'Hace 2 dias',
      unread: false,
    },
  ]

  const plantillas = [
    {
      title: 'Invitacion entrevista',
      body: 'Hola, nos gustaria agendar una entrevista contigo esta semana.',
    },
    {
      title: 'Seguimiento',
      body: 'Hola, gracias por postularte. Te compartimos novedades pronto.',
    },
    {
      title: 'Descarte respetuoso',
      body: 'Gracias por tu tiempo. En esta ocasion no continuaremos el proceso.',
    },
  ]

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-6">
        <section className="space-y-3">
          <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">Mensajes</h1>
          <p className="text-sm text-foreground/70">Conversaciones con candidatos</p>
        </section>

        <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="company-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="w-4 h-4 text-primary" />
                Bandeja de entrada
              </div>
              <button className="text-sm text-primary font-semibold">Nueva conversacion</button>
            </div>
            <div className="space-y-3">
              {conversaciones.map((item) => (
                <article
                  key={item.name}
                  className="border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/40"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{item.name}</div>
                      <span className="text-xs text-foreground/50">{item.time}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                      <span>
                        {item.role} - {item.location}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground/70">
                        {item.stage}
                      </span>
                      {item.featured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Destacado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/70 mt-2">{item.preview}</p>
                  </div>
                  {item.unread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary mt-2" />
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="company-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Mariana Gomez</p>
                  <p className="text-xs text-foreground/60">
                    Supervisor de Operaciones · Quito
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  Entrevista
                </span>
              </div>
              <div className="bg-secondary rounded-xl p-4 text-sm text-foreground/70 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-primary" />
                Contexto: <strong>Vacante #SO-023 · Quito</strong>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-secondary rounded-xl p-3">
                  <p>Hola Mariana, gracias por postularte. Podemos agendar entrevista?</p>
                  <p className="text-xs text-foreground/50 mt-2">Hoy, 9:20 AM</p>
                </div>
                <div className="bg-white border border-border rounded-xl p-3">
                  <p>Claro, tengo disponibilidad jueves o viernes.</p>
                  <p className="text-xs text-foreground/50 mt-2">Hoy, 9:32 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder="Escribe un mensaje rapido..."
                />
                <button className="p-2 border border-border rounded-lg text-foreground/70">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-2 border border-border rounded-lg text-foreground/70">
                  <Tag className="w-4 h-4" />
                </button>
                <button className="p-2 border border-border rounded-lg text-foreground/70">
                  <FileText className="w-4 h-4" />
                </button>
                <button className="px-3 py-2 border border-primary text-primary rounded-lg text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </div>
            </div>

            <div className="company-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="w-4 h-4 text-primary" />
                Plantillas rapidas
              </div>
              {plantillas.map((plantilla) => (
                <button
                  key={plantilla.title}
                  className="w-full text-left border border-border rounded-xl p-3 hover:border-primary/40"
                >
                  <p className="font-semibold text-sm">{plantilla.title}</p>
                  <p className="text-xs text-foreground/60 mt-1">{plantilla.body}</p>
                  <p className="text-xs text-foreground/50 mt-2">
                    Usada normalmente despues de postulacion.
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
