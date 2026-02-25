import { useEffect, useMemo, useState } from 'react'
import Header from '../../components/Header'
import FormDropdown from '../../components/FormDropdown'
import { apiRequest } from '../../services/api'
import './candidate.css'

const STATUS_CONFIG = {
  nuevo: { label: 'Nuevo', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_revision: { label: 'En revision', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  entrevista: { label: 'Entrevista', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  oferta: { label: 'Oferta', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rechazado: { label: 'Rechazado', badge: 'bg-rose-50 text-rose-700 border-rose-200' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_revision', label: 'En revision' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'rechazado', label: 'Rechazado' }
]

const POSTED_OPTIONS = [
  { value: '', label: 'Cualquier fecha' },
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: 'Ultimos 7 dias' },
  { value: '30d', label: 'Ultimos 30 dias' },
  { value: '90d', label: 'Ultimos 90 dias' }
]

function formatDate(value) {
  if (!value) return 'N/D'
  return String(value).slice(0, 10)
}

function toStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status || 'Nuevo'
}

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] || { label: toStatusLabel(estado), badge: 'bg-slate-100 text-slate-700 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

function MetricCard({ label, value, tone }) {
  return (
    <article className={`candidate-metric-card ${tone}`}>
      <p className="candidate-metric-value">{value}</p>
      <p className="candidate-metric-label">{label}</p>
    </article>
  )
}

function DetailBody({ detail, loadingDetail, errorDetail }) {
  if (loadingDetail) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-2/3 rounded bg-slate-200 animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
        <div className="h-24 w-full rounded bg-slate-100 animate-pulse" />
        <div className="h-24 w-full rounded bg-slate-100 animate-pulse" />
      </div>
    )
  }

  if (errorDetail) return <p className="text-sm text-rose-700">{errorDetail}</p>
  if (!detail) return <p className="text-sm text-foreground/60">Selecciona una postulacion para ver su detalle.</p>

  const vacante = detail.vacante || {}
  const empresa = detail.empresa || {}

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge estado={detail.estado_proceso} />
          {vacante.modalidad ? <span className="candidate-detail-chip">{vacante.modalidad}</span> : null}
          {vacante.tipo_contrato ? <span className="candidate-detail-chip">{String(vacante.tipo_contrato).replace(/_/g, ' ')}</span> : null}
        </div>
        <h3 className="font-heading text-xl font-bold leading-tight">{vacante.titulo || 'Vacante'}</h3>
        <p className="text-sm font-medium text-foreground/70">{empresa.nombre || 'Empresa'}</p>
      </header>

      <section className="candidate-detail-meta">
        <p>Ubicacion: {vacante.provincia || 'N/D'}, {vacante.ciudad || 'N/D'}</p>
        <p>Area: {vacante.area || 'N/D'}</p>
        <p>Postulaste: {formatDate(detail.fecha_postulacion)}</p>
        <p>Ultima actividad: {formatDate(detail.ultima_actividad)}</p>
        <p>Publicada: {formatDate(vacante.fecha_publicacion)}</p>
        <p>Cierre: {formatDate(vacante.fecha_cierre)}</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Descripcion</h4>
        <p className="text-sm text-foreground/75 whitespace-pre-line leading-relaxed">
          {vacante.descripcion || 'No hay descripcion disponible para esta vacante.'}
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Requisitos</h4>
        <p className="text-sm text-foreground/75 whitespace-pre-line leading-relaxed">
          {vacante.requisitos || 'No hay requisitos registrados para esta vacante.'}
        </p>
      </section>
    </div>
  )
}

export default function CandidatePostulaciones() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [qInput, setQInput] = useState('')
  const [filters, setFilters] = useState({ q: '', estado: '', posted: '' })
  const [summary, setSummary] = useState({
    total: 0,
    by_estado: { nuevo: 0, en_revision: 0, entrevista: 0, oferta: 0, rechazado: 0 },
    en_proceso: 0,
    tasa_activa: 0
  })
  const [selectedPostulacionId, setSelectedPostulacionId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / pageSize)
    return pages > 0 ? pages : 1
  }, [total, pageSize])

  async function fetchPostulaciones() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (filters.q) params.set('q', filters.q)
      if (filters.estado) params.set('estado', filters.estado)
      if (filters.posted) params.set('posted', filters.posted)
      const data = await apiRequest(`/api/postulaciones/mias?${params.toString()}`)
      const nextItems = Array.isArray(data?.items) ? data.items : []
      setItems(nextItems)
      setTotal(Number(data?.total || 0))
      setError('')
      setSelectedPostulacionId((current) => {
        if (!nextItems.length) return null
        if (current && nextItems.some((item) => Number(item.id) === Number(current))) return current
        return nextItems[0].id
      })
    } catch (err) {
      setItems([])
      setTotal(0)
      setSelectedPostulacionId(null)
      setError(err?.payload?.error || err.message || 'No se pudieron cargar tus postulaciones.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSummary() {
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.posted) params.set('posted', filters.posted)
      const data = await apiRequest(`/api/postulaciones/mias/resumen?${params.toString()}`)
      setSummary({
        total: Number(data?.total || 0),
        by_estado: {
          nuevo: Number(data?.by_estado?.nuevo || 0),
          en_revision: Number(data?.by_estado?.en_revision || 0),
          entrevista: Number(data?.by_estado?.entrevista || 0),
          oferta: Number(data?.by_estado?.oferta || 0),
          rechazado: Number(data?.by_estado?.rechazado || 0)
        },
        en_proceso: Number(data?.en_proceso || 0),
        tasa_activa: Number(data?.tasa_activa || 0)
      })
    } catch (_err) {
      setSummary({
        total: 0,
        by_estado: { nuevo: 0, en_revision: 0, entrevista: 0, oferta: 0, rechazado: 0 },
        en_proceso: 0,
        tasa_activa: 0
      })
    }
  }

  async function fetchDetail(postulacionId) {
    if (!postulacionId) {
      setDetail(null)
      setErrorDetail('')
      return
    }

    try {
      setLoadingDetail(true)
      setErrorDetail('')
      const data = await apiRequest(`/api/postulaciones/mias/${postulacionId}`)
      setDetail(data || null)
    } catch (err) {
      setDetail(null)
      setErrorDetail(err?.payload?.error || err.message || 'No se pudo cargar el detalle.')
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    fetchPostulaciones()
  }, [page, pageSize, filters])

  useEffect(() => {
    fetchSummary()
  }, [filters.q, filters.posted])

  useEffect(() => {
    fetchDetail(selectedPostulacionId)
  }, [selectedPostulacionId])

  const hasFilters = Boolean(filters.q || filters.estado || filters.posted)

  const onSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setFilters((prev) => ({ ...prev, q: qInput.trim() }))
  }

  const clearFilters = () => {
    setQInput('')
    setPage(1)
    setFilters({ q: '', estado: '', posted: '' })
  }

  const selectPostulacion = (id) => {
    setSelectedPostulacionId(id)
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setDetailModalOpen(true)
    }
  }

  return (
    <div className="candidate-page">
      <Header />
      <main className="page-container candidate-content space-y-6">
        <section className="space-y-1">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Mis postulaciones</h1>
          <p className="text-foreground/70 max-w-2xl">Gestiona el seguimiento de tus procesos y revisa cada vacante con detalle.</p>
        </section>

        <section className="candidate-metrics-grid">
          <MetricCard label="Total" value={summary.total} tone="tone-total" />
          <MetricCard label="En proceso" value={summary.en_proceso} tone="tone-process" />
          <MetricCard label="Entrevista" value={summary.by_estado.entrevista} tone="tone-interview" />
          <MetricCard label="Oferta" value={summary.by_estado.oferta} tone="tone-offer" />
          <MetricCard label="Rechazado" value={summary.by_estado.rechazado} tone="tone-rejected" />
          <MetricCard label="Tasa activa" value={`${summary.tasa_activa}%`} tone="tone-active-rate" />
        </section>

        <section className="candidate-filters-panel candidate-postulaciones-filter-box">
          <form className="candidate-postulaciones-filters" onSubmit={onSearch}>
            <label className="candidate-filter-inline">
              Buscar
              <input
                className="ef-control"
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Vacante, empresa o ubicacion"
              />
            </label>
            <label className="candidate-filter-inline">
              Estado
              <FormDropdown
                value={filters.estado}
                options={STATUS_OPTIONS}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, estado: value }))
                  setPage(1)
                }}
              />
            </label>
            <label className="candidate-filter-inline">
              Fecha
              <FormDropdown
                value={filters.posted}
                options={POSTED_OPTIONS}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, posted: value }))
                  setPage(1)
                }}
              />
            </label>
            <button className="candidate-postulaciones-btn btn-primary" type="submit">Aplicar</button>
            <button className="candidate-postulaciones-btn btn-secondary" type="button" onClick={clearFilters}>Limpiar</button>
          </form>
        </section>

        {loading && (
          <section className="candidate-postulaciones-grid">
            <div className="candidate-postulaciones-list space-y-3">
              <div className="candidate-skeleton-card animate-pulse" />
              <div className="candidate-skeleton-card animate-pulse" />
              <div className="candidate-skeleton-card animate-pulse" />
            </div>
            <aside className="candidate-postulaciones-detail hidden lg:block">
              <div className="candidate-postulaciones-detail-card space-y-3">
                <div className="h-6 w-2/3 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
                <div className="h-28 rounded bg-slate-100 animate-pulse" />
              </div>
            </aside>
          </section>
        )}

        {!loading && error && (
          <section className="bg-white border border-border rounded-xl p-6 text-sm text-rose-700">{error}</section>
        )}

        {!loading && !error && items.length === 0 && (
          <section className="bg-white border border-dashed border-border rounded-xl p-10 text-center space-y-2">
            <p className="text-sm text-foreground/65">
              {hasFilters ? 'No hay postulaciones para los filtros aplicados.' : 'Aun no tienes postulaciones registradas.'}
            </p>
          </section>
        )}

        {!loading && !error && items.length > 0 && (
          <section className="candidate-postulaciones-grid">
            <div className="candidate-postulaciones-list space-y-2">
              {items.map((item) => {
                const isSelected = Number(selectedPostulacionId) === Number(item.id)
                return (
                  <article
                    key={item.id}
                    className={`candidate-postulacion-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => selectPostulacion(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectPostulacion(item.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <h2 className="text-base font-semibold leading-tight">{item.vacante_titulo || 'Vacante'}</h2>
                        <p className="text-sm text-foreground/70 font-medium">{item.empresa_nombre || 'Empresa'}</p>
                      </div>
                      <StatusBadge estado={item.estado_proceso} />
                    </div>

                    <div className="candidate-postulacion-meta">
                      <p>Ubicacion: {item.provincia || 'N/D'}, {item.ciudad || 'N/D'}</p>
                      <p>Postulado: {formatDate(item.fecha_postulacion)}</p>
                      <p>Actividad: {formatDate(item.ultima_actividad)}</p>
                    </div>
                  </article>
                )
              })}
            </div>

            <aside className="candidate-postulaciones-detail hidden lg:block">
              <div className="candidate-postulaciones-detail-card">
                <DetailBody detail={detail} loadingDetail={loadingDetail} errorDetail={errorDetail} />
              </div>
            </aside>
          </section>
        )}

        {!error && (
          <section className="rounded-xl border border-border bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-foreground/70">Pagina {page} de {totalPages} - Total {total}</div>
            <div className="flex flex-wrap items-center gap-2">
              <div style={{ width: '100px' }}>
                <FormDropdown
                  value={pageSize}
                  options={[
                    { value: 20, label: '20' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' }
                  ]}
                  onChange={(value) => {
                    setPageSize(value)
                    setPage(1)
                  }}
                />
              </div>
              <button
                className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Siguiente
              </button>
            </div>
          </section>
        )}
      </main>

      {detailModalOpen && (
        <div
          className="candidate-postulaciones-modal lg:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDetailModalOpen(false)
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setDetailModalOpen(false)
          }}
        >
          <div className="candidate-postulaciones-modal-card">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3 mb-4">
              <h3 className="font-semibold">Detalle de postulacion</h3>
              <button type="button" className="candidate-postulaciones-btn btn-secondary" onClick={() => setDetailModalOpen(false)}>
                Cerrar
              </button>
            </div>
            <DetailBody detail={detail} loadingDetail={loadingDetail} errorDetail={errorDetail} />
          </div>
        </div>
      )}
    </div>
  )
}
