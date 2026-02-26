import { AlertCircle, CheckCircle2, Download, Eye, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { getMyCandidateSocialConfig, getSocialErrorMessage, updateMyCandidateSocialConfig } from '../../services/social.api'
import { showToast } from '../../utils/showToast'
import { getMyHojaVida, getMyHojaVidaPdf, getMyPerfil, getPerfilErrorMessage } from '../../services/perfilCandidato.api'
import { buildProfileSections, getNextPendingRoute, getProfileProgressMetrics } from './profileSections'
import { PdfPreviewViewer } from './PdfPreviewViewer'

export default function CandidateProfile() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState(false)
  const [socialConfig, setSocialConfig] = useState(null)
  const [loadingSocialConfig, setLoadingSocialConfig] = useState(true)
  const [savingSocialConfig, setSavingSocialConfig] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [pdfPreviewInlineOpen, setPdfPreviewInlineOpen] = useState(false)
  const [pdfBlobCache, setPdfBlobCache] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('hoja_vida.pdf')
  const [curriculumPreviewData, setCurriculumPreviewData] = useState(null)

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return
        setPerfil(data)
        setError('')
      } catch (err) {
        if (!active) return
        setError(getPerfilErrorMessage(err, 'No se pudo cargar tu perfil.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPerfil()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadSocialConfig() {
      try {
        setLoadingSocialConfig(true)
        const data = await getMyCandidateSocialConfig()
        if (!active) return
        setSocialConfig(data?.config || { perfil_publico: false, alias_publico: null, titular_publico: null })
      } catch (err) {
        if (!active) return
        setSocialConfig({ perfil_publico: false, alias_publico: null, titular_publico: null })
        showToast({
          type: 'error',
          message: getSocialErrorMessage(err, 'No se pudo cargar la visibilidad de tu perfil publico.'),
        })
      } finally {
        if (active) setLoadingSocialConfig(false)
      }
    }

    loadSocialConfig()

    return () => {
      active = false
    }
  }, [])

  const sections = useMemo(() => buildProfileSections(perfil), [perfil])
  const {
    requiredSections,
    recommendedSections,
    phase2Sections,
    progressFase1,
    progressGeneral,
    completedRequired,
    completedRecommended,
    pendingRequired,
    pendingRecommended
  } = useMemo(() => getProfileProgressMetrics(sections), [sections])

  const nextRoute = getNextPendingRoute(sections, '/perfil/perfil') || '/perfil/perfil'

  const visibilityLabel = progressFase1 >= 90 ? 'Alta' : progressFase1 >= 60 ? 'Media' : 'Baja'
  const matchScore = Math.min(95, 35 + completedRequired * 25 + completedRecommended * 10)

  const recommendationText =
    pendingRequired > 0
      ? 'Completa las secciones obligatorias para mantener tu perfil visible.'
      : pendingRecommended > 0
      ? 'Agrega secciones recomendadas para aumentar tu nivel de coincidencia.'
      : 'Tu perfil basico ya esta optimizado. Puedes preparar el perfil avanzado.'

  const pendingSectionsPreview = useMemo(() => {
    return sections.filter((section) => section.status === 'pending').slice(0, 3)
  }, [sections])

  const fotoPerfilUrl = useMemo(() => {
    const documentos = Array.isArray(perfil?.documentos) ? perfil.documentos : []
    const foto = documentos.find((doc) => doc?.tipo_documento === 'foto' && doc?.ruta_archivo)
    if (!foto?.ruta_archivo) return ''
    const rawPath = String(foto.ruta_archivo)
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    if (rawPath.startsWith('/')) return `${apiBase}${rawPath}`
    return `${apiBase}/${rawPath}`
  }, [perfil])

  useEffect(() => {
    setPhotoError(false)
  }, [fotoPerfilUrl])

  const candidatoNombre = useMemo(() => {
    const nombres = perfil?.datos_basicos?.nombres || ''
    const apellidos = perfil?.datos_basicos?.apellidos || ''
    const fullName = `${nombres} ${apellidos}`.trim()
    return fullName || 'Candidato Activo'
  }, [perfil])

  const candidatoIniciales = useMemo(() => {
    const parts = candidatoNombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
    if (!parts.length) return 'CA'
    return parts.map((part) => part[0].toUpperCase()).join('')
  }, [candidatoNombre])

  const socialProfileEnabled = Boolean(socialConfig?.perfil_publico)

  const togglePublicProfile = async (enabled) => {
    try {
      setSavingSocialConfig(true)
      const response = await updateMyCandidateSocialConfig({ perfil_publico: Boolean(enabled) })
      setSocialConfig(response?.config || { perfil_publico: Boolean(enabled), alias_publico: null, titular_publico: null })
      showToast({
        type: 'success',
        message: enabled ? 'Tu perfil publico ya es visible para otros candidatos.' : 'Tu perfil publico fue ocultado.',
      })
    } catch (err) {
      showToast({
        type: 'error',
        message: getSocialErrorMessage(err, 'No se pudo actualizar la visibilidad del perfil publico.'),
      })
    } finally {
      setSavingSocialConfig(false)
    }
  }

  const statusStyles = {
    complete: {
      label: 'Completo',
      card: 'border-border bg-white border-l-4 border-l-emerald-400',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500'
    },
    pending: {
      label: 'Pendiente',
      card: 'border-border bg-white border-l-4 border-l-amber-400',
      badge: 'bg-amber-100 text-amber-700',
      icon: AlertCircle,
      iconColor: 'text-amber-500'
    },
    pending_phase2: {
      label: 'Fase 2',
      card: 'border-slate-200 bg-slate-50/55 border-l-4 border-l-slate-300',
      badge: 'bg-slate-200 text-slate-700',
      icon: Lock,
      iconColor: 'text-slate-500'
    }
  }

  function getActionLabel(section) {
    if (section.status === 'complete') return 'Editar'
    return 'Completar'
  }

  function renderSectionCard(section) {
    const status = statusStyles[section.status]
    const StatusIcon = status.icon
    const SectionIcon = section.icon

    return (
      <div key={section.id} className={`border rounded-xl p-4 ${status.card}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <SectionIcon className="w-4 h-4 text-foreground/70" />
              <h2 className="font-semibold text-base">{section.title}</h2>
            </div>
            <p className="text-sm text-foreground/70">{section.summary}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${status.badge}`}
          >
            <StatusIcon className={`h-3.5 w-3.5 ${status.iconColor}`} />
            {status.label}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-foreground/60">Nivel: {section.level}</p>
          <button
            className="text-sm font-medium text-primary"
            onClick={() => navigate(section.route)}
            type="button"
          >
            {getActionLabel(section)}
          </button>
        </div>
      </div>
    )
  }

  async function getCurriculumPdf({ useCache = true } = {}) {
    const candidatoId = Number(perfil?.datos_basicos?.id || 0)
    if (!Number.isInteger(candidatoId) || candidatoId <= 0) {
      throw new Error('INVALID_ESTUDIANTE_ID')
    }

    if (useCache && pdfBlobCache) {
      return { blob: pdfBlobCache, fileName: pdfFileName }
    }

    const fallbackFileName = `${candidatoNombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80) || candidatoId}.pdf`
    const response = await getMyHojaVidaPdf({ candidatoId, defaultFileName: fallbackFileName })
    setPdfBlobCache(response.blob)
    setPdfFileName(response.fileName || `hoja_vida_${candidatoId}.pdf`)
    return response
  }

  async function getCurriculumPreviewData({ useCache = true } = {}) {
    const candidatoId = Number(perfil?.datos_basicos?.id || 0)
    if (!Number.isInteger(candidatoId) || candidatoId <= 0) {
      throw new Error('INVALID_ESTUDIANTE_ID')
    }
    if (useCache && curriculumPreviewData) return curriculumPreviewData
    const data = await getMyHojaVida({ candidatoId })
    setCurriculumPreviewData(data)
    setPdfBlobCache(null)  // Invalidar cache de PDF cuando datos se actualizan
    return data
  }

  function resolveAssetUrl(path) {
    const value = String(path || '').trim()
    if (!value) return ''
    if (value.startsWith('http://') || value.startsWith('https://')) return value
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return value.startsWith('/') ? `${apiBase}${value}` : `${apiBase}/${value}`
  }

  function formatDateShort(value) {
    if (!value) return 'N/D'
    // Si viene como string YYYY-MM-DD, parsear directamente sin conversión a UTC
    const stringValue = String(value).trim()
    const match = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }
    // Si es otro formato, intentar con Date
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    const dayNum = String(date.getDate()).padStart(2, '0')
    const monthNum = String(date.getMonth() + 1).padStart(2, '0')
    const yearNum = date.getFullYear()
    return `${dayNum}/${monthNum}/${yearNum}`
  }

  function renderValue(value) {
    if (value === null || value === undefined || value === '') return 'N/D'
    if (value === true || value === 1) return 'Si'
    if (value === false || value === 0) return 'No'
    return String(value)
  }

  function closePdfPreview() {
    setPdfPreviewInlineOpen(false)
  }

  async function handlePreviewCurriculum() {
    try {
      setLoadingPdf(true)
      setPdfError('')
      await getCurriculumPreviewData({ useCache: false })
      setPdfPreviewInlineOpen(true)
    } catch (err) {
      setPdfError(getPerfilErrorMessage(err, 'No se pudo previsualizar el curriculum.'))
    } finally {
      setLoadingPdf(false)
    }
  }

  async function handleDownloadCurriculum() {
    try {
      setLoadingPdf(true)
      setPdfError('')
      const { blob, fileName } = await getCurriculumPdf({ useCache: false })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName || 'hoja_vida.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setPdfError(getPerfilErrorMessage(err, 'No se pudo descargar el curriculum.'))
    } finally {
      setLoadingPdf(false)
    }
  }

  const previewFotoUrl = useMemo(() => {
    const documentos = Array.isArray(curriculumPreviewData?.documentos) ? curriculumPreviewData.documentos : []
    const foto = documentos.find((doc) => doc?.tipo_documento === 'foto' && doc?.ruta_archivo)
    return foto?.ruta_archivo ? resolveAssetUrl(foto.ruta_archivo) : ''
  }, [curriculumPreviewData])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-10">
        <section className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="bg-white border border-border rounded-2xl p-6 w-full lg:w-1/3 space-y-5">
            <div className="flex items-center gap-3">
              {fotoPerfilUrl && !photoError ? (
                <img
                  src={fotoPerfilUrl}
                  alt={`Foto de ${candidatoNombre}`}
                  className="w-12 h-12 rounded-full object-cover border border-border"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <span className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {candidatoIniciales}
                </span>
              )}
              <div>
                <h1 className="font-heading text-xl font-semibold">{candidatoNombre}</h1>
                <p className="text-sm text-foreground/70">Perfil total {progressGeneral}% completo</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progressGeneral}%` }} />
              </div>
              <p className="text-xs text-foreground/60">
                Tu informacion de perfil es editable y se usa para filtros de empresas.
              </p>
            </div>
            <button
              className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium"
              onClick={() => navigate(nextRoute)}
              type="button"
            >
              Continuar perfil
            </button>
            <div className="rounded-xl border border-border bg-white p-3 space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Curriculum</h2>
              <div className="grid gap-2">
                <button
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  type="button"
                  onClick={handlePreviewCurriculum}
                  disabled={loadingPdf || loading}
                >
                  <Eye className="w-4 h-4" />
                  Previsualizar curriculum
                </button>
                <button
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  type="button"
                  onClick={handleDownloadCurriculum}
                  disabled={loadingPdf || loading}
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
              </div>
              {loadingPdf ? <p className="text-xs text-foreground/60">Preparando archivo...</p> : null}
              {pdfError ? (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{pdfError}</p>
              ) : null}
            </div>

            {loading && <p className="text-xs text-foreground/60">Cargando estado del perfil...</p>}
            {!loading && error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* <div className="rounded-xl border border-border bg-slate-50/70 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Resumen estrategico</h2>
              <div className="space-y-1 text-xs text-foreground/75">
                <p>Visibilidad del perfil: {visibilityLabel}</p>
                <p>Coincidencia promedio estimada: {matchScore}%</p>
                <p>Verificaciones pendientes: {pendingRequired}</p>
                <p>Perfil fase 1: {progressFase1}% | Perfil total: {progressGeneral}%</p>
              </div>
              <p className="text-xs text-foreground/70 pt-1">{recommendationText}</p>
            </div> */}

            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Estado de avance</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-foreground/60">Obligatorias</p>
                  <p className="text-sm font-semibold text-foreground">{completedRequired}/{requiredSections.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-foreground/60">Recomendadas</p>
                  <p className="text-sm font-semibold text-foreground">{completedRecommended}/{recommendedSections.length}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground/80">Proximos pasos</p>
                {pendingSectionsPreview.length > 0 ? (
                  pendingSectionsPreview.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => navigate(section.route)}
                      className="w-full text-left rounded-lg border border-border px-3 py-2 text-xs text-foreground/80 hover:bg-slate-50"
                    >
                      {section.title}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-emerald-700">No tienes secciones pendientes en fase actual.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Resumen profesional para candidatos</h2>
              <p className="text-xs text-foreground/70">
                Cuando esta activo, otros candidatos ven solo un resumen profesional. No se exponen datos personales sensibles.
              </p>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={socialProfileEnabled}
                  disabled={loadingSocialConfig || savingSocialConfig}
                  onChange={(event) => togglePublicProfile(event.target.checked)}
                />
                {socialProfileEnabled ? 'Aparezco en Personas' : 'No aparezco en Personas'}
              </label>
              {savingSocialConfig ? <p className="text-xs text-foreground/60">Actualizando visibilidad...</p> : null}
            </div>
          </div>

          <div className="flex-1 space-y-7">
            {pdfPreviewInlineOpen ? (
              <PdfPreviewViewer 
                htmlData={curriculumPreviewData?.html}
                onClose={closePdfPreview}
              />
            ) : (
              <>
                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Perfil obligatorio</h2>
                    <p className="text-xs text-foreground/65">Debes completar Fase 1 y Fase 2 para postular.</p>
                  </div>
                  <div className="space-y-3">{requiredSections.map((section) => renderSectionCard(section))}</div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Perfil recomendado</h2>
                    <p className="text-xs text-foreground/65">Mejora tu visibilidad y coincidencia.</p>
                  </div>
                  <div className="space-y-3">{recommendedSections.map((section) => renderSectionCard(section))}</div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Perfil avanzado</h2>
                    <p className="text-xs text-foreground/65">Fase 2. Secciones en despliegue progresivo.</p>
                  </div>
                  <div className="space-y-3">{phase2Sections.map((section) => renderSectionCard(section))}</div>
                </section>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
