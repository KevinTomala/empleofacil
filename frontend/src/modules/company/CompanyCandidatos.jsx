import { useEffect, useMemo, useState } from 'react'
import './company.css'
import { Briefcase, Crown, FileText, Mail, Users } from 'lucide-react'
import Header from '../../components/Header'
import { apiRequest } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import CandidatoPerfilDrawer from './components/CandidatoPerfilDrawer'
import { getPerfilById, getPerfilErrorMessage } from '../../services/perfilCandidato.api'

export default function CompanyCandidatos() {
  const { token, user } = useAuth()
  const canImportAcreditados = user?.rol === 'administrador' || user?.rol === 'superadmin'
  const [candidatos, setCandidatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [hasNext, setHasNext] = useState(false)
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [drawerPerfil, setDrawerPerfil] = useState(null)
  const [drawerCandidatoName, setDrawerCandidatoName] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    let alive = true

    async function load() {
      if (!token) {
        setCandidatos([])
        setHasNext(false)
        setLoading(false)
        setIsFetching(false)
        return
      }
      try {
        setLoading(candidatos.length === 0 || page === 1)
        setIsFetching(true)
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('page_size', String(pageSize))
        if (debouncedQuery) params.set('q', debouncedQuery)
        const data = await apiRequest(`/api/candidatos?${params.toString()}`)
        if (!alive) return
        const items = Array.isArray(data?.items) ? data.items : []
        setCandidatos(items)
        setHasNext(items.length === pageSize)
        setError('')
      } catch (err) {
        if (!alive) return
        setHasNext(false)
        setError(err.message || 'No se pudieron cargar los candidatos.')
      } finally {
        if (alive) {
          setLoading(false)
          setIsFetching(false)
        }
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [token, page, pageSize, debouncedQuery, refreshFlag])

  useEffect(() => {
    let alive = true

    async function loadConvocatorias() {
      if (!token || !canImportAcreditados) return
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
  }, [token, canImportAcreditados])

  useEffect(() => {
    let alive = true

    async function loadCursos() {
      if (!token || !canImportAcreditados || !convocatoriaId) {
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
  }, [token, canImportAcreditados, convocatoriaId])

  useEffect(() => {
    let alive = true

    async function loadPromociones() {
      if (!token || !canImportAcreditados || !convocatoriaId || !cursoId) {
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
  }, [token, canImportAcreditados, convocatoriaId, cursoId])

  const candidatosUi = useMemo(
    () =>
      candidatos.map((item) => ({
        id: item.id,
        name: `${item.nombres || ''} ${item.apellidos || ''}`.trim() || 'Candidato',
        status: 'Acreditado',
        documento: item.documento_identidad || 'N/D',
        email: item.email || 'N/D',
        telefono: item.telefono_celular || 'N/D',
        nacionalidad: item.nacionalidad || 'N/D',
        fechaNacimiento: item.fecha_nacimiento || 'N/D'
      })),
    [candidatos]
  )

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

  const handleOpenPerfil = async (candidatoId, candidatoName) => {
    setDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError('')
    setDrawerPerfil(null)
    setDrawerCandidatoName(candidatoName)
    try {
      const perfil = await getPerfilById(candidatoId)
      setDrawerPerfil(perfil)
    } catch (err) {
      setDrawerError(getPerfilErrorMessage(err, 'No se pudo cargar el perfil del candidato.'))
    } finally {
      setDrawerLoading(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setPage(1)
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
                {canImportAcreditados ? 'Importaciones' : 'Candidatos'}
              </h1>
              <p className="text-sm text-foreground/70">
                {canImportAcreditados
                  ? 'Importacion interna de acreditados y monitoreo rapido de resultados.'
                  : 'Busqueda de candidatos acreditados con paginacion y acciones de reclutamiento.'}
              </p>
            </div>
          </div>

          {canImportAcreditados ? (
            <div className="company-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  Importacion interna de acreditados
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
          ) : (
            <div className="company-card p-4 text-sm text-foreground/70">
              Tu cuenta puede consumir candidatos ya sincronizados.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="company-card p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
              <div className="flex-1">
                <label className="block text-xs text-foreground/60 mb-1">Buscar candidato</label>
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  type="search"
                  placeholder="Nombre, apellido, documento o email"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">Tamano pagina</label>
                  <select
                    className="border border-border rounded-lg px-2 py-2 text-sm bg-background"
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
                </div>
                <button
                  type="button"
                  className="px-3 py-2 border border-border rounded-lg text-sm"
                  onClick={clearSearch}
                  disabled={!query && !debouncedQuery}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="company-list space-y-2">
            {!token && (
              <div className="company-card p-4 text-sm text-foreground/70">
                Inicia sesion para ver candidatos acreditados.
              </div>
            )}
            {token && loading && candidatosUi.length === 0 && (
              <div className="company-card p-4 text-sm text-foreground/70">
                Cargando candidatos acreditados...
              </div>
            )}
            {token && !loading && isFetching && (
              <div className="company-card p-4 text-sm text-foreground/70">
                Actualizando resultados...
              </div>
            )}
            {token && !loading && error && (
              <div className="company-card p-4 text-sm text-rose-600">
                {error}
              </div>
            )}
            {token && !loading && !error && candidatosUi.length === 0 && debouncedQuery && (
              <div className="company-card p-4 text-sm text-foreground/70">
                No se encontraron candidatos para "{debouncedQuery}".
              </div>
            )}
            {token && !loading && !error && candidatosUi.length === 0 && !debouncedQuery && (
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
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {candidato.status}
                      </span>
                    </div>
                    <h3 className="font-heading text-sm font-semibold">{candidato.name}</h3>
                    <div className="space-y-1 text-xs text-foreground/65">
                      <p>Documento: {candidato.documento}</p>
                      <p>Email: {candidato.email}</p>
                      <p>Telefono: {candidato.telefono}</p>
                      <p>Nacionalidad: {candidato.nacionalidad}</p>
                      <p>Nacimiento: {candidato.fechaNacimiento}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-primary text-white rounded-lg flex items-center gap-2"
                      onClick={() => handleOpenPerfil(candidato.id, candidato.name)}
                    >
                      <Users className="w-4 h-4" /> Ver perfil
                    </button>
                    {!canImportAcreditados ? (
                      <>
                        <button type="button" className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                          <Briefcase className="w-4 h-4" /> Cambiar estado
                        </button>
                        <button type="button" className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                          <Mail className="w-4 h-4" /> Enviar mensaje
                        </button>
                        <button type="button" className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2">
                          <Crown className="w-4 h-4" /> Destacar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {token && !error && (
            <div className="company-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="text-foreground/70">
                Pagina {page} · Resultados actuales: {candidatosUi.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading || isFetching}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNext || loading || isFetching}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <CandidatoPerfilDrawer
        open={drawerOpen}
        candidatoName={drawerCandidatoName}
        loading={drawerLoading}
        error={drawerError}
        perfil={drawerPerfil}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
