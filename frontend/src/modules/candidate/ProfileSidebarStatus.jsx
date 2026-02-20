import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import {
  buildProfileSections,
  getProfileProgressMetrics,
  getProfileVerificationMetrics
} from './profileSections'

const statusStyles = {
  complete: {
    label: 'Completo',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500'
  },
  pending: {
    label: 'Pendiente',
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertCircle,
    iconColor: 'text-amber-500'
  },
  pending_phase2: {
    label: 'Fase 2',
    badge: 'bg-slate-200 text-slate-700',
    icon: Lock,
    iconColor: 'text-slate-500'
  }
}

function verificationLabel(value) {
  return value ? 'Verificado' : 'Pendiente'
}

function verificationClass(value) {
  return value ? 'text-emerald-700' : 'text-amber-700'
}

export default function ProfileSidebarStatus({
  perfil,
  loading,
  error,
  currentTab,
  isSectionComplete = false,
  contextAlerts = [],
  lastSavedText = 'Tus cambios se guardan al presionar Guardar.'
}) {
  const sections = buildProfileSections(perfil)
  const {
    requiredSections,
    recommendedSections,
    phase2Sections,
    progressFase1,
    pendingRequired,
    pendingRecommended
  } = getProfileProgressMetrics(sections)

  const checks = getProfileVerificationMetrics(perfil)
  const currentSection = sections.find((section) => section.route === currentTab)

  const recommendationText =
    pendingRequired > 0
      ? 'Completa las secciones obligatorias para postular sin bloqueos.'
      : pendingRecommended > 0
      ? 'Agrega secciones recomendadas para mejorar tu coincidencia.'
      : 'Tu perfil base ya esta completo. Puedes avanzar a fase 2.'

  const isFase1Complete = progressFase1 === 100

  return (
    <div className="rounded-2xl border border-border bg-white p-3 space-y-3">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Estado del perfil</h2>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progressFase1}%` }} />
        </div>
        <p className="text-xs text-foreground/70">Perfil fase 1: {progressFase1}% completo</p>
        {currentSection && (
          <p className="text-xs text-foreground/60">
            Seccion actual: {currentSection.title}
            {isSectionComplete ? ' (completa)' : ''}
          </p>
        )}
      </div>

      {loading && <p className="text-xs text-foreground/60">Cargando estado del perfil...</p>}
      {!loading && error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {!isFase1Complete && (
        <div className="rounded-xl border border-border bg-slate-50/70 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Para postular necesitas</p>
          {pendingRequired > 0 ? (
            requiredSections
              .filter((section) => section.status !== 'complete')
              .map((section) => (
                <p key={section.id} className="text-xs text-foreground/75">- {section.title}</p>
              ))
          ) : (
            <p className="text-xs text-emerald-700">- Requisitos obligatorios completos</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Checklist de secciones</p>
        <div className="space-y-1.5">
          {[...requiredSections, ...recommendedSections, ...phase2Sections].map((section) => {
            const style = statusStyles[section.status]
            const StatusIcon = style.icon
            const isCurrent = section.route === currentTab
            return (
              <div
                key={section.id}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${
                  isCurrent ? 'bg-primary/10 border border-primary/20 border-l-2 border-l-primary' : ''
                }`}
              >
                <p className="text-xs text-foreground/80">{section.title}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>
                  <StatusIcon className={`h-3 w-3 ${style.iconColor}`} />
                  {isCurrent ? 'Actual' : style.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {contextAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800">Alertas de edicion</p>
          {contextAlerts.map((alert) => (
            <p key={alert} className="text-xs text-amber-700">- {alert}</p>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-3 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Seguridad y verificacion</p>
        <p className={`text-xs ${verificationClass(checks.hasDocument)}`}>
          Documento: {verificationLabel(checks.hasDocument)}
        </p>
        <p className={`text-xs ${verificationClass(checks.hasEmail)}`}>
          Email: {verificationLabel(checks.hasEmail)}
        </p>
        <p className={`text-xs ${verificationClass(checks.hasPhone)}`}>
          Telefono: {verificationLabel(checks.hasPhone)}
        </p>
      </div>

      <p className="text-xs text-foreground/65">
        {isFase1Complete ? 'Perfil base completo. Puedes avanzar a Fase 2.' : recommendationText}
      </p>
      <p className="text-xs text-foreground/60">{lastSavedText}</p>
    </div>
  )
}
