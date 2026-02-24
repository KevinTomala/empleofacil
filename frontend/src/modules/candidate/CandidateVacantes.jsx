import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from '../../components/Header'
import provinciasData from '../../assets/provincias.json'
import { apiRequest } from '../../services/api'
import { showToast } from '../../utils/showToast'
import './candidate.css'

const POSTED_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: 'Ultimos 7 dias' },
  { value: '30d', label: 'Ultimos 30 dias' },
  { value: '90d', label: 'Ultimos 90 dias' }
]

const MODALIDAD_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Hibrido' }
]

const TIPO_CONTRATO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'tiempo_completo', label: 'Tiempo completo' },
  { value: 'medio_tiempo', label: 'Medio tiempo' },
  { value: 'por_horas', label: 'Por horas' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'otro', label: 'Otro' }
]

function repairMojibake(value) {
  return String(value || '')
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ãº', 'ú')
    .replaceAll('ÃÁ', 'Á')
    .replaceAll('Ã‰', 'É')
    .replaceAll('Ã', 'Í')
    .replaceAll('Ã“', 'Ó')
    .replaceAll('Ãš', 'Ú')
    .replaceAll('Ã±', 'ñ')
    .replaceAll('Ã‘', 'Ñ')
    .replaceAll('Ã¼', 'ü')
    .replaceAll('Ãœ', 'Ü')
}

function normalizeProvinceText(value) {
  return repairMojibake(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function CandidateVacantes() {
  const [items, setItems] = useState([])
  const [allVacantes, setAllVacantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [postingId, setPostingId] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState('')
  const [filters, setFilters] = useState({
    city: '',
    area: '',
    contractType: '',
    modality: '',
    posted: ''
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const svgBoundDocsRef = useRef(new WeakSet())
  const provinceOptionsRef = useRef([])

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / pageSize)
    return pages > 0 ? pages : 1
  }, [total, pageSize])

  const provinceCatalog = useMemo(() => {
    return Object.values(provinciasData || {}).map((provincia) => {
      const rawName = repairMojibake(provincia?.provincia || '')
      const cantones = Object.values(provincia?.cantones || {}).map((canton) => repairMojibake(canton?.canton || '')).filter(Boolean)
      return {
        label: rawName,
        value: rawName,
        normalized: normalizeProvinceText(rawName),
        cantones
      }
    })
  }, [])

  const provinceOptions = useMemo(() => {
    return provinceCatalog
      .map(({ label, value }) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [provinceCatalog])

  useEffect(() => {
    provinceOptionsRef.current = provinceOptions
  }, [provinceOptions])

  const cityOptions = useMemo(() => {
    if (!selectedProvince) return []
    const selectedKey = normalizeProvinceText(selectedProvince)
    const selectedProvinceData = provinceCatalog.find((prov) => prov.normalized === selectedKey)
    if (!selectedProvinceData) return []
    return [...selectedProvinceData.cantones].sort((a, b) => a.localeCompare(b))
  }, [provinceCatalog, selectedProvince])

  const options = useMemo(() => {
    const areas = new Set()
    allVacantes.forEach((item) => {
      if (item?.area) areas.add(item.area)
    })
    return {
      areas: Array.from(areas).sort((a, b) => a.localeCompare(b))
    }
  }, [allVacantes])

  const bindSvgProvinceClicks = useCallback((svgDoc) => {
    if (!svgDoc || svgBoundDocsRef.current.has(svgDoc)) return
    const provincePaths = svgDoc.querySelectorAll('#features path[name]')
    if (!provincePaths.length) return

    provincePaths.forEach((path) => {
      const provinceName = String(path.getAttribute('name') || '').trim()
      if (!provinceName) return

      const clickHandler = () => {
        const normalizedProvince = normalizeProvinceText(provinceName)
        const match = provinceOptionsRef.current.find((opt) => normalizeProvinceText(opt.value) === normalizedProvince)
        if (!match) return
        setSelectedProvince(match.value)
        setFilters((prev) => ({ ...prev, city: '' }))
        setShowFilters(true)
        setPage(1)
      }

      path.addEventListener('click', clickHandler)
    })

    svgBoundDocsRef.current.add(svgDoc)
  }, [])

  const handleSvgLoad = useCallback((event) => {
    const svgDoc = event.currentTarget?.contentDocument
    if (!svgDoc) return

    const paths = svgDoc.querySelectorAll('#features path')
    paths.forEach((path) => {
      const hasTitle = path.querySelector('title')
      if (hasTitle) return
      const name = path.getAttribute('name') || path.getAttribute('id')
      if (!name) return
      const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = name
      path.prepend(title)
    })

    bindSvgProvinceClicks(svgDoc)
  }, [bindSvgProvinceClicks])

  useEffect(() => {
    let mounted = true
    async function fetchOptionsSource() {
      try {
        const params = new URLSearchParams()
        params.set('page', '1')
        params.set('page_size', '100')
        const data = await apiRequest(`/api/vacantes?${params.toString()}`)
        if (!mounted) return
        const sourceItems = Array.isArray(data?.items) ? data.items : []
        setAllVacantes(sourceItems)
      } catch (_) {
        if (!mounted) return
        setAllVacantes([])
      }
    }
    fetchOptionsSource()
    return () => {
      mounted = false
    }
  }, [])

  async function fetchVacantes() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (q.trim()) params.set('q', q.trim())
      if (selectedProvince.trim()) params.set('provincia', selectedProvince.trim())
      if (filters.city.trim()) params.set('ciudad', filters.city.trim())
      if (filters.modality) params.set('modalidad', filters.modality)
      if (filters.contractType) params.set('tipo_contrato', filters.contractType)
      if (filters.area.trim()) params.set('area', filters.area.trim())
      if (filters.posted) params.set('posted', filters.posted)
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
  }, [page, pageSize, selectedProvince, filters.city, filters.modality, filters.contractType, filters.area, filters.posted])

  const onSearch = (event) => {
    event.preventDefault()
    setPage(1)
    fetchVacantes()
  }

  const clearFilters = () => {
    setQ('')
    setShowFilters(false)
    setSelectedProvince('')
    setFilters({
      city: '',
      area: '',
      contractType: '',
      modality: '',
      posted: ''
    })
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
          <p className="text-foreground/70 max-w-2xl">Filtra oportunidades por mapa, provincia, ciudad y fecha para postular a vacantes activas.</p>
        </section>

        <section className="candidate-vacantes-grid">
          <aside className="candidate-filters-panel">
            {!showFilters ? (
              <div className="bg-white border border-border rounded-2xl p-6 shadow-sm candidate-map-card">
                <h2 className="font-heading text-lg font-semibold mb-3">Filtra por provincia</h2>
                <p className="text-sm text-foreground/70 mb-4">
                  Haz clic en una provincia para activar filtros avanzados.
                </p>
                <div className="hero-map-frame mx-auto">
                  <object
                    data="/ec.svg"
                    type="image/svg+xml"
                    aria-label="Mapa interactivo de Ecuador"
                    className="hero-map-svg"
                    onLoad={handleSvgLoad}
                  />
                </div>
              </div>
            ) : (
              <div className="candidate-filters candidate-filters-compact">
                <div className="candidate-filters-row">
                  <label className="candidate-filter-inline">
                    Provincia
                    <select
                      className="ef-control"
                      value={selectedProvince}
                      onChange={(event) => {
                        setSelectedProvince(event.target.value)
                        setFilters((prev) => ({ ...prev, city: '' }))
                        setPage(1)
                      }}
                    >
                      <option value="">Selecciona provincia</option>
                      {provinceOptions.map((prov) => (
                        <option key={prov.value} value={prov.value}>
                          {prov.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Ciudad (Canton)
                    <select
                      className="ef-control"
                      value={filters.city}
                      onChange={(event) => {
                        setFilters((prev) => ({ ...prev, city: event.target.value }))
                        setPage(1)
                      }}
                      disabled={!selectedProvince}
                    >
                      <option value="">Todas</option>
                      {cityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Cargo
                    <select
                      className="ef-control"
                      value={filters.area}
                      onChange={(event) => {
                        setFilters((prev) => ({ ...prev, area: event.target.value }))
                        setPage(1)
                      }}
                    >
                      <option value="">Todas</option>
                      {options.areas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Tipo
                    <select
                      className="ef-control"
                      value={filters.contractType}
                      onChange={(event) => {
                        setFilters((prev) => ({ ...prev, contractType: event.target.value }))
                        setPage(1)
                      }}
                    >
                      {TIPO_CONTRATO_OPTIONS.map((type) => (
                        <option key={type.value || 'all'} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Modalidad
                    <select
                      className="ef-control"
                      value={filters.modality}
                      onChange={(event) => {
                        setFilters((prev) => ({ ...prev, modality: event.target.value }))
                        setPage(1)
                      }}
                    >
                      {MODALIDAD_OPTIONS.map((modality) => (
                        <option key={modality.value || 'all'} value={modality.value}>
                          {modality.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Fecha
                    <select
                      className="ef-control"
                      value={filters.posted}
                      onChange={(event) => {
                        setFilters((prev) => ({ ...prev, posted: event.target.value }))
                        setPage(1)
                      }}
                    >
                      {POSTED_OPTIONS.map((item) => (
                        <option key={item.value || 'all'} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="candidate-reset"
                    onClick={clearFilters}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </aside>

          <div className="space-y-4">
            <section className="bg-white border border-border rounded-xl p-4">
              <form className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-end" onSubmit={onSearch}>
                <label className="text-xs text-foreground/65">
                  Buscar
                  <input className="ef-control mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titulo, empresa o ubicacion" />
                </label>
                <button className="candidate-cta md:w-auto" type="submit">Buscar</button>
                <button className="px-4 py-2 border border-border rounded-lg text-sm" type="button" onClick={clearFilters}>
                  Limpiar
                </button>
              </form>
            </section>

            <section className="space-y-3 candidate-vacantes-list">
              {loading && <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">Cargando vacantes...</div>}
              {!loading && error && <div className="bg-white border border-border rounded-xl p-5 text-sm text-rose-700">{error}</div>}
              {!loading && !error && items.length === 0 && (
                <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">
                  {q.trim() || selectedProvince || filters.city || filters.area || filters.contractType || filters.modality || filters.posted
                    ? 'No hay resultados para los filtros aplicados.'
                    : 'No hay vacantes activas disponibles en este momento.'}
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
          </div>
        </section>

        <section className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-foreground/70">Pagina {page} de {totalPages} - Total {total}</div>
          <div className="flex items-center gap-2">
            <select
              className="ef-control"
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

