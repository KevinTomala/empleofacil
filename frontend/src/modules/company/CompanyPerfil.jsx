import { useEffect, useMemo, useRef, useState } from 'react'
import './company.css'
import {
  Building2,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Link2,
  MoreVertical,
  Pencil,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'
import { showToast } from '../../utils/showToast'
import {
  deleteMyCompanyLogo,
  getCompanyPerfilErrorMessage,
  getMyCompanyVerification,
  getMyCompanyPerfil,
  requestMyCompanyVerification,
  updateMyCompanyDatosGenerales,
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
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return text.startsWith('/') ? `${apiBase}${text}` : `${apiBase}/${text}`
}

function buildCompanyResumen(payload) {
  const empresa = payload?.empresa || {}
  const perfil = payload?.perfil || {}

  const checks = [
    { label: 'Nombre', done: Boolean(String(empresa?.nombre || '').trim()) },
    { label: 'Industria', done: Boolean(String(perfil?.industria || '').trim()) },
    { label: 'Ubicacion', done: Boolean(String(perfil?.ubicacion_principal || '').trim()) },
    {
      label: 'Tamano',
      done: Number.isInteger(perfil?.tamano_empleados) && perfil?.tamano_empleados > 0,
    },
    { label: 'Descripcion', done: Boolean(String(perfil?.descripcion || '').trim()) },
    { label: 'Sitio web', done: Boolean(String(perfil?.sitio_web || '').trim()) },
    { label: 'Instagram', done: Boolean(String(perfil?.instagram_url || '').trim()) },
    { label: 'Facebook', done: Boolean(String(perfil?.facebook_url || '').trim()) },
    { label: 'Logo', done: Boolean(String(perfil?.logo_url || '').trim()) },
  ]

  const completados = checks.filter((item) => item.done).length
  const porcentajeCompletitud = Math.round((completados / checks.length) * 100)
  const camposPendientes = checks.filter((item) => !item.done).map((item) => item.label)

  return { porcentajeCompletitud, camposPendientes }
}

export default function CompanyPerfil() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [requestingVerification, setRequestingVerification] = useState(false)
  const [editing, setEditing] = useState(false)
  const [openQuickMenu, setOpenQuickMenu] = useState(null)
  const [perfilData, setPerfilData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
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

  const resumenUi = useMemo(() => {
    if (!perfilData) return { porcentajeCompletitud: 0, camposPendientes: [] }
    return buildCompanyResumen(perfilData)
  }, [perfilData])
  const porcentajeCompletitud = resumenUi.porcentajeCompletitud
  const pendientes = resumenUi.camposPendientes

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
    { key: 'sitio_web', label: sitioWeb, icon: Globe, href: toExternalUrl(sitioWeb) },
    { key: 'linkedin_url', label: linkedinUrl, icon: Linkedin, href: toExternalUrl(linkedinUrl) },
    { key: 'instagram_url', label: instagramUrl, icon: Instagram, href: toExternalUrl(instagramUrl) },
    { key: 'facebook_url', label: facebookUrl, icon: Facebook, href: toExternalUrl(facebookUrl) },
  ].filter((item) => item.label)
  const tamanoEmpleados =
    Number.isInteger(perfilData?.perfil?.tamano_empleados) && perfilData?.perfil?.tamano_empleados >= 0
      ? `${perfilData.perfil.tamano_empleados} personas`
      : 'No definido'

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
                        <p className="font-semibold">{formatDisplay(perfilData?.empresa?.nombre)}</p>
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
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Recruiter principal</span>
                  <span className="font-semibold">2 activos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Roles asignados</span>
                  <span className="font-semibold">Admin / Reclutador</span>
                </div>
              </div>
              <button type="button" className="text-xs text-primary font-semibold">
                Gestionar usuarios
              </button>
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Link2 className="w-5 h-5 text-primary" />
                Preferencias de contratacion
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Modalidad</span>
                  <span className="font-semibold">Hibrido / Presencial</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nivel de experiencia</span>
                  <span className="font-semibold">Junior / Semi-senior</span>
                </div>
              </div>
              <button type="button" className="text-xs text-primary font-semibold">
                Editar preferencias
              </button>
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
                <Globe className="w-5 h-5 text-primary" />
                Facturacion
              </div>
              <p className="text-sm text-foreground/70">
                Configura metodos de pago y plan de suscripcion si aplica.
              </p>
              <button type="button" className="text-xs text-primary font-semibold">
                Configurar facturacion
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
