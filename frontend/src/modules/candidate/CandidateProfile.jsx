import {
  CheckCircle2,
  FileText,
  GraduationCap,
  Briefcase,
  MapPin,
  User,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'

export default function CandidateProfile() {
  const navigate = useNavigate()
  const sections = useMemo(() => {
    return [
      {
        id: 'datos-basicos',
        title: 'Informacion basica',
        summary: 'Documento, nombres y fecha de nacimiento',
        why: 'Sincronizado desde el sistema academico.',
        status: 'sync',
        progress: 1,
        route: '/perfil/datos-basicos',
        actionLabel: 'Ver detalle',
        icon: User,
        level: 'basico',
      },
      {
        id: 'datos-personales',
        title: 'Datos personales',
        summary: 'Contacto y domicilio',
        why: 'Sincronizado desde el sistema academico.',
        status: 'sync',
        progress: 1,
        route: '/perfil/datos-personales',
        actionLabel: 'Ver detalle',
        icon: MapPin,
        level: 'basico',
      },
      {
        id: 'experiencia',
        title: 'Experiencia',
        summary: 'Puestos, empresa, tiempo',
        why: 'Sincronizado desde el sistema academico.',
        status: 'sync',
        progress: 1,
        route: '/perfil/experiencia',
        actionLabel: 'Ver detalle',
        icon: Briefcase,
        level: 'recomendado',
      },
      {
        id: 'formacion',
        title: 'Formacion',
        summary: 'Nivel, institucion, estado',
        why: 'Sincronizado desde el sistema academico.',
        status: 'sync',
        progress: 1,
        route: '/perfil/formacion',
        actionLabel: 'Ver detalle',
        icon: GraduationCap,
        level: 'recomendado',
      },
      {
        id: 'documentos',
        title: 'Documentos',
        summary: 'CV, certificados',
        why: 'Sincronizado desde el sistema academico.',
        status: 'sync',
        progress: 1,
        route: '/perfil/documentos',
        actionLabel: 'Ver detalle',
        icon: FileText,
        level: 'opcional',
      },
    ]
  }, [])

  const progress = Math.round(
    (sections.reduce((acc, section) => acc + section.progress, 0) / sections.length) * 100
  )

  const nextRoute = useMemo(() => {
    return sections[0]?.route ?? '/perfil/datos-basicos'
  }, [sections])

  const statusStyles = {
    sync: {
      label: 'Sincronizado',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
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
                Datos y documentos sincronizados desde el sistema academico.
              </p>
            </div>
            <button
              className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium"
              onClick={() => navigate(nextRoute)}
              type="button"
            >
              Ver informacion sincronizada
            </button>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Si identificas algun dato incorrecto, solicita actualizacion al area administrativa.
            </div>

            <div className="rounded-xl border border-border bg-white p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Tu progreso</h2>
                <div className="mt-2 space-y-1 text-xs text-foreground/70">
                  <p>Perfil: {progress}% completo</p>
                  <p>Estado del perfil: sincronizado desde origen academico</p>
                  <p>Siguiente paso recomendado: revisar experiencia y formacion</p>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-semibold text-foreground">Tips rapidos</h3>
                <ul className="mt-2 space-y-2 text-xs text-foreground/70">
                  <li>Revisa tu experiencia y valida fechas de formacion.</li>
                  <li>Confirma que tus documentos esten vigentes.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {sections.map((section) => {
              const status = statusStyles[section.status]
              const StatusIcon = status.icon
              const SectionIcon = section.icon
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
                      className="text-sm font-medium text-primary"
                      onClick={() => navigate(section.route)}
                      type="button"
                    >
                      {section.actionLabel}
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
