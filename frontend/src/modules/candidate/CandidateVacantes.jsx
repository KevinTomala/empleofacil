import { useEffect, useMemo, useState } from 'react'
import Header from '../../components/Header'
import { apiRequest } from '../../services/api'
import { showToast } from '../../utils/showToast'
import './candidate.css'

const MODALIDADES = ['', 'presencial', 'remoto', 'hibrido']
const TIPOS_CONTRATO = ['', 'tiempo_completo', 'medio_tiempo', 'por_horas', 'temporal', 'indefinido', 'otro']

export default function CandidateVacantes() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [postingId, setPostingId] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [provincia, setProvincia] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [tipoContrato, setTipoContrato] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / pageSize)
    return pages > 0 ? pages : 1
  }, [total, pageSize])

  async function fetchVacantes() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (q.trim()) params.set('q', q.trim())
      if (provincia.trim()) params.set('provincia', provincia.trim())
      if (modalidad) params.set('modalidad', modalidad)
      if (tipoContrato) params.set('tipo_contrato', tipoContrato)
      const data = await apiRequest(`/api/vacantes?${params.toString()}`)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
      setError('')
    } catch (err) {
      setItems([])
      setTotal(0)
      setError(err?.payload?.error || err.message || 'No se pudieron cargar las vacantes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVacantes()
  }, [page, pageSize, modalidad, tipoContrato])

  const onSearch = (event) => {
    event.preventDefault()
    setPage(1)
    fetchVacantes()
  }

  const clearFilters = () => {
    setQ('')
    setProvincia('')
    setModalidad('')
    setTipoContrato('')
    setPage(1)
    setPageSize(20)
  }

  const postular = async (vacanteId) => {
    try {
      setPostingId(vacanteId)
      await apiRequest('/api/postulaciones', {
        method: 'POST',
        body: JSON.stringify({ vacante_id: vacanteId })
      })
      showToast({ type: 'success', message: 'Postulacion registrada.' })
    } catch (err) {
      const code = err?.payload?.error || err.message
      if (code === 'POSTULACION_DUPLICADA') {
        showToast({ type: 'warning', message: 'Ya te postulaste a esta vacante.' })
      } else if (code === 'VACANTE_NOT_ACTIVE') {
        showToast({ type: 'warning', message: 'Esta vacante ya no esta activa.' })
      } else {
        showToast({ type: 'error', message: code || 'No se pudo registrar la postulacion.' })
      }
    } finally {
      setPostingId(null)
    }
  }

  return (
    <div className="candidate-page">
      <Header />
      <main className="page-container candidate-content space-y-8">
        <section className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Vacantes activas</h1>
          <p className="text-foreground/70 max-w-2xl">Filtra oportunidades y postula a las vacantes publicadas.</p>
        </section>

        <section className="bg-white border border-border rounded-xl p-4">
          <form className="grid md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-2 items-end" onSubmit={onSearch}>
            <label className="text-xs text-foreground/65">
              Buscar
              <input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titulo o empresa" />
            </label>
            <label className="text-xs text-foreground/65">
              Provincia
              <input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Ej: Guayas" />
            </label>
            <label className="text-xs text-foreground/65">
              Modalidad
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={modalidad} onChange={(e) => { setModalidad(e.target.value); setPage(1); }}>
                {MODALIDADES.map((item) => <option key={item || 'all'} value={item}>{item || 'Todas'}</option>)}
              </select>
            </label>
            <label className="text-xs text-foreground/65">
              Tipo contrato
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={tipoContrato} onChange={(e) => { setTipoContrato(e.target.value); setPage(1); }}>
                {TIPOS_CONTRATO.map((item) => <option key={item || 'all'} value={item}>{item || 'Todos'}</option>)}
              </select>
            </label>
            <button className="candidate-cta !mt-0" type="submit">Buscar</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm" type="button" onClick={clearFilters}>
              Limpiar
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {loading && <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">Cargando vacantes...</div>}
          {!loading && error && <div className="bg-white border border-border rounded-xl p-5 text-sm text-rose-700">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">
              No hay vacantes disponibles para los filtros seleccionados.
            </div>
          )}
          {!loading && !error && items.map((item) => (
            <article key={item.id} className="candidate-job-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">{item.titulo}</h2>
                  <p className="text-sm text-foreground/70">{item.empresa_nombre || 'Empresa'}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{item.modalidad}</span>
              </div>
              <div className="mt-2 text-xs text-foreground/60">
                {item.provincia || 'Provincia N/D'} - {item.ciudad || 'Ciudad N/D'} - {item.tipo_contrato}
              </div>
              <div className="mt-2 text-xs text-foreground/60">{item.area || 'Area no definida'}</div>
              <div className="mt-2 text-xs text-foreground/60">
                Publicada: {String(item.fecha_publicacion || '').slice(0, 10) || 'N/D'}
              </div>
              <button className="candidate-cta" type="button" disabled={postingId === item.id} onClick={() => postular(item.id)}>
                {postingId === item.id ? 'Postulando...' : 'Postular ahora'}
              </button>
            </article>
          ))}
        </section>

        <section className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
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

