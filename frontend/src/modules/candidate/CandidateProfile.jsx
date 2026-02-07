import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  FileText,
  GraduationCap,
  Languages,
  Lock,
  Briefcase,
  User,
  Target,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'

export default function CandidateProfile() {
  const navigate = useNavigate()
  const sections = useMemo(() => {
    const basicComplete = false

    return [
      {
        id: 'datos-basicos',
        title: 'Informacion basica',
        summary: 'Documento, nombres, contacto, ciudad',
        why: 'Necesario para identificarte y contactarte',
        status: basicComplete ? 'complete' : 'incomplete',
        progress: basicComplete ? 1 : 0.4,
        route: '/perfil/datos-basicos',
        actionLabel: 'Completar',
        icon: User,
        level: 'basico',
      },
      {
        id: 'preferencias',
        title: 'Preferencias laborales',
        summary: 'Cargo deseado, modalidad, disponibilidad',
        why: 'Mejora la coincidencia con vacantes',
        status: basicComplete ? 'pending' : 'locked',
        progress: basicComplete ? 0.2 : 0,
        route: '/perfil/preferencias',
        actionLabel: 'Configurar',
        icon: Target,
        level: 'recomendado',
      },
      {
        id: 'experiencia',
        title: 'Experiencia',
        summary: 'Puestos, empresa, tiempo',
        why: 'Aumenta tus posibilidades de ser seleccionado',
        status: basicComplete ? 'pending' : 'locked',
        progress: basicComplete ? 0.1 : 0,
        route: '/perfil/experiencia',
        actionLabel: 'Agregar',
        icon: Briefcase,
        level: 'recomendado',
      },
      {
        id: 'formacion',
        title: 'Formacion',
        summary: 'Nivel, institucion, estado',
        why: 'Ayuda a filtrar vacantes por requisitos',
        status: basicComplete ? 'optional' : 'locked',
        progress: basicComplete ? 0.2 : 0,
        route: '/perfil/formacion',
        actionLabel: 'Agregar',
        icon: GraduationCap,
        level: 'recomendado',
      },
      {
        id: 'idiomas',
        title: 'Idiomas',
        summary: 'Nivel de dominio',
        why: 'Algunas empresas lo solicitan',
        status: basicComplete ? 'optional' : 'locked',
        progress: basicComplete ? 0.1 : 0,
        route: '/perfil/idiomas',
        actionLabel: 'Agregar',
        icon: Languages,
        level: 'opcional',
      },
      {
        id: 'documentos',
        title: 'Documentos',
        summary: 'CV, certificados',
        why: 'Algunas empresas lo exigen',
        status: basicComplete ? 'pending' : 'locked',
        progress: basicComplete ? 0.2 : 0,
        route: '/perfil/documentos',
        actionLabel: 'Subir',
        icon: FileText,
        level: 'opcional',
      },
    ]
  }, [])

  const progress = Math.round(
    (sections.reduce((acc, section) => acc + section.progress, 0) / sections.length) * 100
  )

  const nextRoute = useMemo(() => {
    const firstIncomplete = sections.find((section) =>
      ['incomplete', 'pending'].includes(section.status)
    )
    if (firstIncomplete) return firstIncomplete.route
    const firstOptional = sections.find((section) => section.status === 'optional')
    if (firstOptional) return firstOptional.route
    return sections[0]?.route ?? '/perfil/datos-basicos'
  }, [sections])

  const statusStyles = {
    incomplete: {
      label: 'Incompleto',
      border: 'border-slate-200',
      bg: 'bg-slate-50',
      badge: 'bg-slate-100 text-slate-700',
      icon: CircleX,
      iconColor: 'text-slate-500',
    },
    optional: {
      label: 'Opcional recomendado',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      badge: 'bg-amber-100 text-amber-700',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
    pending: {
      label: 'Pendiente',
      border: 'border-slate-200',
      bg: 'bg-slate-50',
      badge: 'bg-slate-100 text-slate-700',
      icon: CircleX,
      iconColor: 'text-slate-500',
    },
    complete: {
      label: 'Completo',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
    },
    locked: {
      label: 'Bloqueado',
      border: 'border-slate-200',
      bg: 'bg-white',
      badge: 'bg-slate-100 text-slate-600',
      icon: Lock,
      iconColor: 'text-slate-500',
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-10">
        <section className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="bg-white border border-border rounded-2xl p-6 w-full lg:w-1/3 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                CA
              </span>
              <div>
                <h1 className="font-heading text-xl font-semibold">Candidato Activo</h1>
                <p className="text-sm text-foreground/70">Perfil {progress}% completo</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-foreground/60">
                Completa tu perfil para postular sin restricciones.
              </p>
            </div>
            <button
              className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium"
              onClick={() => navigate(nextRoute)}
              type="button"
            >
              Completar perfil
            </button>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Si faltan datos de contacto o tu CV, igual puedes postular, pero veras avisos para
              completarlos.
            </div>

            <div className="rounded-xl border border-border bg-white p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Tu progreso</h2>
                <div className="mt-2 space-y-1 text-xs text-foreground/70">
                  <p>Perfil: {progress}% completo</p>
                  <p>Requerido para postular sin restricciones: Informacion basica</p>
                  <p>Siguiente paso recomendado: Preferencias laborales</p>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-semibold text-foreground">Tips rapidos</h3>
                <ul className="mt-2 space-y-2 text-xs text-foreground/70">
                  <li>Completar tu experiencia aumenta tus coincidencias.</li>
                  <li>Los perfiles con formacion reciben mas invitaciones.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {sections.map((section) => {
              const status = statusStyles[section.status]
              const StatusIcon = status.icon
              const SectionIcon = section.icon
              const isLocked = section.status === 'locked'
              return (
                <div
                  key={section.id}
                  className={`border rounded-xl p-5 ${status.border} ${status.bg}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <SectionIcon className="w-4 h-4 text-foreground/70" />
                        <h2 className="font-semibold text-lg">{section.title}</h2>
                      </div>
                      <p className="text-sm text-foreground/70">{section.summary}</p>
                      <p className="text-sm text-foreground/70">{section.why}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${status.badge}`}
                    >
                      <StatusIcon className={`h-3.5 w-3.5 ${status.iconColor}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-foreground/60">
                      Nivel: {section.level === 'basico' ? 'Obligatorio' : section.level}
                    </p>
                    <button
                      className={`text-sm font-medium ${isLocked ? 'text-slate-400' : 'text-primary'}`}
                      onClick={() => {
                        if (!isLocked) navigate(section.route)
                      }}
                      type="button"
                      disabled={isLocked}
                    >
                      {isLocked ? 'Completa lo basico' : section.actionLabel}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
