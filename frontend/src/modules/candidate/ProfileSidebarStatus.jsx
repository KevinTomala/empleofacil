import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { getPerfilErrorMessage, requestMyCandidateVerification } from '../../services/perfilCandidato.api'
import { showToast } from '../../utils/showToast'
import {
  buildProfileSections,
  getProfileProgressMetrics
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

const ACCOUNT_VERIFICATION_STATUS = {
  pendiente: { label: 'Pendiente', badgeClassName: 'bg-amber-100 text-amber-700 border-amber-200' },
  en_revision: { label: 'En revision', badgeClassName: 'bg-blue-100 text-blue-700 border-blue-200' },
  aprobada: { label: 'Verificada', badgeClassName: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rechazada: { label: 'Rechazada', badgeClassName: 'bg-rose-100 text-rose-700 border-rose-200' },
  suspendida: { label: 'Suspendida', badgeClassName: 'bg-rose-100 text-rose-700 border-rose-200' },
  vencida: { label: 'Vencida', badgeClassName: 'bg-slate-200 text-slate-700 border-slate-300' },
}

const DOCUMENT_STATUS_UI = {
  no_cargada: { label: 'No cargada', className: 'text-slate-700' },
  incompleta: { label: 'Incompleta', className: 'text-amber-700' },
  pendiente: { label: 'En revision', className: 'text-blue-700' },
  aprobado: { label: 'Verificada', className: 'text-emerald-700' },
  rechazado: { label: 'Rechazada', className: 'text-rose-700' },
  vencido: { label: 'Vencida', className: 'text-slate-700' },
}

function toTimestamp(value) {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function pickLatestDocument(items = []) {
  if (!Array.isArray(items) || !items.length) return null
  return [...items].sort((a, b) => {
    const aTime = Math.max(toTimestamp(a?.updated_at), toTimestamp(a?.created_at))
    const bTime = Math.max(toTimestamp(b?.updated_at), toTimestamp(b?.created_at))
    return bTime - aTime
  })[0] || null
}

function normalizeDocStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  if (['pendiente', 'aprobado', 'rechazado', 'vencido'].includes(status)) return status
  return 'no_cargada'
}

function getCedulaStatus(documentos = []) {
  const anverso = pickLatestDocument(
    documentos.filter((item) => item?.tipo_documento === 'documento_identidad' && item?.lado_documento === 'anverso')
  )
  const reverso = pickLatestDocument(
    documentos.filter((item) => item?.tipo_documento === 'documento_identidad' && item?.lado_documento === 'reverso')
  )

  if (!anverso && !reverso) return DOCUMENT_STATUS_UI.no_cargada

  const statuses = [normalizeDocStatus(anverso?.estado), normalizeDocStatus(reverso?.estado)].filter(
    (status) => status !== 'no_cargada'
  )

  if (statuses.includes('rechazado')) return DOCUMENT_STATUS_UI.rechazado
  if (statuses.includes('vencido')) return DOCUMENT_STATUS_UI.vencido

  const hasBothSides = Boolean(anverso && reverso)
  if (!hasBothSides) return DOCUMENT_STATUS_UI.incompleta

  if (statuses.every((status) => status === 'aprobado')) return DOCUMENT_STATUS_UI.aprobado
  if (statuses.includes('pendiente')) return DOCUMENT_STATUS_UI.pendiente

  return DOCUMENT_STATUS_UI.incompleta
}

function getLicenciaStatus(documentos = []) {
  const licencia = pickLatestDocument(
    documentos.filter((item) => item?.tipo_documento === 'licencia_conducir')
  )
  if (!licencia) return DOCUMENT_STATUS_UI.no_cargada

  const status = normalizeDocStatus(licencia?.estado)
  return DOCUMENT_STATUS_UI[status] || DOCUMENT_STATUS_UI.no_cargada
}

export default function ProfileSidebarStatus({
  perfil,
  verification,
  loading,
  error,
  currentTab,
  isSectionComplete = false,
  contextAlerts = [],
  lastSavedText = 'Tus cambios se guardan al presionar Guardar.'
}) {
  const [verificationState, setVerificationState] = useState(verification || null)
  const [requestingVerification, setRequestingVerification] = useState(false)

  useEffect(() => {
    setVerificationState(verification || null)
  }, [verification])

  const sections = buildProfileSections(perfil)
  const {
    requiredSections,
    recommendedSections,
    phase2Sections,
    progressFase1,
    pendingRequired,
    pendingRecommended
  } = getProfileProgressMetrics(sections)

  const documentos = Array.isArray(perfil?.documentos) ? perfil.documentos : []
  const cedulaStatus = getCedulaStatus(documentos)
  const licenciaStatus = getLicenciaStatus(documentos)
  const accountStateRaw = String(verificationState?.estado || 'pendiente').trim().toLowerCase()
  const accountStatus = ACCOUNT_VERIFICATION_STATUS[accountStateRaw] || ACCOUNT_VERIFICATION_STATUS.pendiente
  const shouldForceRejectedDocs = accountStateRaw === 'rechazada'
  const hasCedulaDoc = documentos.some((item) => item?.tipo_documento === 'documento_identidad')
  const hasLicenciaDoc = documentos.some((item) => item?.tipo_documento === 'licencia_conducir')
  const cedulaStatusUi = shouldForceRejectedDocs && hasCedulaDoc ? DOCUMENT_STATUS_UI.rechazado : cedulaStatus
  const licenciaStatusUi = shouldForceRejectedDocs && hasLicenciaDoc ? DOCUMENT_STATUS_UI.rechazado : licenciaStatus
  const hasSupportDoc = hasCedulaDoc || hasLicenciaDoc
  const isPendingRequested = accountStateRaw === 'pendiente' && Boolean(verificationState?.has_solicitud)
  const canRequestVerificationByStatus =
    accountStateRaw === 'rechazada'
    || accountStateRaw === 'vencida'
    || (accountStateRaw === 'pendiente' && !isPendingRequested)
  const currentSection = sections.find((section) => section.route === currentTab)

  const recommendationText =
    pendingRequired > 0
      ? 'Completa las secciones obligatorias para postular sin bloqueos.'
      : pendingRecommended > 0
      ? 'Agrega secciones recomendadas para mejorar tu coincidencia.'
      : 'Tu perfil base ya esta completo. Puedes avanzar a fase 2.'

  const isFase1Complete = progressFase1 === 100

  const handleRequestVerification = async () => {
    if (!hasSupportDoc || requestingVerification || !canRequestVerificationByStatus) return

    try {
      setRequestingVerification(true)
      const response = await requestMyCandidateVerification()
      setVerificationState(response?.verificacion || null)
      showToast({ type: 'success', message: 'Solicitud de verificacion enviada.' })
    } catch (requestError) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(requestError, 'No se pudo solicitar la verificacion.')
      })
    } finally {
      setRequestingVerification(false)
    }
  }

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

      <div className="rounded-xl border border-border bg-white p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">Verificacion de Cuenta</p>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${accountStatus.badgeClassName}`}>
            {accountStatus.label}
          </span>
        </div>
        <p className={`text-xs ${cedulaStatusUi.className}`}>
          Cedula: {cedulaStatusUi.label}
        </p>
        <p className={`text-xs ${licenciaStatusUi.className}`}>
          Licencia: {licenciaStatusUi.label}
        </p>
        {hasSupportDoc ? (
          <button
            type="button"
            className="mt-1 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            onClick={handleRequestVerification}
            disabled={requestingVerification || loading || !canRequestVerificationByStatus}
          >
            {requestingVerification
              ? 'Solicitando...'
              : accountStateRaw === 'aprobada'
              ? 'Cuenta verificada'
              : accountStateRaw === 'en_revision' || isPendingRequested
              ? 'Revision solicitada'
              : 'Solicitar revision'}
          </button>
        ) : null}
      </div>

      <p className="text-xs text-foreground/65">
        {isFase1Complete ? 'Perfil base completo. Puedes avanzar a Fase 2.' : recommendationText}
      </p>
      <p className="text-xs text-foreground/60">{lastSavedText}</p>
    </div>
  )
}
