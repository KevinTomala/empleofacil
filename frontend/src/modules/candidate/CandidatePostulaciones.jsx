import { useEffect, useMemo, useState } from 'react'
import Header from '../../components/Header'
import { apiRequest } from '../../services/api'

export default function CandidatePostulaciones() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

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
      const data = await apiRequest(`/api/postulaciones/mias?${params.toString()}`)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
      setError('')
    } catch (err) {
      setItems([])
      setTotal(0)
      setError(err?.payload?.error || err.message || 'No se pudieron cargar tus postulaciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPostulaciones()
  }, [page, pageSize])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <section className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Tus postulaciones</h1>
          <p className="text-foreground/70 max-w-2xl">Consulta el estado de las vacantes a las que ya aplicaste.</p>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="rounded-xl border border-border bg-white p-6 text-sm text-foreground/70">
              Cargando postulaciones...
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl border border-border bg-white p-6 text-sm text-rose-700">
              {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-foreground/70">
              Aun no tienes postulaciones activas.
            </div>
          )}
          {!loading && !error && items.map((item) => (
            <article key={item.id} className="bg-white border border-border rounded-xl p-5 space-y-2">
              <h2 className="font-semibold text-lg text-foreground">{item.vacante_titulo || 'Vacante'}</h2>
              <p className="text-sm text-foreground/70">{item.empresa_nombre || 'Empresa'}</p>
              <p className="text-xs text-foreground/60">
                Ubicacion: {item.provincia || 'N/D'} - {item.ciudad || 'N/D'}
              </p>
              <p className="text-xs text-foreground/60">
                Postulado: {String(item.fecha_postulacion || '').slice(0, 10) || 'N/D'}
              </p>
              <span className="inline-flex text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                {item.estado_proceso || 'nuevo'}
              </span>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-border bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-foreground/70">Pagina {page} de {totalPages} - Total {total}</div>
          <div className="flex items-center gap-2">
            <select
              className="border border-border rounded-lg px-2 py-1.5 text-sm"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <button className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

