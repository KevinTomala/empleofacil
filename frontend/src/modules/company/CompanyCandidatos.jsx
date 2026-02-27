import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import './company.css'
import { Briefcase, Crown, FileText, MessageCircleMore, Search, Users, X } from 'lucide-react'
import Header from '../../components/Header'
import VerifiedBadge from '../../components/VerifiedBadge'
import { apiRequest } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { createMensajesVacanteConversation, getMensajesErrorMessage } from '../../services/mensajes.api'
import { showToast } from '../../utils/showToast'
import CandidatoPerfilProfesionalModal from './components/CandidatoPerfilProfesionalModal'

export default function CompanyCandidatos() {
  const navigate = useNavigate()
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

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileCandidato, setProfileCandidato] = useState(null)

  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [messageTarget, setMessageTarget] = useState(null)
  const [vacantes, setVacantes] = useState([])
  const [vacantesLoading, setVacantesLoading] = useState(false)
  const [vacanteId, setVacanteId] = useState('')
  const [vacantePostulaciones, setVacantePostulaciones] = useState([])
  const [postulacionesLoading, setPostulacionesLoading] = useState(false)
  const [openingConversation, setOpeningConversation] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350)
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
        const data = await apiRequest(`/api/integraciones/ademy/convocatorias/${convocatoriaId}/promociones?curso_id=${cursoId}`)
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
    () => candidatos.map((item) => ({
      id: item.id,
      name: `${item.nombres || ''} ${item.apellidos || ''}`.trim() || 'Candidato',
      documento: item.documento_identidad || 'N/D',
      nacionalidad: item.nacionalidad || 'N/D',
      fechaNacimiento: item.fecha_nacimiento || 'N/D',
      verificacion_cuenta_estado: item.verificacion_cuenta_estado || null,
      candidato_verificado: Number(item.candidato_verificado || 0) === 1
    })),
    [candidatos]
  )

  const selectedVacante = useMemo(() => vacantes.find((item) => String(item.id) === String(vacanteId)) || null, [vacantes, vacanteId])
  const targetHasPostulacion = useMemo(() => {
    if (!messageTarget?.id || !vacantePostulaciones.length) return false
    return vacantePostulaciones.some((item) => Number(item?.candidato_id) === Number(messageTarget.id))
  }, [messageTarget, vacantePostulaciones])
  const handleImport = async () => {
    if (!token) return
    try {
      setImporting(true)
      setImportStatus('')
      const payload = {}
      if (promocionId) payload.promocion_id = Number(promocionId)
      if (!payload.promocion_id && cursoId) payload.curso_id = Number(cursoId)
      const result = await apiRequest('/api/integraciones/ademy/acreditados/import', { method: 'POST', body: JSON.stringify(payload) })
      setImportStatus(`Importacion completada: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos.`)
      setRefreshFlag((value) => value + 1)
    } catch (err) {
      setImportStatus(err.message || 'No se pudo importar los acreditados.')
    } finally {
      setImporting(false)
    }
  }

  const handleOpenPerfil = async (candidato) => {
    setProfileCandidato(candidato)
    setProfileModalOpen(true)
  }

  const clearSearch = () => {
    setQuery('')
    setPage(1)
  }

  const closeMessageModal = () => {
    setMessageModalOpen(false)
    setMessageTarget(null)
    setVacanteId('')
    setVacantePostulaciones([])
  }

  const handleOpenMessageModal = async (candidato) => {
    setMessageModalOpen(true)
    setMessageTarget(candidato)
    setVacanteId('')
    setVacantePostulaciones([])
    try {
      setVacantesLoading(true)
      const data = await apiRequest('/api/vacantes/mias?page=1&page_size=200&estado=activa')
      setVacantes(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      setVacantes([])
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudieron cargar tus vacantes activas.') })
    } finally {
      setVacantesLoading(false)
    }
  }

  const handleVacanteChange = async (nextVacanteId) => {
    setVacanteId(nextVacanteId)
    setVacantePostulaciones([])
    const parsed = Number(nextVacanteId)
    if (!Number.isInteger(parsed) || parsed <= 0) return
    try {
      setPostulacionesLoading(true)
      const data = await apiRequest(`/api/postulaciones/empresa?vacante_id=${parsed}&page=1&page_size=500`)
      setVacantePostulaciones(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      setVacantePostulaciones([])
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudieron validar los postulantes de la vacante.') })
    } finally {
      setPostulacionesLoading(false)
    }
  }

  const handleOpenConversation = async () => {
    if (!messageTarget?.id) return
    const parsedVacanteId = Number(vacanteId)
    if (!Number.isInteger(parsedVacanteId) || parsedVacanteId <= 0) {
      showToast({ type: 'warning', message: 'Selecciona una vacante activa.' })
      return
    }
    if (!targetHasPostulacion) {
      showToast({ type: 'warning', message: 'El candidato no tiene postulacion en esta vacante.' })
      return
    }
    try {
      setOpeningConversation(true)
      const response = await createMensajesVacanteConversation({ vacante_id: parsedVacanteId, candidato_id: Number(messageTarget.id) })
      const conversationId = Number(response?.conversacion?.id || 0)
      closeMessageModal()
      if (conversationId > 0) navigate(`/app/company/mensajes?conv=${conversationId}`)
      else navigate('/app/company/mensajes')
    } catch (err) {
      showToast({ type: 'error', message: getMensajesErrorMessage(err, 'No se pudo abrir la conversacion del candidato.') })
    } finally {
      setOpeningConversation(false)
    }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">{canImportAcreditados ? 'Importaciones' : 'Candidatos'}</h1>
              <p className="text-sm text-foreground/70 max-w-2xl">
                {canImportAcreditados
                  ? 'Importacion interna de acreditados y monitoreo rapido de resultados.'
                  : 'Vista profesional de candidatos con foco en experiencia, formacion y contacto interno.'}
              </p>
            </div>
            {!canImportAcreditados ? (
              <div className="company-candidate-stat">
                <p className="company-candidate-stat-label">Resultados visibles</p>
                <p className="company-candidate-stat-value">{candidatosUi.length}</p>
              </div>
            ) : null}
          </div>

          {canImportAcreditados ? (
            <div className="company-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm font-medium"><FileText className="w-4 h-4 text-primary" />Importacion interna de acreditados</div>
                <button className="text-sm text-primary font-semibold" onClick={() => { setConvocatoriaId(''); setCursoId(''); setPromocionId('') }}>Limpiar filtros</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
                <div className="flex flex-col gap-1"><span className="text-xs text-foreground/60">Convocatoria</span><div style={{ minWidth: '150px' }}><FormDropdown value={convocatoriaId} options={[{ value: '', label: 'Seleccionar' }, ...convocatorias.map(c => ({ value: c.id, label: `${c.codigo} - ${c.nombre}` }))]} onChange={(val) => setConvocatoriaId(val)} disabled={catalogLoading} /></div></div>
                <div className="flex flex-col gap-1"><span className="text-xs text-foreground/60">Curso</span><div style={{ minWidth: '150px' }}><FormDropdown value={cursoId} options={[{ value: '', label: 'Seleccionar' }, ...cursos.map(c => ({ value: c.curso_id || c.id, label: c.nombre }))]} onChange={(val) => setCursoId(val)} disabled={!convocatoriaId || catalogLoading} /></div></div>
                <div className="flex flex-col gap-1"><span className="text-xs text-foreground/60">Promocion</span><div style={{ minWidth: '150px' }}><FormDropdown value={promocionId} options={[{ value: '', label: 'Seleccionar' }, ...promociones.filter(p => p.estado === 'finalizado').map(p => ({ value: p.id, label: `${p.numero_promocion} (${p.estado})` }))]} onChange={(val) => setPromocionId(val)} disabled={!convocatoriaId || !cursoId || catalogLoading} /></div></div>
                <div className="flex items-end"><button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60" onClick={handleImport} disabled={importing || !token}>{importing ? 'Importando...' : 'Importar acreditados'}</button></div>
              </div>
              {catalogError && <p className="mt-2 text-xs text-rose-600">{catalogError}</p>}
              {importStatus && <p className="mt-3 text-xs text-foreground/70">{importStatus}</p>}
            </div>
          ) : (
            <div className="company-card p-4 text-sm text-foreground/70">Tu cuenta puede consumir candidatos ya sincronizados.</div>
          )}
        </section>

        <section className="space-y-4">
          <div className="company-card p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
              <div className="flex-1">
                <label className="block text-xs text-foreground/60 mb-1">Buscar candidato</label>
                <label className="company-candidate-search"><Search className="w-4 h-4" /><input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" type="search" placeholder="Nombre, apellido o documento" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label>
              </div>
              <div className="flex items-center gap-2">
                <div><label className="block text-xs text-foreground/60 mb-1">Tamano pagina</label><div style={{ width: '100px' }}><FormDropdown value={pageSize} options={[{ value: 20, label: '20' }, { value: 50, label: '50' }, { value: 100, label: '100' }]} onChange={(val) => { setPageSize(Number(val) || 20); setPage(1) }} /></div></div>
                <button type="button" className="px-3 py-2 border border-border rounded-lg text-sm" onClick={clearSearch} disabled={!query && !debouncedQuery}>Limpiar</button>
              </div>
            </div>
          </div>

          <div className="company-list space-y-2">
            {!token && <div className="company-card p-4 text-sm text-foreground/70">Inicia sesion para ver candidatos acreditados.</div>}
            {token && loading && candidatosUi.length === 0 && <div className="company-card p-4 text-sm text-foreground/70">Cargando candidatos acreditados...</div>}
            {token && !loading && isFetching && <div className="company-card p-4 text-sm text-foreground/70">Actualizando resultados...</div>}
            {token && !loading && error && <div className="company-card p-4 text-sm text-rose-600">{error}</div>}
            {token && !loading && !error && candidatosUi.length === 0 && debouncedQuery && <div className="company-card p-4 text-sm text-foreground/70">No se encontraron candidatos para "{debouncedQuery}".</div>}
            {token && !loading && !error && candidatosUi.length === 0 && !debouncedQuery && <div className="company-card p-4 text-sm text-foreground/70">No hay candidatos acreditados disponibles.</div>}
            {token && candidatosUi.map((candidato) => (
              <article key={candidato.id} className="company-card p-4 company-candidate-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Perfil protegido</span></div>
                    <h3 className="font-heading text-base font-semibold truncate inline-flex items-center gap-1.5">
                      <span>{candidato.name}</span>
                      <VerifiedBadge entity={candidato} />
                    </h3>
                    <div className="company-candidate-meta">
                      <p>Documento: {candidato.documento}</p>
                      <p>Nacionalidad: {candidato.nacionalidad}</p>
                      <p>Nacimiento: {candidato.fechaNacimiento}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                    <button type="button" className="px-3 py-1.5 bg-primary text-white rounded-lg flex items-center gap-2" onClick={() => handleOpenPerfil(candidato)}><Users className="w-4 h-4" /> Perfil profesional</button>
                    {!canImportAcreditados ? (
                      <>
                        <button type="button" className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2"><Briefcase className="w-4 h-4" /> Cambiar estado</button>
                        <button type="button" className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2" onClick={() => handleOpenMessageModal(candidato)}><MessageCircleMore className="w-4 h-4" /> Enviar mensaje</button>
                        <button type="button" className="px-3 py-1.5 border border-border rounded-lg flex items-center gap-2"><Crown className="w-4 h-4" /> Destacar</button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {token && !error && (
            <div className="company-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="text-foreground/70">Pagina {page} - Resultados actuales: {candidatosUi.length}</div>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading || isFetching}>Anterior</button>
                <button type="button" className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50" onClick={() => setPage((current) => current + 1)} disabled={!hasNext || loading || isFetching}>Siguiente</button>
              </div>
            </div>
          )}
        </section>
      </main>

      <CandidatoPerfilProfesionalModal
        open={profileModalOpen}
        candidate={profileCandidato}
        onClose={() => setProfileModalOpen(false)}
        onSendMessage={(candidate) => {
          if (!candidate) return
          setProfileModalOpen(false)
          handleOpenMessageModal(candidate)
        }}
      />

      {messageModalOpen ? (
        <div className="efmsg-modal">
          <div className="efmsg-modal-backdrop" onClick={closeMessageModal} />
          <section className="efmsg-modal-card">
            <div className="efmsg-modal-head">
              <h3>Contactar por mensajeria interna</h3>
              <button type="button" className="efmsg-icon-btn" onClick={closeMessageModal} aria-label="Cerrar modal"><X className="w-4 h-4" /></button>
            </div>
            <div className="company-candidate-message-context">
              <p className="text-sm font-semibold inline-flex items-center gap-1.5">
                <span>{messageTarget?.name || 'Candidato'}</span>
                <VerifiedBadge entity={messageTarget} />
              </p>
              <p className="text-xs text-foreground/70">El contacto se gestiona dentro del sistema. Selecciona una vacante donde este candidato haya postulado.</p>
            </div>
            <div className="efmsg-modal-form">
              <label>
                Vacante activa
                <div className="mt-1" style={{ minHeight: '40px' }}>
                  <FormDropdown value={vacanteId} options={[{ value: '', label: vacantesLoading ? 'Cargando vacantes...' : 'Seleccionar vacante' }, ...vacantes.map((item) => ({ value: item.id, label: item.titulo || `Vacante #${item.id}` }))]} onChange={handleVacanteChange} disabled={vacantesLoading || openingConversation} />
                </div>
              </label>
              {!vacantesLoading && !vacantes.length && <p className="efmsg-selector-help">No tienes vacantes activas para iniciar conversaciones.</p>}
              {!!selectedVacante && postulacionesLoading && <p className="efmsg-selector-help">Validando postulaciones de la vacante...</p>}
              {!!selectedVacante && !postulacionesLoading && !targetHasPostulacion && <p className="company-candidate-warning">Este candidato no tiene postulacion en la vacante seleccionada.</p>}
              {!!selectedVacante && !postulacionesLoading && targetHasPostulacion && <p className="company-candidate-ok">Candidato validado. Puedes abrir o continuar la conversacion.</p>}
            </div>
            <div className="company-candidate-modal-actions">
              <button type="button" className="company-candidate-btn company-candidate-btn-secondary" onClick={closeMessageModal}>Cancelar</button>
              <button type="button" className="company-candidate-btn company-candidate-btn-primary" onClick={handleOpenConversation} disabled={openingConversation || !targetHasPostulacion}>{openingConversation ? 'Abriendo...' : 'Abrir conversacion'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
