import { useEffect, useMemo, useState } from 'react'
import './company.css'
import { Briefcase, Crown, Eye, FileText, Mail, Users } from 'lucide-react'
import Header from '../../components/Header'
import { apiRequest } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function CompanyCandidatos() {
  const { token } = useAuth()
  const [candidatos, setCandidatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [convocatorias, setConvocatorias] = useState([])
  const [cursos, setCursos] = useState([])
  const [promociones, setPromociones] = useState([])
  const [convocatoriaId, setConvocatoriaId] = useState('')
  const [cursoId, setCursoId] = useState('')
  const [promocionId, setPromocionId] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [refreshFlag, setRefreshFlag] = useState(0)

  useEffect(() => {
    let alive = true

    async function load() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const data = await apiRequest('/api/candidatos?page=1&page_size=50')
        if (!alive) return
        setCandidatos(data.items || [])
        setError('')
      } catch (err) {
        if (!alive) return
        setError(err.message || 'No se pudieron cargar los candidatos.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [token, refreshFlag])

  useEffect(() => {
    let alive = true

    async function loadConvocatorias() {
      if (!token) return
      try {
        setCatalogLoading(true)
        const data = await apiRequest('/api/integraciones/ademy/convocatorias')
        if (!alive) return
        setConvocatorias(data.items || [])
        setCatalogError('')
      } catch (err) {
        if (!alive) return
        setCatalogError(err.message || 'No se pudieron cargar las convocatorias.')
      } finally {
        if (alive) setCatalogLoading(false)
      }
    }

    loadConvocatorias()

    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    let alive = true

    async function loadCursos() {
      if (!token || !convocatoriaId) {
        setCursos([])
        setCursoId('')
        setPromociones([])
        setPromocionId('')
        return
      }
      try {
        setCatalogLoading(true)
        const data = await apiRequest(`/api/integraciones/ademy/convocatorias/${convocatoriaId}/cursos`)
        if (!alive) return
        setCursos(data.items || [])
        setCursoId('')
        setPromociones([])
        setPromocionId('')
        setCatalogError('')
      } catch (err) {
        if (!alive) return
        setCatalogError(err.message || 'No se pudieron cargar los cursos.')
      } finally {
        if (alive) setCatalogLoading(false)
      }
    }

    loadCursos()

    return () => {
      alive = false
    }
  }, [token, convocatoriaId])

  useEffect(() => {
    let alive = true

    async function loadPromociones() {
      if (!token || !convocatoriaId || !cursoId) {
        setPromociones([])
        setPromocionId('')
        return
      }
      try {
        setCatalogLoading(true)
        const data = await apiRequest(
          `/api/integraciones/ademy/convocatorias/${convocatoriaId}/promociones?curso_id=${cursoId}`
        )
        if (!alive) return
        setPromociones(data.items || [])
        setPromocionId('')
        setCatalogError('')
      } catch (err) {
        if (!alive) return
        setCatalogError(err.message || 'No se pudieron cargar las promociones.')
      } finally {
        if (alive) setCatalogLoading(false)
      }
    }

    loadPromociones()

    return () => {
      alive = false
    }
  }, [token, convocatoriaId, cursoId])

  const candidatosUi = useMemo(
    () =>
      candidatos.map((item) => ({
        id: item.id,
        name: `${item.nombres || ''} ${item.apellidos || ''}`.trim() || 'Candidato',
        role: 'Candidato acreditado',
        status: 'Acreditado',
        appliedAt: item.documento_identidad
          ? `Documento: ${item.documento_identidad}`
          : 'Documento: N/D',
        lastActivity: item.email ? `Email: ${item.email}` : 'Email: N/D',
        city: item.nacionalidad ? `Nacionalidad: ${item.nacionalidad}` : 'Nacionalidad: N/D',
        experience: item.fecha_nacimiento
          ? `Nacimiento: ${item.fecha_nacimiento}`
          : 'Nacimiento: N/D',
        education: item.telefono_celular
          ? `Telefono: ${item.telefono_celular}`
          : 'Telefono: N/D',
        availability: 'Acreditado',
        match: 100,
        featured: false,
      })),
    [candidatos]
  )

  const estados = [
    { label: 'Nuevo', count: 4 },
    { label: 'En revision', count: 3 },
    { label: 'Contactado', count: 2 },
    { label: 'Entrevista', count: 1 },
    { label: 'Seleccionado', count: 1 },
    { label: 'Descartado', count: 2 },
  ]

  const estadoClass = (status) => {
    switch (status) {
      case 'Acreditado':
        return 'bg-emerald-100 text-emerald-700'
      case 'Nuevo':
        return 'bg-slate-100 text-slate-600'
      case 'En revision':
        return 'bg-amber-100 text-amber-700'
      case 'Contactado':
        return 'bg-blue-100 text-blue-700'
      case 'Entrevista':
        return 'bg-indigo-100 text-indigo-700'
      case 'Seleccionado':
        return 'bg-emerald-100 text-emerald-700'
      case 'Descartado':
        return 'bg-rose-100 text-rose-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const handleImport = async () => {
    if (!token) return
    try {
      setImporting(true)
      setImportStatus('')
      const payload = {}
      if (promocionId) payload.promocion_id = Number(promocionId)
      if (!payload.promocion_id && cursoId) payload.curso_id = Number(cursoId)

      const result = await apiRequest('/api/integraciones/ademy/acreditados/import', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setImportStatus(
        `Importacion completada: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos.`
      )
      setRefreshFlag((value) => value + 1)
    } catch (err) {
      setImportStatus(err.message || 'No se pudo importar los acreditados.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
                Candidatos
              </h1>
              <p className="text-sm text-foreground/70">
                Operacion diaria del reclutador con filtros y estados del proceso.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {estados.map((estado, index) => (
                <button
                  key={estado.label}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border border-border ${
                    index === 0 ? 'bg-primary text-white border-transparent' : 'bg-secondary text-foreground/70'
                  }`}
                >
                  {estado.label} ({estado.count})
                </button>
              ))}
            </div>
          </div>

          <div className="company-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Filtros potentes
              </div>
              <button
                className="text-sm text-primary font-semibold"
                onClick={() => {
                  setConvocatoriaId('')
                  setCursoId('')
                  setPromocionId('')
                }}
              >
                Limpiar filtros
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-foreground/60">Convocatoria</span>
                <select
                  value={convocatoriaId}
                  onChange={(event) => setConvocatoriaId(event.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground/70"
                  disabled={catalogLoading}
                >
                  <option value="">Seleccionar</option>
                  {convocatorias.map((convocatoria) => (
                    <option key={convocatoria.id} value={convocatoria.id}>
                      {convocatoria.codigo} - {convocatoria.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-foreground/60">Curso</span>
                <select
                  value={cursoId}
                  onChange={(event) => setCursoId(event.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground/70"
                  disabled={!convocatoriaId || catalogLoading}
                >
                  <option value="">Seleccionar</option>
                  {cursos.map((curso) => (
                    <option key={curso.curso_id || curso.id} value={curso.curso_id || curso.id}>
                      {curso.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-foreground/60">Promocion</span>
                <select
                  value={promocionId}
                  onChange={(event) => setPromocionId(event.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground/70"
                  disabled={!convocatoriaId || !cursoId || catalogLoading}
                >
                  <option value="">Seleccionar</option>
                  {promociones.filter((promo) => promo.estado === 'finalizado').map((promo) => (
                    <option key={promo.id} value={promo.id}>
                      {promo.numero_promocion} ({promo.estado})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                  onClick={handleImport}
                  disabled={importing || !token}
                >
                  {importing ? 'Importando...' : 'Importar acreditados'}
                </button>
              </div>
            </div>
            {catalogError && (
              <p className="mt-2 text-xs text-rose-600">{catalogError}</p>
            )}
            {importStatus && (
              <p className="mt-3 text-xs text-foreground/70">{importStatus}</p>
            )}
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="company-list space-y-2">
            {!token && (
              <div className="company-card p-4 text-sm text-foreground/70">
                Inicia sesion para ver candidatos acreditados.
              </div>
            )}
            {token && loading && (
              <div className="company-card p-4 text-sm text-foreground/70">
                Cargando candidatos acreditados...
              </div>
            )}
            {token && !loading && error && (
              <div className="company-card p-4 text-sm text-rose-600">
                {error}
              </div>
            )}
            {token && !loading && !error && candidatosUi.length === 0 && (
              <div className="company-card p-4 text-sm text-foreground/70">
                No hay candidatos acreditados disponibles.
              </div>
            )}
            {token && candidatosUi.map((candidato) => (
              <article
                key={candidato.id}
                className="company-card p-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoClass(
                          candidato.status
                        )}`}
                      >
                        {candidato.status}
                      </span>
                      <span className="text-xs text-foreground/50">{candidato.role}</span>
                    </div>
                    <h3 className="font-heading text-sm font-semibold">{candidato.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                      <span>
                        {candidato.city} ? {candidato.experience} ? {candidato.education}
                      </span>
                      <span>{candidato.appliedAt}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                      <span>{candidato.lastActivity}</span>
                      <span>{candidato.availability}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg flex items-center gap-2">
                      <Users className="w-4 h-4" /> Ver perfil
                    </button>
                    <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Cambiar estado
                    </button>
                    <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Enviar mensaje
                    </button>
                    <button className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                      <Crown className="w-4 h-4" /> Destacar
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-foreground/60">
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> {candidato.match}% coincidencia
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> {candidato.role}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> {candidato.status}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="company-card p-4 bg-secondary/60 shadow-none">
              <h3 className="font-heading text-sm font-semibold">Agrupaciones clave</h3>
              <p className="text-sm text-foreground/70 mt-1">
                Vista rapida por vacante y estado del proceso.
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Supervisor de Operaciones', value: '5 candidatos' },
                  { label: 'Auxiliar Administrativo', value: '3 candidatos' },
                  { label: 'Analista de Logistica', value: '4 candidatos' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none">
              <h3 className="font-heading text-sm font-semibold">Estado del proceso</h3>
              <div className="mt-4 space-y-3 text-sm text-foreground/70">
                {[
                  'Nuevo (4)',
                  'En revision (3)',
                  'Contactado (2)',
                  'Entrevista (1)',
                  'Seleccionado (1)',
                  'Descartado (2)',
                ].map((estado) => (
                  <div key={estado} className="flex items-center justify-between">
                    <span>{estado}</span>
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
