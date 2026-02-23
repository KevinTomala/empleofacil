import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import {
  getCompanyPerfilErrorMessage,
  getMyCompanyReactivationRequest,
  requestMyCompanyReactivation,
} from '../../services/companyPerfil.api'
import { showToast } from '../../utils/showToast'
import './company.css'

const MOTIVOS_REACTIVACION = [
  { value: 'nuevas_vacantes', label: 'Ahora tengo nuevas vacantes' },
  { value: 'mejor_experiencia', label: 'Quiero intentar nuevamente' },
  { value: 'continuar_procesos', label: 'Necesito continuar procesos pendientes' },
  { value: 'resolver_problemas', label: 'Ya resolvi los problemas anteriores' },
  { value: 'otro', label: 'Otro motivo' },
]

const REACTIVATION_REASON_LABELS = MOTIVOS_REACTIVACION.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const DEACTIVATION_REASON_LABELS = {
  sin_vacantes: 'Sin vacantes por ahora',
  poca_calidad_candidatos: 'No encontraba perfiles adecuados',
  costo_alto: 'Costo alto',
  pausa_temporal: 'Pausa temporal',
  problema_tecnico: 'Problemas tecnicos',
  otro: 'Otro',
}

function formatReasonList(codes, labelMap) {
  const values = Array.isArray(codes) ? codes : []
  if (!values.length) return 'No disponible'
  return values.map((code) => labelMap[String(code || '').trim()] || String(code || '').trim()).join(', ')
}

export default function CompanyAccountInactive() {
  const navigate = useNavigate()
  const { logout, refreshCompanyAccess } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [endpointUnavailable, setEndpointUnavailable] = useState(false)
  const [solicitud, setSolicitud] = useState(null)
  const [desactivacion, setDesactivacion] = useState(null)
  const [form, setForm] = useState({
    motivos_codigos: [],
    motivo_detalle: '',
    requiere_soporte: true,
  })

  const hasSubmittedRequest = Boolean(solicitud?.id)

  async function loadMyRequest() {
    try {
      setLoading(true)
      const hasAccess = await refreshCompanyAccess()
      if (hasAccess) {
        navigate('/app/company', { replace: true })
        return
      }

      const response = await getMyCompanyReactivationRequest()
      setEndpointUnavailable(false)
      setSolicitud(response?.solicitud || null)
      setDesactivacion(response?.desactivacion || null)
    } catch (error) {
      const code = String(error?.payload?.error || '')
      if (code === 'EMPRESA_NOT_FOUND') {
        setSolicitud(null)
        setDesactivacion(null)
        return
      }
      if (code === 'REACTIVATION_ENDPOINT_NOT_FOUND') {
        setEndpointUnavailable(true)
        setSolicitud(null)
        setDesactivacion(null)
        return
      }
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo cargar el estado de reactivacion.'),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyRequest()
  }, [])

  const toggleReactivationReason = (value) => {
    setForm((prev) => {
      const current = Array.isArray(prev.motivos_codigos) ? prev.motivos_codigos : []
      const exists = current.includes(value)
      const next = exists ? current.filter((item) => item !== value) : [...current, value]
      if (value === 'otro' && exists) {
        return { ...prev, motivos_codigos: next, motivo_detalle: '' }
      }
      return { ...prev, motivos_codigos: next }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (sending || hasSubmittedRequest || endpointUnavailable) return

    const motivosCodigos = Array.isArray(form.motivos_codigos) ? form.motivos_codigos.filter(Boolean) : []
    if (!motivosCodigos.length) {
      showToast({ type: 'warning', message: 'Selecciona al menos un motivo para solicitar la reactivacion.' })
      return
    }

    const motivoDetalle = String(form.motivo_detalle || '').trim() || null
    if (motivosCodigos.includes('otro') && !motivoDetalle) {
      showToast({ type: 'warning', message: 'Si seleccionas "otro", debes explicarlo.' })
      return
    }

    const payload = {
      motivos_codigos: motivosCodigos,
      motivo_detalle: motivoDetalle,
      acciones_realizadas: null,
      requiere_soporte: Boolean(form.requiere_soporte),
    }

    try {
      setSending(true)
      const response = await requestMyCompanyReactivation(payload)
      setEndpointUnavailable(false)
      setSolicitud(response?.solicitud || null)
      showToast({ type: 'success', message: 'Solicitud de reactivacion enviada para revision.' })
    } catch (error) {
      const code = String(error?.payload?.error || '')
      if (code === 'REACTIVATION_ENDPOINT_NOT_FOUND') {
        setEndpointUnavailable(true)
      }
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo enviar la solicitud de reactivacion.'),
      })
    } finally {
      setSending(false)
    }
  }

  const lastDeactivationLabel = formatReasonList(
    desactivacion?.motivos_codigos || (desactivacion?.motivo_codigo ? [desactivacion?.motivo_codigo] : []),
    DEACTIVATION_REASON_LABELS
  )
  const solicitudEstado = String(solicitud?.estado || '').trim()
  const solicitudBadge = solicitudEstado === 'aprobada'
    ? 'bg-emerald-100 text-emerald-700'
    : solicitudEstado === 'rechazada'
      ? 'bg-rose-100 text-rose-700'
      : solicitudEstado === 'en_revision'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700'
  const isFormLocked = sending

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-24 pb-16">
        <section className="company-card max-w-3xl mx-auto p-6 sm:p-8 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4" />
            Cuenta empresa inactiva
          </div>

          <div className="space-y-2">
            <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
              Tu cuenta fue desactivada
            </h1>
            <p className="text-sm text-foreground/70">
              Los modulos de empresa no estan disponibles hasta que un administrador del sistema reactive tu cuenta.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-foreground/70">Cargando estado de reactivacion...</p>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-white p-4 space-y-2">
                <p className="text-sm font-semibold">Antes de desactivar</p>
                <p className="text-xs text-foreground/70">Ultimo motivo registrado: {lastDeactivationLabel}</p>
                {desactivacion?.motivo_detalle ? (
                  <p className="text-xs text-foreground/60">Detalle: {desactivacion.motivo_detalle}</p>
                ) : null}
              </div>

              {hasSubmittedRequest ? (
                <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Revision solicitada</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${solicitudBadge}`}>
                      {solicitudEstado || 'pendiente'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/70">
                    Tu solicitud ya fue enviada a administracion. Te notificaremos cuando sea revisada.
                  </p>
                  {solicitud?.comentario_admin ? (
                    <p className="text-xs text-foreground/60">Comentario admin: {solicitud.comentario_admin}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/"
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-semibold"
                    >
                      Ir al inicio
                    </Link>
                  </div>
                </div>
              ) : endpointUnavailable ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-rose-700">No se pudo cargar la encuesta de reactivacion</p>
                  <p className="text-xs text-rose-700">
                    Actualiza o reinicia el backend para habilitar esta ruta.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-rose-300 text-sm font-semibold text-rose-700"
                      onClick={loadMyRequest}
                      disabled={loading || sending}
                    >
                      Reintentar
                    </button>
                    <Link
                      to="/"
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-semibold"
                    >
                      Ir al inicio
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="rounded-xl border border-border bg-white p-4 space-y-3" onSubmit={handleSubmit}>
                  <p className="text-sm font-semibold">Despues de desactivar: solicitar revision</p>
                  <p className="text-xs text-foreground/70">
                    Completa esta encuesta para que administracion revise y reactive tu cuenta.
                  </p>

                  <label className="space-y-1 text-xs block">
                    <span className="font-semibold text-foreground/80">Motivos para volver (seleccion multiple, obligatorio)</span>
                    <div className="grid sm:grid-cols-2 gap-2 rounded-lg border border-border bg-white p-2">
                      {MOTIVOS_REACTIVACION.map((item) => (
                        <label key={item.value} className="inline-flex items-center gap-2 text-xs text-foreground">
                          <input
                            type="checkbox"
                            checked={form.motivos_codigos.includes(item.value)}
                            onChange={() => toggleReactivationReason(item.value)}
                            disabled={isFormLocked}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </label>

                  {form.motivos_codigos.includes('otro') ? (
                    <label className="space-y-1 text-xs block">
                      <span className="font-semibold text-foreground/80">Otro motivo (obligatorio)</span>
                      <input
                        className="w-full border border-border rounded-lg px-3 py-2 bg-white"
                        type="text"
                        placeholder="Escribe aqui tu otro motivo"
                        value={form.motivo_detalle}
                        onChange={(event) => setForm((prev) => ({ ...prev, motivo_detalle: event.target.value }))}
                        disabled={isFormLocked}
                        maxLength={1000}
                      />
                    </label>
                  ) : null}

                  <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                    <input
                      type="checkbox"
                      checked={form.requiere_soporte}
                      onChange={(event) => setForm((prev) => ({ ...prev, requiere_soporte: event.target.checked }))}
                      disabled={isFormLocked}
                    />
                    Necesito ayuda de soporte para reactivar correctamente.
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                      disabled={isFormLocked}
                    >
                      <RefreshCw className="w-4 h-4" />
                      {sending ? 'Enviando...' : 'Solicitar revision'}
                    </button>
                    <Link
                      to="/"
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-semibold"
                    >
                      Ir al inicio
                    </Link>
                  </div>
                </form>
              )}
            </>
          )}

          <button
            type="button"
            onClick={logout}
            className="text-sm text-foreground/70 underline underline-offset-2"
          >
            Cerrar sesion
          </button>
        </section>
      </main>
    </div>
  )
}
