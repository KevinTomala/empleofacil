import { Briefcase, MapPin, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from '../../components/Header'
import provincesData from '../../assets/provincias.json'
import './candidate.css'

const VACANTES = [
  {
    title: 'Asistente Operativo',
    company: 'Servicios S.A.',
    city: 'GUAYAQUIL',
    province: 'GUAYAS',
    area: 'Operaciones',
    contractType: 'Tiempo completo',
    modality: 'Presencial',
    posted: 'Hoy',
  },
  {
    title: 'Supervisor de Operaciones',
    company: 'Centro Comercial',
    city: 'QUITO',
    province: 'PICHINCHA',
    area: 'Operaciones',
    contractType: 'Turnos rotativos',
    modality: 'Presencial',
    posted: 'Esta semana',
  },
  {
    title: 'Auxiliar Administrativo',
    company: 'Logistica Pro',
    city: 'GUAYAQUIL',
    province: 'GUAYAS',
    area: 'Administrativo',
    contractType: 'Medio tiempo',
    modality: 'Hibrido',
    posted: 'Ultimos 7 dias',
  },
  {
    title: 'Recepcionista',
    company: 'Hotel Plaza',
    city: 'QUITO',
    province: 'PICHINCHA',
    area: 'Atencion al cliente',
    contractType: 'Tiempo completo',
    modality: 'Presencial',
    posted: 'Hoy',
  },
  {
    title: 'Asistente Comercial',
    company: 'Retail Group',
    city: 'GUAYAQUIL',
    province: 'GUAYAS',
    area: 'Comercial',
    contractType: 'Tiempo completo',
    modality: 'Presencial',
    posted: 'Este mes',
  },
  {
    title: 'Soporte Administrativo',
    company: 'Consultoria Andina',
    city: 'QUITO',
    province: 'PICHINCHA',
    area: 'Administrativo',
    contractType: 'Tiempo completo',
    modality: 'Remoto',
    posted: 'Esta semana',
  },
]

const SELECTED_FILL = '#2d4b9b'

export default function CandidateVacantes() {
  const svgDocRef = useRef(null)
  const [selectedProvince, setSelectedProvince] = useState('')
  const [filters, setFilters] = useState({
    city: '',
    area: '',
    contractType: '',
    modality: '',
    posted: '',
  })

  const normalizeName = useCallback((value) => {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
  }, [])

  const provinceOptions = useMemo(() => {
    return Object.values(provincesData)
      .map((item) => item.provincia)
      .filter(Boolean)
      .map((prov) => ({
        value: normalizeName(prov),
        label: prov,
      }))
  }, [normalizeName])

  const cityOptions = useMemo(() => {
    if (!selectedProvince) return []
    const entry = Object.values(provincesData).find(
      (item) => normalizeName(item.provincia) === selectedProvince
    )
    if (!entry?.cantones) return []
    return Object.values(entry.cantones)
      .map((canton) => canton.canton)
      .filter(Boolean)
  }, [selectedProvince])

  const filteredVacantes = useMemo(() => {
    return VACANTES.filter((item) => {
      if (selectedProvince && item.province !== selectedProvince) return false
      if (filters.city && item.city !== filters.city) return false
      if (filters.area && item.area !== filters.area) return false
      if (filters.contractType && item.contractType !== filters.contractType) return false
      if (filters.modality && item.modality !== filters.modality) return false
      if (filters.posted && item.posted !== filters.posted) return false
      return true
    })
  }, [selectedProvince, filters])

  const showFilters = Boolean(selectedProvince)

  const options = useMemo(() => {
    const uniq = (key) => Array.from(new Set(VACANTES.map((v) => v[key])))
    return {
      areas: uniq('area'),
      contractTypes: uniq('contractType'),
      modalities: uniq('modality'),
      posted: uniq('posted'),
    }
  }, [])

  const handleSvgLoad = useCallback((event) => {
    const svgDoc = event.currentTarget?.contentDocument
    if (!svgDoc) return

    svgDocRef.current = svgDoc
    const paths = svgDoc.querySelectorAll('#features path')
    paths.forEach((path) => {
      const hasTitle = path.querySelector('title')
      if (hasTitle) return

      const name = path.getAttribute('name') || path.getAttribute('id')
      if (!name) return

      const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = name
      path.prepend(title)

      if (!path.getAttribute('data-original-fill')) {
        const originalFill = path.getAttribute('fill') || ''
        path.setAttribute('data-original-fill', originalFill)
      }

      path.style.cursor = 'pointer'
      path.addEventListener('click', () => {
        const normalized = normalizeName(name)
        setSelectedProvince((current) => (current === normalized ? '' : normalized))
        setFilters((prev) => ({ ...prev, city: '' }))
      })
    })
  }, [normalizeName])

  useEffect(() => {
    const svgDoc = svgDocRef.current
    if (!svgDoc) return

    const paths = svgDoc.querySelectorAll('#features path')
    paths.forEach((path) => {
      const name = path.getAttribute('name') || path.getAttribute('id')
      if (!name) return
      if (selectedProvince === name) {
        path.style.fill = SELECTED_FILL
      } else {
        const originalFill = path.getAttribute('data-original-fill')
        if (originalFill) {
          path.style.fill = originalFill
        } else {
          path.style.removeProperty('fill')
        }
      }
    })
  }, [selectedProvince])

  return (
    <div className="candidate-page">
      <Header />
      <main className="page-container candidate-content space-y-10">
        <section className="space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
            <Star className="w-4 h-4" /> Vacantes recomendadas
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Explora vacantes activas</h1>
          <p className="text-foreground/70 max-w-2xl">
            Encuentra oportunidades verificadas y postula con un solo clic.
          </p>
        </section>

        <section className="candidate-vacantes-grid">
          <div className="candidate-vacantes-list">
            {filteredVacantes.length === 0 && (
              <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">
                No hay vacantes disponibles para {selectedProvince || 'esta busqueda'}.
              </div>
            )}
            {filteredVacantes.map((item) => (
              <article key={`${item.title}-${item.city}`} className="candidate-job-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg">{item.title}</h2>
                    <p className="text-sm text-foreground/70">{item.company}</p>
                  </div>
                  <Briefcase className="w-5 h-5 text-accent" />
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/60 mt-3">
                  <MapPin className="w-3 h-3" /> {item.city} • {item.contractType}
                </div>
                <div className="mt-2 text-xs text-foreground/60">
                  {item.area} • {item.modality} • {item.posted}
                </div>
                <button className="candidate-cta">Postular ahora</button>
              </article>
            ))}
          </div>

          <aside className="candidate-filters-panel">
            {!showFilters ? (
              <div className="bg-white border border-border rounded-2xl p-6 shadow-sm candidate-map-card">
                <h2 className="font-heading text-lg font-semibold mb-3">Filtra por provincia</h2>
                <p className="text-sm text-foreground/70 mb-4">
                  Haz clic en cualquier provincia para filtrar las vacantes.
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
                      value={selectedProvince}
                      onChange={(event) => {
                        setSelectedProvince(event.target.value)
                        setFilters((prev) => ({ ...prev, city: '' }))
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
                      value={filters.city}
                      onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
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
                      value={filters.area}
                      onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))}
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
                      value={filters.contractType}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, contractType: event.target.value }))
                      }
                    >
                      <option value="">Todos</option>
                      {options.contractTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Modalidad
                    <select
                      value={filters.modality}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, modality: event.target.value }))
                      }
                    >
                      <option value="">Todas</option>
                      {options.modalities.map((modality) => (
                        <option key={modality} value={modality}>
                          {modality}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="candidate-filter-inline">
                    Fecha
                    <select
                      value={filters.posted}
                      onChange={(event) => setFilters((prev) => ({ ...prev, posted: event.target.value }))}
                    >
                      <option value="">Todas</option>
                      {options.posted.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="candidate-reset"
                    onClick={() => {
                      setSelectedProvince('')
                      setFilters({
                        city: '',
                        area: '',
                        contractType: '',
                        modality: '',
                        posted: '',
                      })
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}
