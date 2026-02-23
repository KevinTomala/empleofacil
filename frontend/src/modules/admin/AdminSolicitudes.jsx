import { useEffect, useMemo, useState } from 'react'
import './admin.css'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react'
import Header from '../../components/Header'
import { showToast } from '../../utils/showToast'
import {
  getVerificationErrorMessage,
  listCompanyReactivationRequests,
  listVerificationAccounts,
  updateCompanyReactivationStatus,
  updateVerificationStatus,
} from '../../services/verificaciones.api'

const TAB_VERIFICACION_EMPRESAS = 'verificacion_empresas'
const TAB_REACTIVACION_EMPRESAS = 'reactivacion_empresas'
const TAB_SOLICITUDES_CANDIDATOS = 'solicitudes_candidatos'
const VALID_TAB_IDS = [TAB_VERIFICACION_EMPRESAS, TAB_REACTIVACION_EMPRESAS, TAB_SOLICITUDES_CANDIDATOS]

const STATUS_STYLES = {
  pendiente: 'bg-amber-100 text-amber-700',
  en_revision: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-rose-100 text-rose-700',
  suspendida: 'bg-rose-100 text-rose-700',
  vencida: 'bg-slate-200 text-slate-700',
}

const REACTIVATION_REASON_LABELS = {
  nuevas_vacantes: 'Nuevas vacantes',
  mejor_experiencia: 'Mejor experiencia esperada',
  continuar_procesos: 'Continuar procesos pendientes',
  resolver_problemas: 'Problemas resueltos',
  otro: 'Otro motivo',
}

const DEACTIVATION_REASON_LABELS = {
  sin_vacantes: 'Sin vacantes',
  poca_calidad_candidatos: 'Poca calidad de candidatos',
  costo_alto: 'Costo alto',
  pausa_temporal: 'Pausa temporal',
  problema_tecnico: 'Problemas tecnicos',
  otro: 'Otro motivo',
}

const EMPTY_META = { page: 1, pageSize: 20, total: 0 }

function formatStatus(status) {
  const labelByStatus = {
    pendiente: 'Pendiente',
    en_revision: 'En revision',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    suspendida: 'Suspendida',
    vencida: 'Vencida',
  }
  return labelByStatus[String(status || '').trim()] || 'Pendiente'
}

function formatDateShort(value) {
  if (!value) return 'N/A'
  return String(value).slice(0, 10)
}

function formatReasonList(codes, labels) {
  const values = Array.isArray(codes) ? codes.filter(Boolean) : []
  if (!values.length) return 'No definido'
  return values.map((code) => labels[String(code || '').trim()] || String(code || '').trim()).join(', ')
}

function getVisibleRange(meta) {
  const total = Number(meta?.total || 0)
  const page = Number(meta?.page || 1)
  const pageSize = Number(meta?.pageSize || 20)
  if (!total) return { from: 0, to: 0, totalPages: 1 }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  return { from, to, totalPages }
}

function resolveTabFromHash() {
  if (typeof window === 'undefined') return TAB_VERIFICACION_EMPRESAS
  const raw = String(window.location.hash || '').replace('#', '').trim()
  return VALID_TAB_IDS.includes(raw) ? raw : TAB_VERIFICACION_EMPRESAS
}

export default function AdminSolicitudes() {
  const [tab, setTab] = useState(() => resolveTabFromHash())
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [estadoVerificacionEmpresas, setEstadoVerificacionEmpresas] = useState('')
  const [estadoReactivaciones, setEstadoReactivaciones] = useState('')
  const [estadoCandidatos, setEstadoCandidatos] = useState('')

  const [loadingVerificacionEmpresas, setLoadingVerificacionEmpresas] = useState(true)
  const [loadingReactivaciones, setLoadingReactivaciones] = useState(false)
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)

  const [updatingVerificacionId, setUpdatingVerificacionId] = useState(null)
  const [updatingReactivacionId, setUpdatingReactivacionId] = useState(null)

  const [verificacionEmpresas, setVerificacionEmpresas] = useState([])
  const [reactivaciones, setReactivaciones] = useState([])
  const [solicitudesCandidatos, setSolicitudesCandidatos] = useState([])

  const [metaVerificacionEmpresas, setMetaVerificacionEmpresas] = useState(EMPTY_META)
  const [metaReactivaciones, setMetaReactivaciones] = useState(EMPTY_META)
  const [metaCandidatos, setMetaCandidatos] = useState(EMPTY_META)

  const tabs = useMemo(
    () => [
      { id: TAB_VERIFICACION_EMPRESAS, label: 'Verificacion empresas', count: metaVerificacionEmpresas.total },
      { id: TAB_REACTIVACION_EMPRESAS, label: 'Reactivacion empresas', count: metaReactivaciones.total },
      { id: TAB_SOLICITUDES_CANDIDATOS, label: 'Solicitudes candidatos', count: metaCandidatos.total },
    ],
    [metaVerificacionEmpresas.total, metaReactivaciones.total, metaCandidatos.total]
  )

  const currentMeta = useMemo(() => {
    if (tab === TAB_VERIFICACION_EMPRESAS) return metaVerificacionEmpresas
    if (tab === TAB_REACTIVACION_EMPRESAS) return metaReactivaciones
    return metaCandidatos
  }, [tab, metaVerificacionEmpresas, metaReactivaciones, metaCandidatos])

  const currentRange = useMemo(() => getVisibleRange(currentMeta), [currentMeta])

  const isCurrentTabLoading =
    (tab === TAB_VERIFICACION_EMPRESAS && loadingVerificacionEmpresas) ||
    (tab === TAB_REACTIVACION_EMPRESAS && loadingReactivaciones) ||
    (tab === TAB_SOLICITUDES_CANDIDATOS && loadingCandidatos)

  function setCurrentPage(nextPage) {
    const page = Math.max(Number(nextPage) || 1, 1)
    if (tab === TAB_VERIFICACION_EMPRESAS) {
      setMetaVerificacionEmpresas((prev) => ({ ...prev, page }))
      return
    }
    if (tab === TAB_REACTIVACION_EMPRESAS) {
      setMetaReactivaciones((prev) => ({ ...prev, page }))
      return
    }
    setMetaCandidatos((prev) => ({ ...prev, page }))
  }

  function setCurrentPageSize(nextPageSize) {
    const pageSize = Number(nextPageSize) || 20
    if (tab === TAB_VERIFICACION_EMPRESAS) {
      setMetaVerificacionEmpresas((prev) => ({ ...prev, pageSize, page: 1 }))
      return
    }
    if (tab === TAB_REACTIVACION_EMPRESAS) {
      setMetaReactivaciones((prev) => ({ ...prev, pageSize, page: 1 }))
      return
    }
    setMetaCandidatos((prev) => ({ ...prev, pageSize, page: 1 }))
  }

  async function loadVerificacionEmpresas() {
    try {
      setLoadingVerificacionEmpresas(true)
      const data = await listVerificationAccounts({
        tipo: 'empresa',
        estado: estadoVerificacionEmpresas || undefined,
        q: searchQuery || undefined,
        page: metaVerificacionEmpresas.page,
        page_size: metaVerificacionEmpresas.pageSize,
      })
      setVerificacionEmpresas(Array.isArray(data?.items) ? data.items : [])
      setMetaVerificacionEmpresas((prev) => ({ ...prev, total: Number(data?.total || 0) }))
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudieron cargar solicitudes de verificacion de empresas.'),
      })
    } finally {
      setLoadingVerificacionEmpresas(false)
    }
  }

  async function loadReactivaciones() {
    try {
      setLoadingReactivaciones(true)
      const data = await listCompanyReactivationRequests({
        estado: estadoReactivaciones || undefined,
        q: searchQuery || undefined,
        page: metaReactivaciones.page,
        page_size: metaReactivaciones.pageSize,
      })
      setReactivaciones(Array.isArray(data?.items) ? data.items : [])
      setMetaReactivaciones((prev) => ({ ...prev, total: Number(data?.meta?.total || 0) }))
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudieron cargar solicitudes de reactivacion.'),
      })
    } finally {
      setLoadingReactivaciones(false)
    }
  }

  async function loadSolicitudesCandidatos() {
    try {
      setLoadingCandidatos(true)
      const data = await listVerificationAccounts({
        tipo: 'candidato',
        estado: estadoCandidatos || undefined,
        q: searchQuery || undefined,
        page: metaCandidatos.page,
        page_size: metaCandidatos.pageSize,
      })
      setSolicitudesCandidatos(Array.isArray(data?.items) ? data.items : [])
      setMetaCandidatos((prev) => ({ ...prev, total: Number(data?.total || 0) }))
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudieron cargar solicitudes de candidatos.'),
      })
    } finally {
      setLoadingCandidatos(false)
    }
  }

  const refreshCurrentTab = async () => {
    if (tab === TAB_VERIFICACION_EMPRESAS) {
      await loadVerificacionEmpresas()
      return
    }
    if (tab === TAB_REACTIVACION_EMPRESAS) {
      await loadReactivaciones()
      return
    }
    await loadSolicitudesCandidatos()
  }

  useEffect(() => {
    const applyHashTab = () => {
      const nextTab = resolveTabFromHash()
      setTab((prev) => (prev === nextTab ? prev : nextTab))
    }

    applyHashTab()
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', applyHashTab)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', applyHashTab)
      }
    }
  }, [])

  useEffect(() => {
    if (tab !== TAB_VERIFICACION_EMPRESAS) return
    loadVerificacionEmpresas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, estadoVerificacionEmpresas, searchQuery, metaVerificacionEmpresas.page, metaVerificacionEmpresas.pageSize])

  useEffect(() => {
    if (tab !== TAB_REACTIVACION_EMPRESAS) return
    loadReactivaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, estadoReactivaciones, searchQuery, metaReactivaciones.page, metaReactivaciones.pageSize])

  useEffect(() => {
    if (tab !== TAB_SOLICITUDES_CANDIDATOS) return
    loadSolicitudesCandidatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, estadoCandidatos, searchQuery, metaCandidatos.page, metaCandidatos.pageSize])

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    const nextQuery = searchInput.trim()
    const sameQuery = nextQuery === searchQuery
    const samePage = Number(currentMeta.page || 1) === 1
    setCurrentPage(1)
    setSearchQuery(nextQuery)
    if (sameQuery && samePage) {
      await refreshCurrentTab()
    }
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setEstadoVerificacionEmpresas('')
    setEstadoReactivaciones('')
    setEstadoCandidatos('')
    setMetaVerificacionEmpresas((prev) => ({ ...prev, page: 1, pageSize: 20 }))
    setMetaReactivaciones((prev) => ({ ...prev, page: 1, pageSize: 20 }))
    setMetaCandidatos((prev) => ({ ...prev, page: 1, pageSize: 20 }))
  }

  const handleUpdateVerificationStatus = async (item, estado) => {
    if (!item?.id || updatingVerificacionId) return

    const payload = { estado }
    if (estado === 'aprobada') {
      payload.nivel = 'completo'
      payload.comentario = 'Cuenta aprobada desde bandeja de solicitudes.'
    }
    if (estado === 'en_revision') {
      payload.comentario = 'Cuenta enviada a revision.'
    }
    if (estado === 'rechazada') {
      const motivo = window.prompt('Motivo de rechazo:')
      if (!motivo || !motivo.trim()) return
      payload.motivo_rechazo = motivo.trim()
      payload.comentario = 'Cuenta rechazada desde bandeja de solicitudes.'
    }

    try {
      setUpdatingVerificacionId(item.id)
      await updateVerificationStatus(item.id, payload)
      showToast({ type: 'success', message: `Estado actualizado a ${formatStatus(estado)}.` })
      await refreshCurrentTab()
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudo actualizar la solicitud.'),
      })
    } finally {
      setUpdatingVerificacionId(null)
    }
  }

  const handleUpdateReactivationStatus = async (item, estado) => {
    if (!item?.id || updatingReactivacionId) return

    const payload = { estado }
    if (estado === 'rechazada') {
      const comentario = window.prompt('Comentario de rechazo para la solicitud de reactivacion:')
      if (!comentario || !comentario.trim()) return
      payload.comentario_admin = comentario.trim()
    }
    if (estado === 'aprobada') {
      payload.comentario_admin = 'Reactivacion aprobada desde bandeja de solicitudes.'
    }
    if (estado === 'en_revision') {
      payload.comentario_admin = 'Solicitud en revision por administracion.'
    }

    try {
      setUpdatingReactivacionId(item.id)
      await updateCompanyReactivationStatus(item.id, payload)
      showToast({ type: 'success', message: `Reactivacion actualizada a ${formatStatus(estado)}.` })
      await refreshCurrentTab()
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudo actualizar la reactivacion.'),
      })
    } finally {
      setUpdatingReactivacionId(null)
    }
  }

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <BadgeCheck className="w-4 h-4" /> Bandeja operativa
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">Solicitudes</h1>
              <p className="text-sm text-foreground/70 max-w-2xl">
                Gestiona solicitudes que requieren accion inmediata con filtros y paginacion para alto volumen.
              </p>
            </div>
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium inline-flex items-center gap-2"
              type="button"
              onClick={refreshCurrentTab}
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar tab actual
            </button>
          </div>
        </section>

        <section className="admin-card p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id)
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', `${window.location.pathname}#${item.id}`)
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                    tab === item.id
                      ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground/70 border-border hover:border-primary/40'
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros
            </div>
            <button className="text-sm text-primary font-semibold" type="button" onClick={handleClearFilters}>
              Limpiar filtros
            </button>
          </div>

          <form className="grid lg:grid-cols-[1.3fr_1fr] gap-3" onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60 bg-white">
              <Search className="w-4 h-4" />
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar por nombre, email o documento"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tab === TAB_VERIFICACION_EMPRESAS ? (
                <select
                  className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                  value={estadoVerificacionEmpresas}
                  onChange={(event) => {
                    setEstadoVerificacionEmpresas(event.target.value)
                    setMetaVerificacionEmpresas((prev) => ({ ...prev, page: 1 }))
                  }}
                >
                  <option value="">Estado: todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_revision">En revision</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="suspendida">Suspendida</option>
                  <option value="vencida">Vencida</option>
                </select>
              ) : null}
              {tab === TAB_REACTIVACION_EMPRESAS ? (
                <select
                  className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                  value={estadoReactivaciones}
                  onChange={(event) => {
                    setEstadoReactivaciones(event.target.value)
                    setMetaReactivaciones((prev) => ({ ...prev, page: 1 }))
                  }}
                >
                  <option value="">Estado: todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_revision">En revision</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              ) : null}
              {tab === TAB_SOLICITUDES_CANDIDATOS ? (
                <select
                  className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                  value={estadoCandidatos}
                  onChange={(event) => {
                    setEstadoCandidatos(event.target.value)
                    setMetaCandidatos((prev) => ({ ...prev, page: 1 }))
                  }}
                >
                  <option value="">Estado: todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_revision">En revision</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="suspendida">Suspendida</option>
                  <option value="vencida">Vencida</option>
                </select>
              ) : null}
              <select
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                value={String(currentMeta.pageSize)}
                onChange={(event) => setCurrentPageSize(Number(event.target.value))}
              >
                <option value="20">20 por pagina</option>
                <option value="50">50 por pagina</option>
                <option value="100">100 por pagina</option>
              </select>
              <button className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white" type="submit">
                Buscar
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-foreground/70">
              Mostrando <span className="font-semibold text-foreground">{currentRange.from}</span> a{' '}
              <span className="font-semibold text-foreground">{currentRange.to}</span> de{' '}
              <span className="font-semibold text-foreground">{currentMeta.total}</span> solicitudes
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-border rounded-lg text-xs font-semibold disabled:opacity-50"
                onClick={() => setCurrentPage(Math.max(currentMeta.page - 1, 1))}
                disabled={isCurrentTabLoading || currentMeta.page <= 1}
              >
                Anterior
              </button>
              <span className="text-xs text-foreground/70 px-2">
                Pagina {currentMeta.page} / {currentRange.totalPages}
              </span>
              <button
                type="button"
                className="px-3 py-2 border border-border rounded-lg text-xs font-semibold disabled:opacity-50"
                onClick={() => setCurrentPage(Math.min(currentMeta.page + 1, currentRange.totalPages))}
                disabled={isCurrentTabLoading || currentMeta.page >= currentRange.totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>

          {tab === TAB_VERIFICACION_EMPRESAS ? (
            <>
              <h2 className="font-heading text-lg font-semibold">Solicitudes de verificacion (empresas)</h2>
              {loadingVerificacionEmpresas ? <p className="text-sm text-foreground/70">Cargando solicitudes...</p> : null}
              {!loadingVerificacionEmpresas && !verificacionEmpresas.length ? (
                <p className="text-sm text-foreground/70">No hay solicitudes de verificacion para mostrar.</p>
              ) : null}
              <div className="space-y-3">
                {verificacionEmpresas.map((empresa) => (
                  <article key={empresa.id} className="border border-border rounded-xl p-4 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{empresa.empresa_nombre || 'Empresa sin nombre'}</p>
                        <p className="text-xs text-foreground/60 mt-1">
                          {empresa.empresa_email || 'Sin email'} - Solicitud: {formatDateShort(empresa.fecha_solicitud)}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[empresa.estado] || STATUS_STYLES.pendiente}`}>
                        {formatStatus(empresa.estado)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 mt-3">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Nivel: {empresa.nivel === 'completo' ? 'Completo' : 'Basico'}
                      </span>
                      <button
                        className="px-2.5 py-1 border border-border rounded-lg"
                        onClick={() => handleUpdateVerificationStatus(empresa, 'en_revision')}
                        type="button"
                        disabled={updatingVerificacionId === empresa.id}
                      >
                        En revision
                      </button>
                      <button
                        className="px-2.5 py-1 border border-emerald-300 text-emerald-700 rounded-lg"
                        onClick={() => handleUpdateVerificationStatus(empresa, 'aprobada')}
                        type="button"
                        disabled={updatingVerificacionId === empresa.id}
                      >
                        Aprobar
                      </button>
                      <button
                        className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded-lg"
                        onClick={() => handleUpdateVerificationStatus(empresa, 'rechazada')}
                        type="button"
                        disabled={updatingVerificacionId === empresa.id}
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {tab === TAB_REACTIVACION_EMPRESAS ? (
            <>
              <h2 className="font-heading text-lg font-semibold">Solicitudes de reactivacion (empresas)</h2>
              {loadingReactivaciones ? <p className="text-sm text-foreground/70">Cargando solicitudes...</p> : null}
              {!loadingReactivaciones && !reactivaciones.length ? (
                <p className="text-sm text-foreground/70">No hay solicitudes de reactivacion para mostrar.</p>
              ) : null}
              <div className="space-y-3">
                {reactivaciones.map((item) => (
                  <article key={item.id} className="border border-border rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{item.empresa_nombre || 'Empresa sin nombre'}</p>
                        <p className="text-xs text-foreground/60 mt-1">
                          {item.empresa_email || 'Sin email'} - Solicitud: {formatDateShort(item.created_at)}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[item.estado] || STATUS_STYLES.pendiente}`}>
                        {formatStatus(item.estado)}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-border p-2 bg-secondary/40">
                        <p className="font-semibold text-foreground/80">Antes (desactivacion)</p>
                        <p className="text-foreground/70 mt-1">
                          Motivo: {formatReasonList(
                            item.desactivacion_motivos_codigos
                              || (item.desactivacion_motivo_codigo ? [item.desactivacion_motivo_codigo] : []),
                            DEACTIVATION_REASON_LABELS
                          )}
                        </p>
                        {item.desactivacion_motivo_detalle ? (
                          <p className="text-foreground/60 mt-1">{item.desactivacion_motivo_detalle}</p>
                        ) : null}
                      </div>
                      <div className="rounded-lg border border-border p-2 bg-secondary/40">
                        <p className="font-semibold text-foreground/80">Despues (reactivacion)</p>
                        <p className="text-foreground/70 mt-1">
                          Motivo: {formatReasonList(
                            item.motivos_codigos || (item.motivo_codigo ? [item.motivo_codigo] : []),
                            REACTIVATION_REASON_LABELS
                          )}
                        </p>
                        {item.motivo_detalle ? (
                          <p className="text-foreground/60 mt-1">Detalle: {item.motivo_detalle}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                      <button
                        className="px-2.5 py-1 border border-border rounded-lg"
                        onClick={() => handleUpdateReactivationStatus(item, 'en_revision')}
                        type="button"
                        disabled={updatingReactivacionId === item.id}
                      >
                        En revision
                      </button>
                      <button
                        className="px-2.5 py-1 border border-emerald-300 text-emerald-700 rounded-lg"
                        onClick={() => handleUpdateReactivationStatus(item, 'aprobada')}
                        type="button"
                        disabled={updatingReactivacionId === item.id}
                      >
                        Aprobar y activar
                      </button>
                      <button
                        className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded-lg"
                        onClick={() => handleUpdateReactivationStatus(item, 'rechazada')}
                        type="button"
                        disabled={updatingReactivacionId === item.id}
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {tab === TAB_SOLICITUDES_CANDIDATOS ? (
            <>
              <h2 className="font-heading text-lg font-semibold">Solicitudes de candidatos</h2>
              {loadingCandidatos ? <p className="text-sm text-foreground/70">Cargando solicitudes...</p> : null}
              {!loadingCandidatos && !solicitudesCandidatos.length ? (
                <p className="text-sm text-foreground/70">No hay solicitudes de candidatos para mostrar.</p>
              ) : null}
              <div className="space-y-3">
                {solicitudesCandidatos.map((candidato) => (
                  <article key={candidato.id} className="border border-border rounded-xl p-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{candidato.candidato_nombre || 'Candidato sin nombre'}</p>
                        <p className="text-xs text-foreground/60 mt-1">
                          {candidato.candidato_documento || 'Sin documento'} - {candidato.candidato_email || 'Sin email'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[candidato.estado] || STATUS_STYLES.pendiente}`}>
                        {formatStatus(candidato.estado)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 mt-3">
                      <span className="inline-flex items-center gap-1">
                        {candidato.estado === 'aprobada' ? (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : candidato.estado === 'en_revision' ? (
                          <Clock3 className="w-3.5 h-3.5 text-blue-600" />
                        ) : candidato.estado === 'rechazada' ? (
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {formatStatus(candidato.estado)}
                      </span>
                      <button
                        className="px-2.5 py-1 border border-border rounded-lg"
                        onClick={() => handleUpdateVerificationStatus(candidato, 'en_revision')}
                        type="button"
                        disabled={updatingVerificacionId === candidato.id}
                      >
                        En revision
                      </button>
                      <button
                        className="px-2.5 py-1 border border-emerald-300 text-emerald-700 rounded-lg"
                        onClick={() => handleUpdateVerificationStatus(candidato, 'aprobada')}
                        type="button"
                        disabled={updatingVerificacionId === candidato.id}
                      >
                        Aprobar
                      </button>
                      <button
                        className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded-lg"
                        onClick={() => handleUpdateVerificationStatus(candidato, 'rechazada')}
                        type="button"
                        disabled={updatingVerificacionId === candidato.id}
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}
