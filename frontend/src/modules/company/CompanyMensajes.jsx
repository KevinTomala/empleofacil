import './company.css'
import { Mail, MessageCircle, Send } from 'lucide-react'
import Header from '../../components/Header'

const CONVERSATIONS = [
  {
    id: 1,
    name: 'Mariana Gomez',
    role: 'Supervisor de Operaciones',
    lastMessage: 'Gracias por la invitacion, quedo atenta.',
    time: 'Hoy, 9:40 AM',
  },
  {
    id: 2,
    name: 'Carlos Perez',
    role: 'Auxiliar Administrativo',
    lastMessage: 'Puedo asistir a la entrevista el jueves.',
    time: 'Ayer, 5:10 PM',
  },
  {
    id: 3,
    name: 'Daniela Rojas',
    role: 'Analista de Logistica',
    lastMessage: 'Adjunto mi portafolio actualizado.',
    time: 'Ayer, 3:20 PM',
  },
]

export default function CompanyMensajes() {
  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              <Mail className="w-4 h-4" /> Mensajes
            </span>
            <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
              Conversaciones activas
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Mantente al dia con los candidatos que estan en proceso.
            </p>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
          <div className="space-y-3">
            {CONVERSATIONS.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className="company-card p-4 text-left w-full space-y-2 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{conversation.name}</p>
                    <p className="text-xs text-foreground/60">{conversation.role}</p>
                  </div>
                  <span className="text-xs text-foreground/60">{conversation.time}</span>
                </div>
                <p className="text-sm text-foreground/70">{conversation.lastMessage}</p>
              </button>
            ))}
          </div>

          <div className="company-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <MessageCircle className="w-4 h-4 text-primary" />
              Selecciona una conversacion para responder
            </div>
            <div className="border border-border rounded-xl p-4 text-sm text-foreground/70 space-y-3 min-h-[220px]">
              <p className="font-semibold text-foreground">Mensajes recientes</p>
              <p>
                Recuerda responder rapido para mejorar tu tasa de cierre de procesos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe tu mensaje"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-white"
              />
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
                <Send className="w-4 h-4" /> Enviar
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
