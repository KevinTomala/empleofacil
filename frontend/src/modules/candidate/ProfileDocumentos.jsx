import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, FileImage, ShieldAlert } from 'lucide-react'
import FormDropdown from '../../components/FormDropdown'
import { showToast } from '../../utils/showToast'
import {
  createMyDocumento,
  deleteMyDocumento,
  getMyDocumentos,
  getPerfilErrorMessage,
  updateMyDocumento
} from '../../services/perfilCandidato.api'
import ProfileWizardLayout from './ProfileWizardLayout'
import cedulaAnversoRef from '../../assets/doc_tutorial/cedula_anverso.jpg'
import cedulaReversoRef from '../../assets/doc_tutorial/cedula_reverso.jpg'
import licenciaRef from '../../assets/doc_tutorial/Licencia de conducir.jpg'

const tipoDocumentoOptions = [
  { value: 'documento_identidad', label: 'Documento identidad' },
  { value: 'carnet_tipo_sangre', label: 'Carnet tipo sangre' },
  { value: 'libreta_militar', label: 'Libreta militar' },
  { value: 'certificado_antecedentes', label: 'Certificado antecedentes' },
  { value: 'certificado_consejo_judicatura', label: 'Consejo judicatura' },
  { value: 'examen_toxicologico', label: 'Examen toxicologico' },
  { value: 'examen_psicologico', label: 'Examen psicologico' },
  { value: 'registro_biometrico', label: 'Registro biometrico' },
  { value: 'licencia_conducir', label: 'Licencia conducir' },
  { value: 'certificado_estudios', label: 'Certificado estudios' },
  { value: 'foto', label: 'Foto' },
  { value: 'carta_compromiso', label: 'Carta compromiso' },
  { value: 'otro', label: 'Otro' }
]

const ladoDocumentoOptions = [
  { value: 'anverso', label: 'Anverso (frente)' },
  { value: 'reverso', label: 'Reverso (dorso)' },
]

const initialForm = {
  tipo_documento: 'documento_identidad',
  lado_documento: '',
  fecha_emision: '',
  fecha_vencimiento: '',
  numero_documento: '',
  descripcion: '',
  observaciones: ''
}

const identityTutorialSteps = [
  {
    id: 'identidad-anverso',
    shortLabel: 'Cedula anverso',
    title: 'Paso 1: captura el anverso completo',
    tip: 'Debe verse completa la foto y el numero de documento, sin cortes ni reflejos.',
    image: cedulaAnversoRef
  },
  {
    id: 'identidad-reverso',
    shortLabel: 'Cedula reverso',
    title: 'Paso 2: captura el reverso completo',
    tip: 'Asegura legibilidad en texto, codigo y elementos de seguridad del documento.',
    image: cedulaReversoRef
  }
]

const licenciaTutorialSteps = [
  {
    id: 'licencia',
    shortLabel: 'Licencia',
    title: 'Captura frontal de licencia',
    tip: 'Debe verse numero de licencia, nombres y fecha de vigencia sin borrosidad.',
    image: licenciaRef
  }
]

const captureChecklist = [
  'Buena iluminacion, sin sombras ni brillo fuerte.',
  'Imagen nitida: sin movimiento ni desenfoque.',
  'Documento completo dentro del marco de la foto.',
  'Texto y datos legibles en una sola vista.'
]

const legalChecklist = [
  'Solo puedes subir documentos propios y autenticos.',
  'Suplantacion o falsificacion implica bloqueo de cuenta.',
  'La plataforma puede reportar uso indebido a la autoridad.'
]

function normalizeDateOnly(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const iso = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  return iso
}

function isDocumentoExpired(item) {
  const dateOnly = normalizeDateOnly(item?.fecha_vencimiento)
  if (!dateOnly) return false
  const expiry = new Date(`${dateOnly}T00:00:00`)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return expiry < today
}

function isDocumentoLockedByVerification(item) {
  const status = String(item?.estado || '').trim().toLowerCase()
  return status === 'aprobado' && !isDocumentoExpired(item)
}

export default function ProfileDocumentos() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [acceptedCaptureGuide, setAcceptedCaptureGuide] = useState(false)
  const [useCameraCapture, setUseCameraCapture] = useState(true)
  const [guideSlideIndex, setGuideSlideIndex] = useState(0)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [hasCameraDevice, setHasCameraDevice] = useState(false)
  const touchStartXRef = useRef(null)
  const touchStartYRef = useRef(null)

  const isSectionComplete = useMemo(() => items.length > 0, [items])
  const requiresIdentitySide = form.tipo_documento === 'documento_identidad'
  const isIdentityBack = requiresIdentitySide && form.lado_documento === 'reverso'
  const shouldCaptureMeta = !requiresIdentitySide || form.lado_documento === 'anverso'
  const requiresCaptureGuide =
    form.tipo_documento === 'documento_identidad' || form.tipo_documento === 'licencia_conducir'
  const showCaptureTutorial = requiresCaptureGuide && !editingId && isMobileDevice && hasCameraDevice
  const totalGuideSlides = 3
  const activeTutorialStep = useMemo(() => {
    if (form.tipo_documento === 'licencia_conducir') return licenciaTutorialSteps[0]
    if (form.lado_documento === 'reverso') return identityTutorialSteps[1]
    return identityTutorialSteps[0]
  }, [form.tipo_documento, form.lado_documento])

  async function loadDocumentos() {
    const response = await getMyDocumentos()
    setItems(response.items || [])
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const response = await getMyDocumentos()
        if (!active) return
        setItems(response.items || [])
      } catch (error) {
        if (!active) return
        showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo cargar documentos.') })
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    function detectMobile() {
      if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
      const ua = String(navigator.userAgent || '')
      const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
      const uaDataMobile = Boolean(navigator.userAgentData?.mobile)
      const touchCompact = navigator.maxTouchPoints > 1 && window.innerWidth < 1024
      return mobileUa || uaDataMobile || touchCompact
    }

    async function detectDevices() {
      const mobile = detectMobile()
      let hasCamera = false

      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          hasCamera = Array.isArray(devices) && devices.some((device) => device.kind === 'videoinput')
        } catch (_error) {
          hasCamera = false
        }
      }

      if (!mounted) return
      setIsMobileDevice(mobile)
      setHasCameraDevice(hasCamera)
      if (!mobile || !hasCamera) {
        setUseCameraCapture(false)
        setAcceptedCaptureGuide(true)
      }
    }

    detectDevices()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setGuideSlideIndex(0)
  }, [form.tipo_documento])

  const goToPrevGuideSlide = () => {
    setGuideSlideIndex((prev) => Math.max(prev - 1, 0))
  }

  const goToNextGuideSlide = () => {
    setGuideSlideIndex((prev) => Math.min(prev + 1, totalGuideSlides - 1))
  }

  const handleGuideTouchStart = (event) => {
    const touch = event.changedTouches?.[0]
    if (!touch) return
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
  }

  const handleGuideTouchEnd = (event) => {
    const touch = event.changedTouches?.[0]
    if (!touch || touchStartXRef.current == null || touchStartYRef.current == null) return

    const deltaX = touch.clientX - touchStartXRef.current
    const deltaY = touch.clientY - touchStartYRef.current
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
    const minSwipeDistance = 40

    if (isHorizontalSwipe && Math.abs(deltaX) >= minSwipeDistance) {
      if (deltaX < 0) goToNextGuideSlide()
      else goToPrevGuideSlide()
    }

    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  const resetForm = () => {
    setForm(initialForm)
    setSelectedFile(null)
    setEditingId(null)
    setAcceptedCaptureGuide(false)
    setUseCameraCapture(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)

      if (editingId) {
        if (requiresIdentitySide && !form.lado_documento) {
          showToast({ type: 'warning', message: 'Selecciona anverso o reverso para la cedula.' })
          return
        }

        await updateMyDocumento(editingId, {
          tipo_documento: form.tipo_documento,
          lado_documento: requiresIdentitySide ? form.lado_documento : null,
          fecha_emision: shouldCaptureMeta ? form.fecha_emision || null : null,
          fecha_vencimiento: shouldCaptureMeta ? form.fecha_vencimiento || null : null,
          numero_documento: shouldCaptureMeta ? form.numero_documento.trim() || null : null,
          descripcion: form.descripcion.trim() || null,
          observaciones: form.observaciones.trim() || null
        })
      } else {
        if (showCaptureTutorial && !acceptedCaptureGuide) {
          showToast({
            type: 'warning',
            message: 'Debes leer y aceptar la guia de captura para subir cedula o licencia.'
          })
          return
        }
        if (!selectedFile) {
          showToast({ type: 'warning', message: 'Selecciona un archivo.' })
          return
        }
        if (requiresIdentitySide && !form.lado_documento) {
          showToast({ type: 'warning', message: 'Selecciona anverso o reverso para la cedula.' })
          return
        }

        const payload = new FormData()
        payload.append('archivo', selectedFile)
        payload.append('tipo_documento', form.tipo_documento)
        if (requiresIdentitySide) payload.append('lado_documento', form.lado_documento)
        if (shouldCaptureMeta && form.fecha_emision) payload.append('fecha_emision', form.fecha_emision)
        if (shouldCaptureMeta && form.fecha_vencimiento) payload.append('fecha_vencimiento', form.fecha_vencimiento)
        if (shouldCaptureMeta && form.numero_documento.trim()) payload.append('numero_documento', form.numero_documento.trim())
        if (form.descripcion.trim()) payload.append('descripcion', form.descripcion.trim())
        if (form.observaciones.trim()) payload.append('observaciones', form.observaciones.trim())

        await createMyDocumento(payload)
      }

      await loadDocumentos()
      resetForm()
      showToast({ type: 'success', message: 'Documento guardado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo guardar documento.') })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    if (isDocumentoLockedByVerification(item)) {
      showToast({ type: 'warning', message: 'Documento verificado vigente. No se puede editar.' })
      return
    }

    const isIdentityBackItem = item.tipo_documento === 'documento_identidad' && item.lado_documento === 'reverso'
    setEditingId(item.id)
    setForm({
      tipo_documento: item.tipo_documento || 'documento_identidad',
      lado_documento: item.lado_documento || '',
      fecha_emision: isIdentityBackItem ? '' : item.fecha_emision || '',
      fecha_vencimiento: isIdentityBackItem ? '' : item.fecha_vencimiento || '',
      numero_documento: isIdentityBackItem ? '' : item.numero_documento || '',
      descripcion: item.descripcion || '',
      observaciones: item.observaciones || ''
    })
    setAcceptedCaptureGuide(true)
    setUseCameraCapture(false)
  }

  const handleDelete = async (id) => {
    try {
      const target = items.find((item) => item.id === id)
      if (target && isDocumentoLockedByVerification(target)) {
        showToast({ type: 'warning', message: 'Documento verificado vigente. No se puede eliminar.' })
        return
      }
      await deleteMyDocumento(id)
      await loadDocumentos()
      if (editingId === id) resetForm()
      showToast({ type: 'success', message: 'Documento eliminado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo eliminar documento.') })
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/documentos"
      title="Documentos"
      description="Sube tu CV y certificados para mejorar tu perfil."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
    >
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tipo de documento
              <FormDropdown
                value={form.tipo_documento}
                options={tipoDocumentoOptions}
                onChange={(value) => {
                  setForm((prev) => ({
                    ...prev,
                    tipo_documento: value,
                    lado_documento: value === 'documento_identidad' ? prev.lado_documento : ''
                  }))
                  setSelectedFile(null)
                  setUseCameraCapture(true)
                  setGuideSlideIndex(0)
                  if (!editingId) {
                    const nextRequiresGuide = value === 'documento_identidad' || value === 'licencia_conducir'
                    const needsTutorial = nextRequiresGuide && isMobileDevice && hasCameraDevice
                    setAcceptedCaptureGuide(!needsTutorial)
                  }
                }}
              />
            </label>

            {requiresIdentitySide ? (
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Lado de cedula
                <FormDropdown
                  value={form.lado_documento}
                  options={ladoDocumentoOptions}
                  placeholder="Seleccionar lado"
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      lado_documento: value,
                      fecha_emision: value === 'reverso' ? '' : prev.fecha_emision,
                      fecha_vencimiento: value === 'reverso' ? '' : prev.fecha_vencimiento,
                      numero_documento: value === 'reverso' ? '' : prev.numero_documento
                    }))
                  }
                />
              </label>
            ) : null}

            {showCaptureTutorial ? (
              <section className="sm:col-span-2 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                      Mini tutorial visual
                    </p>
                    <h3 className="text-sm font-semibold text-sky-900">
                      Captura guiada para {form.tipo_documento === 'documento_identidad' ? 'cedula' : 'licencia'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">
                    Slide {guideSlideIndex + 1} de {totalGuideSlides}
                  </span>
                </div>

                <div
                  className="overflow-hidden rounded-xl border border-sky-200 bg-white"
                  onTouchStart={handleGuideTouchStart}
                  onTouchEnd={handleGuideTouchEnd}
                >
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${guideSlideIndex * 100}%)` }}
                  >
                    <div className="w-full shrink-0 p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">
                        Paso 1: {activeTutorialStep?.shortLabel}
                      </p>
                      <p className="text-xs text-foreground/70">{activeTutorialStep?.title}</p>
                      <p className="text-xs text-foreground/70">{activeTutorialStep?.tip}</p>
                      <div className="pt-1">
                        <div className="relative rounded-xl overflow-hidden border border-sky-200 bg-white">
                          <img
                            src={activeTutorialStep?.image}
                            alt={activeTutorialStep?.title || 'Referencia documento'}
                            className="w-full h-56 sm:h-64 object-cover"
                          />
                          <div className="absolute left-2 top-2 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold">
                            Imagen de referencia
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full shrink-0 p-4 space-y-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-emerald-800">Checklist de calidad</p>
                        {captureChecklist.map((item) => (
                          <p key={item} className="text-xs text-emerald-700 inline-flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </p>
                        ))}
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-rose-800 inline-flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Aviso legal
                        </p>
                        {legalChecklist.map((item) => (
                          <p key={item} className="text-xs text-rose-700">{item}</p>
                        ))}
                      </div>
                    </div>

                    <div className="w-full shrink-0 p-4 space-y-3">
                      {!editingId ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${
                                useCameraCapture
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white border-border text-foreground/70'
                              }`}
                              onClick={() => {
                                setUseCameraCapture(true)
                                setSelectedFile(null)
                              }}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Usar camara del celular
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${
                                !useCameraCapture
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white border-border text-foreground/70'
                              }`}
                              onClick={() => {
                                setUseCameraCapture(false)
                                setSelectedFile(null)
                              }}
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              Subir archivo manual
                            </button>
                          </div>
                          <label className="flex items-start gap-2 text-xs text-foreground/80">
                            <input
                              type="checkbox"
                              checked={acceptedCaptureGuide}
                              onChange={(event) => setAcceptedCaptureGuide(event.target.checked)}
                              className="mt-0.5"
                            />
                            Confirmo que lei la guia, que el documento es mio y autorizo su validacion.
                          </label>
                        </>
                      ) : (
                        <p className="text-xs text-foreground/70">
                          Estas en modo edicion. Para reemplazar archivo usa un nuevo registro.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalGuideSlides }).map((_, idx) => (
                      <button
                        key={`guide-dot-${idx}`}
                        type="button"
                        onClick={() => setGuideSlideIndex(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          guideSlideIndex === idx ? 'w-6 bg-primary' : 'w-2.5 bg-border'
                        }`}
                        aria-label={`Ir al slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                      onClick={goToPrevGuideSlide}
                      disabled={guideSlideIndex <= 0}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                      onClick={goToNextGuideSlide}
                      disabled={guideSlideIndex >= totalGuideSlides - 1}
                    >
                      Siguiente <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Archivo {editingId ? '(sin reemplazo en edicion)' : ''}
              <input
                className="ef-control"
                type="file"
                accept={
                  requiresCaptureGuide
                    ? 'image/*,.jpg,.jpeg,.png,.webp,.pdf'
                    : '.pdf,.png,.jpg,.jpeg,.webp'
                }
                capture={!editingId && showCaptureTutorial && useCameraCapture ? 'environment' : undefined}
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={Boolean(editingId) || (showCaptureTutorial && !acceptedCaptureGuide)}
              />
            </label>
            {shouldCaptureMeta ? (
              <>
                <label className="space-y-1 text-sm font-medium text-foreground/80">
                  Fecha emision
                  <input
                    className="ef-control"
                    type="date"
                    value={form.fecha_emision}
                    onChange={(event) => setForm((prev) => ({ ...prev, fecha_emision: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-foreground/80">
                  Fecha vencimiento
                  <input
                    className="ef-control"
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(event) => setForm((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-foreground/80">
                  Numero documento
                  <input
                    className="ef-control"
                    type="text"
                    value={form.numero_documento}
                    onChange={(event) => setForm((prev) => ({ ...prev, numero_documento: event.target.value }))}
                  />
                </label>
              </>
            ) : null}

            {isIdentityBack ? (
              <p className="text-xs text-foreground/60 sm:col-span-2">
                Para cedula reverso no se solicitan numero ni fechas para evitar duplicidad de datos.
              </p>
            ) : null}
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Descripcion
              <textarea
                className="ef-control min-h-20"
                value={form.descripcion}
                onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            {editingId && (
              <button
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>
            )}
            <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar documento' : 'Subir documento'}
            </button>
          </div>
        </form>

        <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-base">Documentos cargados</h2>
          {loading && <p className="text-sm text-foreground/70">Cargando documentos...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-foreground/70">No hay documentos cargados.</p>
          )}
          {!loading && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => {
                const expired = isDocumentoExpired(item)
                const lockedByVerification = isDocumentoLockedByVerification(item)
                const statusText = lockedByVerification
                  ? 'Verificado'
                  : expired
                  ? 'Vencido'
                  : item.estado

                return (
                  <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {item.tipo_documento}
                        {item.tipo_documento === 'documento_identidad' && item.lado_documento
                          ? ` - ${item.lado_documento}`
                          : ''}
                      </p>
                      <p className="text-xs text-foreground/60">
                        Estado: {statusText} | Archivo: {item.nombre_original || item.nombre_archivo}
                      </p>
                      {expired ? (
                        <p className="text-xs text-amber-700">
                          Documento vencido: debes actualizarlo para mantenerlo verificado.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {lockedByVerification ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verificado
                        </span>
                      ) : (
                        <>
                          <button type="button" className="px-3 py-1.5 text-xs border border-border rounded-lg" onClick={() => handleEdit(item)}>
                            Editar
                          </button>
                          <button type="button" className="px-3 py-1.5 text-xs border border-rose-300 text-rose-700 rounded-lg" onClick={() => handleDelete(item.id)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </ProfileWizardLayout>
  )
}
