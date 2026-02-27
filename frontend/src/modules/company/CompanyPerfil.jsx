import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import './company.css'
import {
  Building2,
  Facebook,
  Instagram,
  Linkedin,
  MoreVertical,
  Pencil,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'
import VerifiedBadge from '../../components/VerifiedBadge'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../utils/showToast'
import {
  deleteMyCompanyLogo,
  deleteMyCompanyProfile,
  deleteMyCompanyUser,
  createMyCompanyUser,
  getCompanyPerfilErrorMessage,
  getMyCompanyPreferences,
  getMyCompanyVerification,
  getMyCompanyPerfil,
  listMyCompanyUsers,
  requestMyCompanyVerification,
  updateMyCompanyDatosGenerales,
  updateMyCompanyPreferences,
  updateMyCompanyUser,
  uploadMyCompanyLogo,
} from '../../services/companyPerfil.api'

const EMPTY_FORM = {
  nombre: '',
  ruc: '',
  email: '',
  telefono: '',
  industria: '',
  ubicacion_principal: '',
  tamano_empleados: '',
  descripcion: '',
  sitio_web: '',
  linkedin_url: '',
  instagram_url: '',
  facebook_url: '',
}

const EMPTY_PREFERENCIAS = {
  modalidades_permitidas: [],
  niveles_experiencia: [],
  observaciones: '',
}

const USER_FORM_DEFAULT = {
  email: '',
  rol_empresa: 'reclutador',
  principal: false,
}

const MODALIDADES = ['presencial', 'hibrido', 'remoto']
const NIVELES = ['junior', 'semi_senior', 'senior']
const MOTIVOS_DESACTIVACION = [
  { value: 'sin_vacantes', label: 'No tengo vacantes por ahora' },
  { value: 'poca_calidad_candidatos', label: 'No encuentro perfiles adecuados' },
  { value: 'costo_alto', label: 'Costo alto para mi empresa' },
  { value: 'pausa_temporal', label: 'Pausa temporal de contratacion' },
  { value: 'problema_tecnico', label: 'Problemas tecnicos en la plataforma' },
  { value: 'otro', label: 'Otro motivo' },
]
const DEACTIVATION_FORM_DEFAULT = {
  motivos_codigos: [],
  motivo_detalle: '',
  requiere_soporte: true,
}

function mapPayloadToForm(payload) {
  return {
    nombre: payload?.empresa?.nombre || '',
    ruc: payload?.empresa?.ruc || '',
    email: payload?.empresa?.email || '',
    telefono: payload?.empresa?.telefono || '',
    industria: payload?.perfil?.industria || '',
    ubicacion_principal: payload?.perfil?.ubicacion_principal || '',
    tamano_empleados:
      Number.isInteger(payload?.perfil?.tamano_empleados) && payload?.perfil?.tamano_empleados >= 0
        ? String(payload.perfil.tamano_empleados)
        : '',
    descripcion: payload?.perfil?.descripcion || '',
    sitio_web: payload?.perfil?.sitio_web || '',
    linkedin_url: payload?.perfil?.linkedin_url || '',
    instagram_url: payload?.perfil?.instagram_url || '',
    facebook_url: payload?.perfil?.facebook_url || '',
  }
}

function normalizeOptionalUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

function formatDisplay(value, fallback = 'No definido') {
  const text = String(value || '').trim()
  return text || fallback
}

function toExternalUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  return `https://${text}`
}

function toAssetUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const normalized = raw.replace(/\\/g, '/')
  const uploadsIdx = normalized.toLowerCase().indexOf('/uploads/')
  const uploadsPath = uploadsIdx >= 0
    ? normalized.slice(uploadsIdx)
    : normalized.toLowerCase().startsWith('uploads/')
      ? `/${normalized}`
      : normalized
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return uploadsPath.startsWith('/') ? `${apiBase}${uploadsPath}` : `${apiBase}/${uploadsPath}`
}

export default function CompanyPerfil() {
  const navigate = useNavigate()
  const { refreshCompanyAccess } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [requestingVerification, setRequestingVerification] = useState(false)
  const [editing, setEditing] = useState(false)
  const [openQuickMenu, setOpenQuickMenu] = useState(null)
  const [perfilData, setPerfilData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [companyUsers, setCompanyUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState(null)
  const [userForm, setUserForm] = useState(USER_FORM_DEFAULT)
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCIAS)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [deletingCompany, setDeletingCompany] = useState(false)
  const [showDeactivateSurvey, setShowDeactivateSurvey] = useState(false)
  const [showDeactivateConfirmModal, setShowDeactivateConfirmModal] = useState(false)
  const [deactivationForm, setDeactivationForm] = useState(DEACTIVATION_FORM_DEFAULT)
  const logoInputRef = useRef(null)
  const logoMenuRef = useRef(null)
  const linksMenuRef = useRef(null)

  const applyPerfilResponse = (data) => {
    const normalized = {
      empresa: data?.empresa || {},
      perfil: data?.perfil || {},
      resumen: data?.resumen || { porcentaje_completitud: 0, campos_pendientes: [] },
      verificacion: data?.verificacion || null,
    }

    setPerfilData(normalized)
    setForm(mapPayloadToForm(normalized))
  }

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await listMyCompanyUsers()
      setCompanyUsers(Array.isArray(response?.items) ? response.items : [])
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudieron cargar los usuarios de la empresa.'),
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadPreferences = async () => {
    try {
      setLoadingPreferences(true)
      const response = await getMyCompanyPreferences()
      const data = response?.preferencias || {}
      setPreferences({
        modalidades_permitidas: Array.isArray(data.modalidades_permitidas) ? data.modalidades_permitidas : [],
        niveles_experiencia: Array.isArray(data.niveles_experiencia) ? data.niveles_experiencia : [],
        observaciones: data.observaciones || '',
      })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudieron cargar las preferencias.'),
      })
    } finally {
      setLoadingPreferences(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyCompanyPerfil()
        if (!active) return
        if (data?.verificacion) {
          applyPerfilResponse(data)
        } else {
          try {
            const verificationRes = await getMyCompanyVerification()
            if (!active) return
            applyPerfilResponse({ ...data, verificacion: verificationRes?.verificacion || null })
          } catch (_verificationError) {
            if (!active) return
            applyPerfilResponse(data)
          }
        }
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getCompanyPerfilErrorMessage(error, 'No se pudo cargar el perfil de empresa.'),
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPerfil()
    loadUsers()
    loadPreferences()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!openQuickMenu) return undefined

    const onPointerDown = (event) => {
      const insideLogoMenu = logoMenuRef.current?.contains(event.target)
      const insideLinksMenu = linksMenuRef.current?.contains(event.target)
      if (!insideLogoMenu && !insideLinksMenu) {
        setOpenQuickMenu(null)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openQuickMenu])

  const resumen = perfilData?.resumen || { porcentaje_completitud: 0, campos_pendientes: [] }
  const porcentajeCompletitud =
    Number.isInteger(resumen?.porcentaje_completitud) && resumen.porcentaje_completitud >= 0
      ? resumen.porcentaje_completitud
      : 0
  const pendientes = Array.isArray(resumen?.campos_pendientes) ? resumen.campos_pendientes : []

  const sitioWeb = String(perfilData?.perfil?.sitio_web || '').trim()
  const linkedinUrl = String(perfilData?.perfil?.linkedin_url || '').trim()
  const instagramUrl = String(perfilData?.perfil?.instagram_url || '').trim()
  const facebookUrl = String(perfilData?.perfil?.facebook_url || '').trim()
  const logoUrl = String(perfilData?.perfil?.logo_url || '').trim()
  const logoSrc = toAssetUrl(logoUrl)
  const verificacion = perfilData?.verificacion || null
  const verificationStatus = String(verificacion?.estado || 'pendiente')
  const verificationLevel = String(verificacion?.nivel || 'basico')
  const verificationReviewedAt = verificacion?.reviewed_at || null
  const verificationReason = String(verificacion?.motivo_rechazo || '').trim()
  const verificationStatusUi = {
    pendiente: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    en_revision: { label: 'En revision', className: 'bg-blue-100 text-blue-700' },
    aprobada: { label: 'Verificado', className: 'bg-emerald-100 text-emerald-700' },
    rechazada: { label: 'Rechazado', className: 'bg-rose-100 text-rose-700' },
    suspendida: { label: 'Suspendido', className: 'bg-rose-100 text-rose-700' },
    vencida: { label: 'Vencida', className: 'bg-slate-200 text-slate-700' },
  }
  const verificationBadge = verificationStatusUi[verificationStatus] || verificationStatusUi.pendiente
  const canRequestVerification = ['pendiente', 'rechazada', 'vencida'].includes(verificationStatus)
  const socialLinks = [
    { key: 'sitio_web', label: sitioWeb, icon: Building2, href: toExternalUrl(sitioWeb) },
    { key: 'linkedin_url', label: linkedinUrl, icon: Linkedin, href: toExternalUrl(linkedinUrl) },
    { key: 'instagram_url', label: instagramUrl, icon: Instagram, href: toExternalUrl(instagramUrl) },
    { key: 'facebook_url', label: facebookUrl, icon: Facebook, href: toExternalUrl(facebookUrl) },
  ].filter((item) => item.label)
  const tamanoEmpleados =
    Number.isInteger(perfilData?.perfil?.tamano_empleados) && perfilData?.perfil?.tamano_empleados >= 0
      ? `${perfilData.perfil.tamano_empleados} personas`
      : 'No definido'
  const activeUsersCount = companyUsers.filter((item) => item.estado === 'activo').length
  const principalUser = companyUsers.find((item) => item.principal)

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleStartEdit = () => {
    setOpenQuickMenu(null)
    setForm(mapPayloadToForm(perfilData))
    setEditing(true)
  }

  const handleEditLogoMenu = () => {
    setOpenQuickMenu(null)
    if (!editing) {
      handleStartEdit()
    }
  }

  const handleCancelEdit = () => {
    setForm(mapPayloadToForm(perfilData))
    setEditing(false)
  }

  const handleSelectLogo = () => {
    if (uploadingLogo || deletingLogo) return
    setOpenQuickMenu(null)
    logoInputRef.current?.click()
  }

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      setUploadingLogo(true)
      const data = await uploadMyCompanyLogo(formData)
      applyPerfilResponse(data)
      showToast({ type: 'success', message: 'Logo actualizado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo actualizar el logo.'),
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!logoSrc || deletingLogo || uploadingLogo) return

    try {
      setOpenQuickMenu(null)
      setDeletingLogo(true)
      const data = await deleteMyCompanyLogo()
      applyPerfilResponse(data)
      showToast({ type: 'success', message: 'Logo eliminado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo eliminar el logo.'),
      })
    } finally {
      setDeletingLogo(false)
    }
  }

  const handleRequestVerification = async () => {
    if (requestingVerification) return
    try {
      setRequestingVerification(true)
      const response = await requestMyCompanyVerification()
      setPerfilData((prev) => ({
        ...(prev || {}),
        verificacion: response?.verificacion || prev?.verificacion || null,
      }))
      showToast({ type: 'success', message: 'Solicitud de verificacion enviada.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo solicitar la verificacion.'),
      })
    } finally {
      setRequestingVerification(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const tamanoRaw = String(form.tamano_empleados || '').trim()
    const payload = {
      nombre: form.nombre.trim(),
      ruc: form.ruc.trim() || null,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      industria: form.industria.trim() || null,
      ubicacion_principal: form.ubicacion_principal.trim() || null,
      tamano_empleados: tamanoRaw === '' ? null : Number(tamanoRaw),
      descripcion: form.descripcion.trim() || null,
      sitio_web: normalizeOptionalUrl(form.sitio_web),
      linkedin_url: normalizeOptionalUrl(form.linkedin_url),
      instagram_url: normalizeOptionalUrl(form.instagram_url),
      facebook_url: normalizeOptionalUrl(form.facebook_url),
    }

    try {
      setSaving(true)
      const data = await updateMyCompanyDatosGenerales(payload)
      applyPerfilResponse(data)
      setEditing(false)
      showToast({ type: 'success', message: 'Perfil de empresa actualizado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo actualizar el perfil de empresa.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    if (savingUser) return

    try {
      setSavingUser(true)
      const response = await createMyCompanyUser({
        email: userForm.email.trim(),
        rol_empresa: userForm.rol_empresa,
        principal: userForm.principal,
      })
      setCompanyUsers(Array.isArray(response?.items) ? response.items : [])
      setUserForm(USER_FORM_DEFAULT)
      showToast({ type: 'success', message: 'Usuario vinculado a la empresa.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo vincular el usuario.'),
      })
    } finally {
      setSavingUser(false)
    }
  }

  const handleUpdateUserRole = async (user, rolEmpresa) => {
    if (updatingUserId) return
    try {
      setUpdatingUserId(user.id)
      const response = await updateMyCompanyUser(user.id, { rol_empresa: rolEmpresa })
      setCompanyUsers(Array.isArray(response?.items) ? response.items : [])
      showToast({ type: 'success', message: 'Rol actualizado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo actualizar el rol.'),
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleSetPrincipalUser = async (user) => {
    if (updatingUserId) return
    try {
      setUpdatingUserId(user.id)
      const response = await updateMyCompanyUser(user.id, { principal: true })
      setCompanyUsers(Array.isArray(response?.items) ? response.items : [])
      showToast({ type: 'success', message: 'Usuario principal actualizado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo actualizar el usuario principal.'),
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleToggleUserState = async (user) => {
    if (updatingUserId) return
    try {
      setUpdatingUserId(user.id)
      const response =
        user.estado === 'activo'
          ? await deleteMyCompanyUser(user.id)
          : await updateMyCompanyUser(user.id, { estado: 'activo' })
      setCompanyUsers(Array.isArray(response?.items) ? response.items : [])
      showToast({ type: 'success', message: 'Estado de usuario actualizado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo actualizar el estado del usuario.'),
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const toggleArrayValue = (field, value) => {
    setPreferences((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : []
      const exists = current.includes(value)
      return {
        ...prev,
        [field]: exists ? current.filter((item) => item !== value) : [...current, value],
      }
    })
  }

  const toggleDeactivationReason = (value) => {
    setDeactivationForm((prev) => {
      const current = Array.isArray(prev.motivos_codigos) ? prev.motivos_codigos : []
      const exists = current.includes(value)
      const next = exists ? current.filter((item) => item !== value) : [...current, value]
      if (value === 'otro' && exists) {
        return { ...prev, motivos_codigos: next, motivo_detalle: '' }
      }
      return { ...prev, motivos_codigos: next }
    })
  }

  const handleSavePreferences = async () => {
    if (savingPreferences) return
    try {
      setSavingPreferences(true)
      const response = await updateMyCompanyPreferences({
        modalidades_permitidas: preferences.modalidades_permitidas,
        niveles_experiencia: preferences.niveles_experiencia,
        observaciones: preferences.observaciones.trim() || null,
      })
      const data = response?.preferencias || EMPTY_PREFERENCIAS
      setPreferences({
        modalidades_permitidas: Array.isArray(data.modalidades_permitidas) ? data.modalidades_permitidas : [],
        niveles_experiencia: Array.isArray(data.niveles_experiencia) ? data.niveles_experiencia : [],
        observaciones: data.observaciones || '',
      })
      showToast({ type: 'success', message: 'Preferencias guardadas.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudieron guardar las preferencias.'),
      })
    } finally {
      setSavingPreferences(false)
    }
  }

  const validateDeactivationPayloadOrNull = () => {
    const motivosCodigos = Array.isArray(deactivationForm.motivos_codigos)
      ? deactivationForm.motivos_codigos.filter(Boolean)
      : []
    if (!motivosCodigos.length) {
      showToast({ type: 'warning', message: 'Selecciona al menos un motivo para desactivar la empresa.' })
      return null
    }

    const motivoDetalle = String(deactivationForm.motivo_detalle || '').trim() || null
    if (motivosCodigos.includes('otro') && !motivoDetalle) {
      showToast({ type: 'warning', message: 'Si seleccionas "otro", debes explicar el motivo.' })
      return null
    }

    return {
      motivos_codigos: motivosCodigos,
      motivo_detalle: motivoDetalle,
      requiere_soporte: Boolean(deactivationForm.requiere_soporte),
    }
  }

  const handleAskDeleteCompanyConfirmation = () => {
    if (deletingCompany) return
    const payload = validateDeactivationPayloadOrNull()
    if (!payload) return
    setShowDeactivateConfirmModal(true)
  }

  const handleDeleteCompany = async () => {
    if (deletingCompany) return

    const payload = validateDeactivationPayloadOrNull()
    if (!payload) return

    try {
      setDeletingCompany(true)
      await deleteMyCompanyProfile(payload)
      await refreshCompanyAccess()
      setShowDeactivateConfirmModal(false)
      setShowDeactivateSurvey(false)
      setDeactivationForm(DEACTIVATION_FORM_DEFAULT)
      showToast({ type: 'success', message: 'Empresa desactivada correctamente.' })
      navigate('/app/company/inactiva', { replace: true })
    } catch (error) {
      setDeletingCompany(false)
      showToast({
        type: 'error',
        message: getCompanyPerfilErrorMessage(error, 'No se pudo desactivar la empresa.'),
      })
    }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-6">
        <section className="space-y-3">
          <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
            Perfil de empresa
          </h1>
          <p className="text-sm text-foreground/70">
            Completa tu perfil para recibir mas postulaciones calificadas.
          </p>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="company-card p-5 space-y-5">
            {loading ? (
              <p className="text-sm text-foreground/70">Cargando perfil...</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-foreground/70">
                    <Building2 className="w-5 h-5 text-primary" />
                    Perfil de empresa
                  </div>
                  <span className="text-xs font-semibold bg-secondary px-2.5 py-1 rounded-full">
                    {porcentajeCompletitud}% completado
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${porcentajeCompletitud}%` }}
                  />
                </div>

                <p className="text-xs text-foreground/60">
                  Las empresas con perfil completo reciben mas postulaciones.
                </p>

                {pendientes.length > 0 ? (
                  <div className="bg-secondary rounded-xl p-3 text-xs text-foreground/70 flex items-start gap-2">
                    <TriangleAlert className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground/80">Falta completar</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {pendientes.map((item) => (
                          <span
                            key={item}
                            className="px-2 py-0.5 rounded-full bg-white border border-border"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                    Perfil completo. Tu empresa esta lista para atraer candidatos.
                  </div>
                )}

                {editing ? (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <label className="space-y-1">
                        <span className="text-foreground/60">Nombre de la empresa</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          value={form.nombre}
                          onChange={(event) => setField('nombre', event.target.value)}
                          required
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">RUC</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          value={form.ruc}
                          onChange={(event) => setField('ruc', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Email</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="email"
                          value={form.email}
                          onChange={(event) => setField('email', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Telefono</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          value={form.telefono}
                          onChange={(event) => setField('telefono', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Industria</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          value={form.industria}
                          onChange={(event) => setField('industria', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Ubicacion principal</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          value={form.ubicacion_principal}
                          onChange={(event) => setField('ubicacion_principal', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Tamano de empleados</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="number"
                          min="0"
                          value={form.tamano_empleados}
                          onChange={(event) => setField('tamano_empleados', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Sitio web</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          placeholder="https://empresa.com"
                          value={form.sitio_web}
                          onChange={(event) => setField('sitio_web', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">LinkedIn</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          placeholder="https://linkedin.com/company/..."
                          value={form.linkedin_url}
                          onChange={(event) => setField('linkedin_url', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Instagram</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          placeholder="https://instagram.com/..."
                          value={form.instagram_url}
                          onChange={(event) => setField('instagram_url', event.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-foreground/60">Facebook</span>
                        <input
                          className="w-full border border-border rounded-lg px-3 py-2"
                          type="text"
                          placeholder="https://facebook.com/..."
                          value={form.facebook_url}
                          onChange={(event) => setField('facebook_url', event.target.value)}
                        />
                      </label>
                    </div>

                    <label className="space-y-1 text-sm block">
                      <span className="text-foreground/60">Descripcion</span>
                      <textarea
                        className="w-full border border-border rounded-lg px-3 py-2 min-h-28"
                        value={form.descripcion}
                        onChange={(event) => setField('descripcion', event.target.value)}
                      />
                    </label>

                    <div
                      className="border border-border rounded-xl p-4 space-y-2 text-sm relative"
                      ref={logoMenuRef}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-foreground/60">Logo</p>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-full border border-border text-foreground/60 inline-flex items-center justify-center hover:bg-secondary"
                          onClick={() =>
                            setOpenQuickMenu((prev) => (prev === 'logo_edit' ? null : 'logo_edit'))
                          }
                          aria-label="Opciones de logo"
                          disabled={saving || uploadingLogo || deletingLogo}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      {openQuickMenu === 'logo_edit' ? (
                        <div className="absolute top-11 right-4 w-44 rounded-xl border border-border bg-white shadow-lg p-1 z-20 space-y-1">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary inline-flex items-center gap-2"
                            onClick={handleSelectLogo}
                            disabled={uploadingLogo || deletingLogo}
                          >
                            <Upload className="w-4 h-4" />
                            Subir
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary inline-flex items-center gap-2"
                            onClick={handleEditLogoMenu}
                            disabled
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary text-red-600 inline-flex items-center gap-2 disabled:text-foreground/40"
                            onClick={handleDeleteLogo}
                            disabled={deletingLogo || uploadingLogo || !logoSrc}
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={`Logo de ${perfilData?.empresa?.nombre || 'empresa'}`}
                          className="w-16 h-16 rounded-lg object-cover border border-border"
                        />
                      ) : (
                        <p className="text-xs text-foreground/60">Sin logo</p>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                      {uploadingLogo ? <p className="text-xs text-foreground/60">Subiendo logo...</p> : null}
                      {deletingLogo ? <p className="text-xs text-foreground/60">Eliminando logo...</p> : null}
                      <p className="text-[11px] text-foreground/50">Formatos: JPG, PNG, WEBP. Maximo 5 MB.</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        className="px-4 py-2 border border-border rounded-lg text-sm font-medium"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                        disabled={saving}
                      >
                        {saving ? 'Guardando...' : 'Guardar datos generales'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="border border-border rounded-xl p-4">
                          <p className="text-foreground/60">Nombre</p>
                          <p className="font-semibold inline-flex items-center gap-1.5">
                            <span>{formatDisplay(perfilData?.empresa?.nombre)}</span>
                            <VerifiedBadge entity={perfilData?.verificacion} />
                          </p>
                        </div>
                      <div className="border border-border rounded-xl p-4">
                        <p className="text-foreground/60">Industria</p>
                        <p className="font-semibold">{formatDisplay(perfilData?.perfil?.industria)}</p>
                      </div>
                      <div className="border border-border rounded-xl p-4">
                        <p className="text-foreground/60">Ubicacion</p>
                        <p className="font-semibold">
                          {formatDisplay(perfilData?.perfil?.ubicacion_principal)}
                        </p>
                      </div>
                      <div className="border border-border rounded-xl p-4">
                        <p className="text-foreground/60">Tamano</p>
                        <p className="font-semibold">{tamanoEmpleados}</p>
                      </div>
                    </div>

                    <div className="border border-border rounded-xl p-4 text-sm space-y-2">
                      <p className="text-foreground/60">Descripcion</p>
                      <p className="font-semibold">{formatDisplay(perfilData?.perfil?.descripcion)}</p>
                      <button
                        type="button"
                        className="text-xs text-primary font-semibold"
                        onClick={handleStartEdit}
                      >
                        Editar descripcion
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="border border-border rounded-xl p-4 space-y-2 relative" ref={logoMenuRef}>
                        <div className="flex items-center justify-between">
                          <p className="text-foreground/60">Logo</p>
                          <button
                            type="button"
                            className="w-7 h-7 rounded-full border border-border text-foreground/60 inline-flex items-center justify-center hover:bg-secondary"
                            onClick={() => setOpenQuickMenu((prev) => (prev === 'logo' ? null : 'logo'))}
                            aria-label="Opciones de logo"
                            disabled={uploadingLogo || deletingLogo}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                        {openQuickMenu === 'logo' ? (
                          <div className="absolute top-11 right-4 w-44 rounded-xl border border-border bg-white shadow-lg p-1 z-20 space-y-1">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary inline-flex items-center gap-2"
                              onClick={handleSelectLogo}
                              disabled={uploadingLogo || deletingLogo}
                            >
                              <Upload className="w-4 h-4" />
                              Subir
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary inline-flex items-center gap-2"
                              onClick={handleEditLogoMenu}
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary text-red-600 inline-flex items-center gap-2 disabled:text-foreground/40"
                              onClick={handleDeleteLogo}
                              disabled={deletingLogo || uploadingLogo || !logoSrc}
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        ) : null}
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt={`Logo de ${perfilData?.empresa?.nombre || 'empresa'}`}
                            className="w-16 h-16 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <p className="text-xs text-foreground/60">Sin logo</p>
                        )}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                        {deletingLogo ? <p className="text-xs text-foreground/60">Eliminando logo...</p> : null}
                        <p className="text-[11px] text-foreground/50">Formatos: JPG, PNG, WEBP. Maximo 5 MB.</p>
                      </div>
                      <div className="border border-border rounded-xl p-4 space-y-2 relative" ref={linksMenuRef}>
                        <div className="flex items-center justify-between">
                          <p className="text-foreground/60">Redes / web</p>
                          <button
                            type="button"
                            className="w-7 h-7 rounded-full border border-border text-foreground/60 inline-flex items-center justify-center hover:bg-secondary"
                            onClick={() => setOpenQuickMenu((prev) => (prev === 'links' ? null : 'links'))}
                            aria-label="Opciones de enlaces"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                        {openQuickMenu === 'links' ? (
                          <div className="absolute top-11 right-4 w-44 rounded-xl border border-border bg-white shadow-lg p-1 z-20">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary inline-flex items-center gap-2"
                              onClick={() => {
                                setOpenQuickMenu(null)
                                handleStartEdit()
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                              Editar enlaces
                            </button>
                          </div>
                        ) : null}
                        {socialLinks.length ? (
                          <div className="space-y-2">
                            {socialLinks.map((item) => {
                              const Icon = item.icon
                              return (
                                <a
                                  key={item.key}
                                  className="inline-flex items-center gap-2 text-primary text-sm font-semibold break-all"
                                  href={item.href}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Icon className="w-4 h-4" /> {item.label}
                                </a>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-foreground/60">No definido</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium"
                      onClick={handleStartEdit}
                    >
                      Editar datos generales
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Users className="w-5 h-5 text-primary" />
                Usuarios / reclutadores
              </div>
              {loadingUsers ? (
                <p className="text-sm text-foreground/70">Cargando usuarios...</p>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Activos</span>
                      <span className="font-semibold">{activeUsersCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Principal</span>
                      <span className="font-semibold">{principalUser?.nombre || 'No asignado'}</span>
                    </div>
                  </div>
                  <form className="space-y-2" onSubmit={handleCreateUser}>
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                      type="email"
                      placeholder="correo@empresa.com"
                      value={userForm.email}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                      required
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex-1" style={{ minWidth: '150px' }}>
                        <FormDropdown
                          value={userForm.rol_empresa}
                          options={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'reclutador', label: 'Reclutador' },
                            { value: 'visor', label: 'Visor' }
                          ]}
                          onChange={(val) =>
                            setUserForm((prev) => ({ ...prev, rol_empresa: val }))
                          }
                        />
                      </div>
                      <label className="text-xs inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={userForm.principal}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, principal: event.target.checked }))
                          }
                        />
                        Principal
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold"
                      disabled={savingUser}
                    >
                      {savingUser ? 'Guardando...' : 'Agregar usuario'}
                    </button>
                  </form>
                  <div className="space-y-2">
                    {companyUsers.map((user) => (
                      <div key={user.id} className="border border-border rounded-lg p-2 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{user.nombre}</p>
                            <p className="text-foreground/60">{user.email}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-secondary">{user.estado}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div style={{ width: '130px' }}>
                            <FormDropdown
                              value={user.rol_empresa}
                              options={[
                                { value: 'admin', label: 'Admin' },
                                { value: 'reclutador', label: 'Reclutador' },
                                { value: 'visor', label: 'Visor' }
                              ]}
                              onChange={(val) => handleUpdateUserRole(user, val)}
                              disabled={Boolean(updatingUserId)}
                            />
                          </div>
                          <button
                            type="button"
                            className="px-2 py-1 border border-border rounded"
                            onClick={() => handleSetPrincipalUser(user)}
                            disabled={Boolean(updatingUserId) || user.principal}
                          >
                            {user.principal ? 'Principal' : 'Hacer principal'}
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border border-border rounded"
                            onClick={() => handleToggleUserState(user)}
                            disabled={Boolean(updatingUserId)}
                          >
                            {user.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {!companyUsers.length ? (
                      <p className="text-xs text-foreground/60">No hay usuarios vinculados.</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Building2 className="w-5 h-5 text-primary" />
                Preferencias de contratacion
              </div>
              {loadingPreferences ? (
                <p className="text-sm text-foreground/70">Cargando preferencias...</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold mb-1">Modalidades</p>
                    <div className="flex flex-wrap gap-2">
                      {MODALIDADES.map((item) => (
                        <label key={item} className="inline-flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={preferences.modalidades_permitidas.includes(item)}
                            onChange={() => toggleArrayValue('modalidades_permitidas', item)}
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Niveles</p>
                    <div className="flex flex-wrap gap-2">
                      {NIVELES.map((item) => (
                        <label key={item} className="inline-flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={preferences.niveles_experiencia.includes(item)}
                            onChange={() => toggleArrayValue('niveles_experiencia', item)}
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs min-h-20"
                    placeholder="Observaciones"
                    value={preferences.observaciones}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, observaciones: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold"
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                  >
                    {savingPreferences ? 'Guardando...' : 'Guardar preferencias'}
                  </button>
                </div>
              )}
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Verificacion
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Estado</span>
                <span
                  className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full ${verificationBadge.className}`}
                >
                  {verificationBadge.label}
                </span>
              </div>
              <div className="space-y-1 text-xs text-foreground/65">
                <p>Nivel: {verificationLevel === 'completo' ? 'Completo' : 'Basico'}</p>
                {verificationReviewedAt ? <p>Ultima revision: {String(verificationReviewedAt).slice(0, 10)}</p> : null}
                {verificationReason ? <p>Motivo: {verificationReason}</p> : null}
              </div>
              {canRequestVerification ? (
                <button
                  type="button"
                  className="text-xs text-primary font-semibold"
                  onClick={handleRequestVerification}
                  disabled={requestingVerification}
                >
                  {requestingVerification ? 'Solicitando...' : 'Solicitar revision'}
                </button>
              ) : (
                <button type="button" className="text-xs text-primary font-semibold" disabled>
                  En seguimiento
                </button>
              )}
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Desactivar empresa
              </div>
              <p className="text-sm text-foreground/70">
                Esta accion desactiva la empresa y marca inactivos los usuarios vinculados.
              </p>
              {!showDeactivateSurvey ? (
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 text-xs font-semibold"
                  onClick={() => setShowDeactivateSurvey(true)}
                  disabled={deletingCompany}
                >
                  Iniciar desactivacion
                </button>
              ) : (
                <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                  <label className="space-y-1 text-xs block">
                    <span className="font-semibold text-rose-800">Motivos (seleccion multiple, obligatorio)</span>
                    <div className="grid sm:grid-cols-2 gap-2 rounded-lg border border-rose-200 bg-white p-2">
                      {MOTIVOS_DESACTIVACION.map((item) => (
                        <label key={item.value} className="inline-flex items-center gap-2 text-xs text-foreground">
                          <input
                            type="checkbox"
                            checked={deactivationForm.motivos_codigos.includes(item.value)}
                            onChange={() => toggleDeactivationReason(item.value)}
                            disabled={deletingCompany}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </label>

                  {deactivationForm.motivos_codigos.includes('otro') ? (
                    <label className="space-y-1 text-xs block">
                      <span className="font-semibold text-rose-800">Otro motivo (obligatorio)</span>
                      <input
                        className="w-full border border-rose-200 rounded-lg px-3 py-2 bg-white"
                        type="text"
                        placeholder="Escribe aqui tu otro motivo"
                        value={deactivationForm.motivo_detalle}
                        onChange={(event) =>
                          setDeactivationForm((prev) => ({ ...prev, motivo_detalle: event.target.value }))
                        }
                        disabled={deletingCompany}
                        maxLength={1000}
                      />
                    </label>
                  ) : null}

                  <label className="inline-flex items-center gap-2 text-xs text-rose-900">
                    <input
                      type="checkbox"
                      checked={deactivationForm.requiere_soporte}
                      onChange={(event) =>
                        setDeactivationForm((prev) => ({ ...prev, requiere_soporte: event.target.checked }))
                      }
                      disabled={deletingCompany}
                    />
                    Quiero que soporte me contacte para ayudarme a continuar.
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-border text-xs font-semibold"
                      onClick={() => {
                        setShowDeactivateSurvey(false)
                        setDeactivationForm(DEACTIVATION_FORM_DEFAULT)
                      }}
                      disabled={deletingCompany}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 text-xs font-semibold"
                      onClick={handleAskDeleteCompanyConfirmation}
                      disabled={deletingCompany}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      {showDeactivateConfirmModal ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 space-y-4">
            <h3 className="font-heading text-lg font-semibold">Confirmar desactivacion</h3>
            <p className="text-sm text-foreground/70">
              Esta accion desactiva la empresa y dejara inactivos los usuarios vinculados. Estas seguro de continuar?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-border text-xs font-semibold"
                onClick={() => setShowDeactivateConfirmModal(false)}
                disabled={deletingCompany}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 text-xs font-semibold"
                onClick={handleDeleteCompany}
                disabled={deletingCompany}
              >
                {deletingCompany ? 'Desactivando...' : 'Si, desactivar cuenta'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

