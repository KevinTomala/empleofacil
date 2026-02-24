import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FormDropdown from '../../components/FormDropdown'
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
  const [provinceSearch, setProvinceSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [areaSearch, setAreaSearch] = useState('')

  const [dropdownsOpen, setDropdownsOpen] = useState({
    province: false,
    city: false,
    area: false
  })

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

  const filteredCityOptions = useMemo(() => {
    const term = citySearch.trim().toLowerCase()
    if (!term) return cityOptions
    return cityOptions.filter(c => c.toLowerCase().includes(term))
  }, [cityOptions, citySearch])

  const filteredProvinceOptions = useMemo(() => {
    const term = provinceSearch.trim().toLowerCase()
    if (!term) return provinceOptions
    return provinceOptions.filter(p => p.label.toLowerCase().includes(term))
  }, [provinceOptions, provinceSearch])

  const options = useMemo(() => {
    const areas = new Set()
    allVacantes.forEach((item) => {
      if (item?.area) areas.add(item.area)
    })
    return {
      areas: Array.from(areas).sort((a, b) => a.localeCompare(b))
    }
  }, [allVacantes])

  const filteredAreaOptions = useMemo(() => {
    const term = areaSearch.trim().toLowerCase()
    if (!term) return options.areas
    return options.areas.filter(a => a.toLowerCase().includes(term))
  }, [options.areas, areaSearch])

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

  async function fetchVacantes(overrides = {}) {
    try {
      setLoading(true)
      const activeQ = 'q' in overrides ? overrides.q : q
      const activeProv = 'provincia' in overrides ? overrides.provincia : selectedProvince
      const activeFilters = 'filters' in overrides ? overrides.filters : filters
      const activePage = 'page' in overrides ? overrides.page : page
      const activePageSize = 'pageSize' in overrides ? overrides.pageSize : pageSize
      const params = new URLSearchParams()
      params.set('page', String(activePage))
      params.set('page_size', String(activePageSize))
      if (activeQ.trim()) params.set('q', activeQ.trim())
      if (activeProv.trim()) params.set('provincia', activeProv.trim())
      if (activeFilters.city.trim()) params.set('ciudad', activeFilters.city.trim())
      if (activeFilters.modality) params.set('modalidad', activeFilters.modality)
      if (activeFilters.contractType) params.set('tipo_contrato', activeFilters.contractType)
      if (activeFilters.area.trim()) params.set('area', activeFilters.area.trim())
      if (activeFilters.posted) params.set('posted', activeFilters.posted)
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
    const emptyFilters = { city: '', area: '', contractType: '', modality: '', posted: '' }
    setQ('')
    setShowFilters(false)
    setSelectedProvince('')
    setProvinceSearch('')
    setCitySearch('')
    setAreaSearch('')
    setFilters(emptyFilters)
    setPage(1)
    setPageSize(20)
    fetchVacantes({ q: '', provincia: '', filters: emptyFilters, page: 1, pageSize: 20 })
  }

  const postular = async (vacanteId) => {
    try {
      setPostingId(vacanteId)
      await apiRequest('/api/postulaciones', {
        method: 'POST',
        body: JSON.stringify({ vacante_id: vacanteId })
      })
      showToast({ type: 'success', message: 'Postulacion registrada.' })
      setItems(prev => prev.map(v => (v.id === vacanteId ? { ...v, postulado: 1 } : v)))
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
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">Vacantes activas</h1>
            <p className="text-foreground/70 max-w-2xl">Filtra oportunidades por mapa, provincia, ciudad y fecha para postular a vacantes activas.</p>
          </div>

          <div className="bg-white border border-border rounded-xl p-3 shadow-sm md:min-w-[400px]">
            <form className="flex items-end gap-2" onSubmit={onSearch}>
              <label className="text-xs text-foreground/65 flex-1">
                Buscar
                <input className="ef-control mt-1 w-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titulo, empresa o ubicacion" />
              </label>
              <button className="candidate-cta !mt-0 !w-auto h-9 px-3 flex items-center justify-center" type="submit">Buscar</button>
              <button className="px-3 h-9 border border-border rounded-lg text-sm text-foreground/70 hover:bg-slate-50 transition-colors" type="button" onClick={clearFilters}>
                Limpiar
              </button>
            </form>
          </div>
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
                    <div
                      className="ef-dropdown w-full"
                      tabIndex={0}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDropdownsOpen(prev => ({ ...prev, province: false }))
                        }
                      }}
                    >
                      <input
                        className="ef-control w-full"
                        placeholder="Todas las provincias"
                        value={dropdownsOpen.province ? provinceSearch : selectedProvince}
                        onFocus={() => {
                          setProvinceSearch(selectedProvince)
                          setDropdownsOpen(prev => ({ ...prev, province: true }))
                        }}
                        onChange={(e) => {
                          setProvinceSearch(e.target.value)
                          setSelectedProvince(e.target.value)
                          if (!e.target.value) {
                            setFilters((prev) => ({ ...prev, city: '' }))
                            setCitySearch('')
                            setPage(1)
                          }
                          setDropdownsOpen(prev => ({ ...prev, province: true }))
                        }}
                      />
                      {dropdownsOpen.province && (
                        <div className="ef-dropdown-menu">
                          <button
                            type="button"
                            className="ef-dropdown-option text-foreground/70 font-medium"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedProvince('')
                              setFilters((prev) => ({ ...prev, city: '' }))
                              setCitySearch('')
                              setProvinceSearch('')
                              setDropdownsOpen(prev => ({ ...prev, province: false }))
                              setPage(1)
                            }}
                          >
                            Todas las provincias
                          </button>
                          {filteredProvinceOptions.map(prov => (
                            <button
                              key={prov.value}
                              type="button"
                              className="ef-dropdown-option"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedProvince(prov.value)
                                setFilters((prev) => ({ ...prev, city: '' }))
                                setCitySearch('')
                                setDropdownsOpen(prev => ({ ...prev, province: false }))
                                setPage(1)
                              }}
                            >
                              {prov.label}
                            </button>
                          ))}
                          {!filteredProvinceOptions.length && (
                            <p className="px-3 py-2 text-xs text-foreground/60">Sin coincidencias</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="candidate-filter-inline">
                    Ciudad (Canton)
                    <div
                      className={`ef-dropdown w-full ${!selectedProvince ? 'opacity-50 pointer-events-none' : ''}`}
                      tabIndex={0}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDropdownsOpen(prev => ({ ...prev, city: false }))
                        }
                      }}
                    >
                      <input
                        className="ef-control w-full"
                        placeholder="Todas las ciudades"
                        value={dropdownsOpen.city ? citySearch : filters.city}
                        onFocus={() => {
                          setCitySearch(filters.city)
                          setDropdownsOpen(prev => ({ ...prev, city: true }))
                        }}
                        onChange={(e) => {
                          setCitySearch(e.target.value)
                          setFilters((prev) => ({ ...prev, city: e.target.value }))
                          setDropdownsOpen(prev => ({ ...prev, city: true }))
                          if (!e.target.value) setPage(1)
                        }}
                        disabled={!selectedProvince}
                      />
                      {dropdownsOpen.city && (
                        <div className="ef-dropdown-menu">
                          <button
                            type="button"
                            className="ef-dropdown-option text-foreground/70 font-medium"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setFilters((prev) => ({ ...prev, city: '' }))
                              setCitySearch('')
                              setDropdownsOpen(prev => ({ ...prev, city: false }))
                              setPage(1)
                            }}
                          >
                            Todas las ciudades
                          </button>
                          {filteredCityOptions.map(city => (
                            <button
                              key={city}
                              type="button"
                              className="ef-dropdown-option"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, city }))
                                setDropdownsOpen(prev => ({ ...prev, city: false }))
                                setPage(1)
                              }}
                            >
                              {city}
                            </button>
                          ))}
                          {!filteredCityOptions.length && (
                            <p className="px-3 py-2 text-xs text-foreground/60">Sin coincidencias</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="candidate-filter-inline">
                    Cargo
                    <div
                      className="ef-dropdown w-full"
                      tabIndex={0}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDropdownsOpen(prev => ({ ...prev, area: false }))
                        }
                      }}
                    >
                      <input
                        className="ef-control w-full"
                        placeholder="Todas las areas"
                        value={dropdownsOpen.area ? areaSearch : filters.area}
                        onFocus={() => {
                          setAreaSearch(filters.area)
                          setDropdownsOpen(prev => ({ ...prev, area: true }))
                        }}
                        onChange={(e) => {
                          setAreaSearch(e.target.value)
                          setFilters((prev) => ({ ...prev, area: e.target.value }))
                          setDropdownsOpen(prev => ({ ...prev, area: true }))
                          if (!e.target.value) setPage(1)
                        }}
                      />
                      {dropdownsOpen.area && (
                        <div className="ef-dropdown-menu">
                          <button
                            type="button"
                            className="ef-dropdown-option text-foreground/70 font-medium"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setFilters((prev) => ({ ...prev, area: '' }))
                              setAreaSearch('')
                              setDropdownsOpen(prev => ({ ...prev, area: false }))
                              setPage(1)
                            }}
                          >
                            Todas las areas
                          </button>
                          {filteredAreaOptions.map(area => (
                            <button
                              key={area}
                              type="button"
                              className="ef-dropdown-option"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFilters((prev) => ({ ...prev, area }))
                                setDropdownsOpen(prev => ({ ...prev, area: false }))
                                setPage(1)
                              }}
                            >
                              {area}
                            </button>
                          ))}
                          {!filteredAreaOptions.length && (
                            <p className="px-3 py-2 text-xs text-foreground/60">Sin coincidencias</p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="candidate-filter-inline">
                    Tipo
                    <FormDropdown
                      value={filters.contractType}
                      options={TIPO_CONTRATO_OPTIONS}
                      onChange={(value) => {
                        setFilters((prev) => ({ ...prev, contractType: value }))
                        setPage(1)
                      }}
                      placeholder="Todos"
                    />
                  </label>
                  <label className="candidate-filter-inline">
                    Modalidad
                    <FormDropdown
                      value={filters.modality}
                      options={MODALIDAD_OPTIONS}
                      onChange={(value) => {
                        setFilters((prev) => ({ ...prev, modality: value }))
                        setPage(1)
                      }}
                      placeholder="Todas"
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
                      placeholder="Todas"
                    />
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

          <div className="space-y-3">

            <section className="space-y-1 candidate-vacantes-list">
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
                <article key={item.id} className="bg-white border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="font-semibold text-lg text-foreground leading-tight mb-1">{item.titulo}</h2>
                      <p className="text-sm font-medium text-foreground/70">{item.empresa_nombre || 'Empresa'}</p>
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary uppercase whitespace-nowrap">
                      {item.modalidad}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-foreground/70 mt-1">
                    <span className="flex items-center gap-1.5 break-all">
                      <svg className="w-3.5 h-3.5 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {item.provincia || 'Provincia N/D'}, {item.ciudad || 'Ciudad N/D'}
                    </span>
                    <span className="flex items-center gap-1.5 break-all">
                      <svg className="w-3.5 h-3.5 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {item.area || 'Area no definida'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item.tipo_contrato?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-1.5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-[11px] text-foreground/50 font-medium">
                      Publicada: {String(item.fecha_publicacion || '').slice(0, 10) || 'N/D'}
                    </div>
                    <button
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${item.postulado
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                        : 'bg-primary/80 text-white hover:bg-primary hover:shadow-lg'
                        }`}
                      type="button"
                      disabled={Boolean(item.postulado) || postingId === item.id}
                      onClick={() => postular(item.id)}
                    >
                      {item.postulado ? 'Ya postulado ✔' : (postingId === item.id ? 'Postulando...' : 'Postular ahora')}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>

        <section className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-foreground/70">Pagina {page} de {totalPages} - Total {total}</div>
          <div className="flex flex-wrap items-center gap-2">
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
              placeholder="20"
            />
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

