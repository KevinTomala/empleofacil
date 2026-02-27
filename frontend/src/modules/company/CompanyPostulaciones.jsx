import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import Header from '../../components/Header'
import FormDropdown from '../../components/FormDropdown'
import VerifiedBadge from '../../components/VerifiedBadge'
import { apiRequest } from '../../services/api'
import { getPerfilById, getPerfilErrorMessage } from '../../services/perfilCandidato.api'
import { downloadPostulacionCurriculumPdf, getPostulacionesErrorMessage } from '../../services/postulaciones.api'
import { showToast } from '../../utils/showToast'
import CandidatoPerfilDrawer from './components/CandidatoPerfilDrawer'
import './company.css'

function formatDateShort(value) {
  if (!value) return 'N/D'
  return String(value).slice(0, 10)
}

function withFallback(value) {
  if (value === null || value === undefined || value === '') return 'N/D'
  return String(value)
}

export default function CompanyPostulaciones() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [vacanteId, setVacanteId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [vacantesOptions, setVacantesOptions] = useState([])
  const [loadingVacantes, setLoadingVacantes] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [drawerPerfil, setDrawerPerfil] = useState(null)
  const [drawerCandidatoName, setDrawerCandidatoName] = useState('')
  const [drawerCandidatoEntity, setDrawerCandidatoEntity] = useState(null)
  const [downloadingPostulacionId, setDownloadingPostulacionId] = useState(0)

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / pageSize)
    return pages > 0 ? pages : 1
  }, [total, pageSize])

  const groups = useMemo(() => {
    const grouped = new Map()
    items.forEach((item) => {
      const key = item.vacante_id || 'sin_vacante'
      if (!grouped.has(key)) {
        grouped.set(key, {
          vacante_id: item.vacante_id,
          vacante_titulo: item.vacante_titulo || 'Vacante',
          candidatos: []
        })
      }
      grouped.get(key).candidatos.push(item)
    })
    return Array.from(grouped.values()).map((group) => ({
      ...group,
      total_grupo: group.candidatos.length
    }))
  }, [items])

  async function fetchPostulaciones() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (q.trim()) params.set('q', q.trim())
      if (vacanteId) params.set('vacante_id', vacanteId)
      const data = await apiRequest(`/api/postulaciones/empresa?${params.toString()}`)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
      setError('')
    } catch (err) {
      const code = err?.payload?.error
      const message = code || err?.message || 'No se pudieron cargar las postulaciones.'
      setItems([])
      setTotal(0)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchVacantesOptions() {
    try {
      setLoadingVacantes(true)
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('page_size', '100')
      params.set('estado', 'activa')
      const data = await apiRequest(`/api/vacantes/mias?${params.toString()}`)
      setVacantesOptions(Array.isArray(data?.items) ? data.items : [])
    } catch (_err) {
      setVacantesOptions([])
    } finally {
      setLoadingVacantes(false)
    }
  }

  useEffect(() => {
    fetchPostulaciones()
  }, [page, pageSize, vacanteId])

  useEffect(() => {
    fetchVacantesOptions()
  }, [])

  const onSearch = (event) => {
    event.preventDefault()
    setPage(1)
    fetchPostulaciones()
  }

  const clearFilters = () => {
    setQ('')
    setVacanteId('')
    setPage(1)
  }

  const handleOpenPerfil = async (candidatoId, candidatoName, candidatoEntity = null) => {
    setDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError('')
    setDrawerPerfil(null)
    setDrawerCandidatoName(candidatoName)
    setDrawerCandidatoEntity(candidatoEntity)
    try {
      const perfil = await getPerfilById(candidatoId)
      setDrawerPerfil(perfil)
    } catch (err) {
      setDrawerError(getPerfilErrorMessage(err, 'No se pudo cargar el perfil del candidato.'))
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleDownloadCurriculum = async (item, candidatoName) => {
    const postulacionId = Number(item?.id || 0)
    if (!Number.isInteger(postulacionId) || postulacionId <= 0) {
      showToast({ type: 'error', message: 'La postulacion seleccionada no es valida.' })
      return
    }

    try {
      setDownloadingPostulacionId(postulacionId)
      const safeName = String(candidatoName || 'candidato').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const { blob, fileName } = await downloadPostulacionCurriculumPdf({
        postulacionId,
        defaultFileName: `CV_${safeName || postulacionId}.pdf`
      })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName || `curriculum_postulacion_${postulacionId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      showToast({ type: 'error', message: getPostulacionesErrorMessage(err, 'No se pudo descargar el curriculum.') })
    } finally {
      setDownloadingPostulacionId(0)
    }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-6">
        <section className="space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold">Postulaciones</h1>
          <p className="text-sm text-foreground/70">
            Candidatos postulados agrupados por vacante.
          </p>
        </section>

        <section className="company-card p-4">
          <form className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end" onSubmit={onSearch}>
            <label className="text-xs text-foreground/65">
              Buscar
              <input
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Nombre, documento o email"
              />
            </label>
            <label className="text-xs text-foreground/65">
              Vacante
              <div className="mt-1" style={{ height: '38px', minWidth: '200px' }}>
                <FormDropdown
                  value={vacanteId}
                  options={[
                    { value: '', label: loadingVacantes ? 'Cargando...' : 'Todas' },
                    ...vacantesOptions.map(v => ({ value: v.id, label: v.titulo || `Vacante #${v.id}` }))
                  ]}
                  onChange={(val) => {
                    setVacanteId(val)
                    setPage(1)
                  }}
                  disabled={loadingVacantes}
                />
              </div>
            </label>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium" type="submit">
              Buscar
            </button>
            <button
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium"
              type="button"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="company-card p-4 text-sm text-foreground/70">
              Cargando postulaciones...
            </div>
          )}
          {!loading && error && (
            <div className="company-card p-4 text-sm text-rose-700">
              {error}
            </div>
          )}
          {!loading && !error && groups.length === 0 && (
            <div className="company-card p-4 text-sm text-foreground/70">
              {q.trim() || vacanteId
                ? 'No hay postulaciones para los filtros seleccionados.'
                : 'No hay postulaciones registradas.'}
            </div>
          )}

          {!loading && !error && groups.map((group) => (
            <article key={group.vacante_id || group.vacante_titulo} className="company-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-base">{group.vacante_titulo}</h2>
                <span className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                  {group.total_grupo} postulados
                </span>
              </div>
              <div className="space-y-2">
                {group.candidatos.map((item) => {
                  const candidatoName = `${item.nombres || ''} ${item.apellidos || ''}`.trim() || 'Candidato'
                  return (
                    <div key={item.id} className="border border-border rounded-lg p-3 bg-background">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 text-xs text-foreground/70">
                          <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                            <span>{candidatoName}</span>
                            <VerifiedBadge entity={item} />
                          </p>
                          <p>Documento: {withFallback(item.documento_identidad)}</p>
                          <p>Email: {withFallback(item.email)}</p>
                          <p>Telefono: {withFallback(item.telefono_celular)}</p>
                          <p>Postulado: {formatDateShort(item.fecha_postulacion)}</p>
                          <p>Estado proceso: {withFallback(item.estado_proceso)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs"
                            onClick={() => handleOpenPerfil(item.candidato_id, candidatoName, item)}
                          >
                            Ver perfil
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 border border-border rounded-lg text-xs inline-flex items-center gap-1.5"
                            onClick={() => handleDownloadCurriculum(item, candidatoName)}
                            disabled={downloadingPostulacionId === Number(item.id)}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {downloadingPostulacionId === Number(item.id) ? 'Descargando...' : 'Descargar CV'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </section>

        {!error && (
          <section className="company-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-foreground/70">Pagina {page} de {totalPages} - Total {total}</div>
            <div className="flex items-center gap-2">
              <div style={{ width: '100px' }}>
                <FormDropdown
                  value={pageSize}
                  options={[
                    { value: 20, label: '20' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' }
                  ]}
                  onChange={(val) => {
                    setPageSize(val)
                    setPage(1)
                  }}
                />
              </div>
              <button
                className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
              >
                Anterior
              </button>
              <button
                className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading}
              >
                Siguiente
              </button>
            </div>
          </section>
        )}
      </main>
      <CandidatoPerfilDrawer
        open={drawerOpen}
        candidatoName={drawerCandidatoName}
        candidatoEntity={drawerCandidatoEntity}
        loading={drawerLoading}
        error={drawerError}
        perfil={drawerPerfil}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerCandidatoEntity(null)
        }}
      />
    </div>
  )
}
