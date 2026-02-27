import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  Eye,
  EllipsisVertical,
  FileText,
  ListFilter,
  MapPin,
  MessageCircle,
  Monitor,
  Pencil,
  Plus,
  Pause,
  Search,
  TrendingUp,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import Header from '../../components/Header'
import VerifiedBadge from '../../components/VerifiedBadge'
import provinciasData from '../../assets/provincias.json'
import { apiRequest } from '../../services/api'
import { getMyCompanyPreferences } from '../../services/companyPerfil.api'
import { createMensajesVacanteConversation, getMensajesErrorMessage } from '../../services/mensajes.api'
import { downloadPostulacionCurriculumPdf, getPostulacionesErrorMessage } from '../../services/postulaciones.api'
import { showToast } from '../../utils/showToast'
import CandidatoPerfilProfesionalModal from './components/CandidatoPerfilProfesionalModal'
import './company.css'

const ESTADOS = ['borrador', 'activa', 'pausada', 'cerrada']
const MODALIDADES = ['presencial', 'remoto', 'hibrido']
const TIPOS_CONTRATO = ['tiempo_completo', 'medio_tiempo', 'por_horas', 'temporal', 'indefinido', 'otro']
const PAGO_PERIODOS = ['dia', 'mes']
const EN_PROCESO = new Set(['nuevo', 'en_revision', 'contactado', 'entrevista'])
const CONTRATADOS = new Set(['seleccionado', 'finalizado', 'contratado'])

function resolveDefaultModalidad(modalidadesPermitidas = []) {
  const allowed = Array.isArray(modalidadesPermitidas)
    ? modalidadesPermitidas.filter((item) => MODALIDADES.includes(item))
    : []
  return allowed[0] || 'presencial'
}

function initialForm(defaultModalidad = 'presencial') {
  return {
    titulo: '',
    area: '',
    provincia: '',
    ciudad: '',
    modalidad: defaultModalidad,
    tipo_contrato: 'tiempo_completo',
    pago_monto: '',
    pago_periodo: 'mes',
    descripcion: '',
    requisitos: '',
    estado: 'borrador',
    fecha_cierre: ''
  }
}

function asText(value) {
  if (value === null || value === undefined || value === '') return 'N/D'
  return String(value)
}

function formatDate(value) {
  if (!value) return 'N/D'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function statusClass(status) {
  if (status === 'activa') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (status === 'pausada') return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (status === 'cerrada') return 'bg-slate-100 text-slate-700 border border-slate-200'
  return 'bg-blue-100 text-blue-700 border border-blue-200'
}

function formatTipoContratoLabel(value) {
  const map = {
    tiempo_completo: 'Tiempo completo',
    medio_tiempo: 'Medio tiempo',
    por_horas: 'Por horas',
    temporal: 'Temporal',
    indefinido: 'Indefinido',
    otro: 'Otro'
  }
  return map[value] || String(value || '')
}

function formatPagoPeriodoLabel(value) {
  return value === 'dia' ? 'dia' : 'mes'
}

function formatPagoVacante(monto, periodo) {
  const numeric = Number(monto)
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Pago a convenir'
  const amount = new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(numeric)
  const period = periodo === 'dia' ? 'dia' : 'mes'
  return `$${amount}/${period}`
}

function normalizeLocationText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function formatEstadoProcesoLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'N/D'
  return raw
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toAssetUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return text.startsWith('/') ? `${apiBase}${text}` : `${apiBase}/${text}`
}

export default function CompanyVacantes() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('vacantes')
  const [selectedVacante, setSelectedVacante] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [countByVacante, setCountByVacante] = useState({})
  const [kpis, setKpis] = useState({ vacantesActivas: 0, totalPostulados: 0, enProceso: 0, contratados: 0 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm())
  const [saving, setSaving] = useState(false)
  const [preferenciasEmpresa, setPreferenciasEmpresa] = useState({ modalidades_permitidas: [] })
  const [openActionsVacanteId, setOpenActionsVacanteId] = useState(null)
  const [openPostuladoActionsId, setOpenPostuladoActionsId] = useState(null)

  const [dropdownsOpen, setDropdownsOpen] = useState({
    provincia: false,
    ciudad: false,
    area: false
  })

  const [provinciaSearch, setProvinciaSearch] = useState('')
  const [ciudadSearch, setCiudadSearch] = useState('')

  const [postulados, setPostulados] = useState([])
  const [postuladosLoading, setPostuladosLoading] = useState(false)
  const [postuladosError, setPostuladosError] = useState('')
  const [postuladosQuery, setPostuladosQuery] = useState('')
  const [postuladosPage, setPostuladosPage] = useState(1)
  const [postuladosPageSize, setPostuladosPageSize] = useState(20)
  const [postuladosTotal, setPostuladosTotal] = useState(0)
  const [postuladosKpis, setPostuladosKpis] = useState({
    total: 0,
    nuevos: 0,
    enProceso: 0,
    contratados: 0
  })

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileCandidate, setProfileCandidate] = useState(null)
  const [downloadingPostulacionId, setDownloadingPostulacionId] = useState(0)
  const [brokenPostuladosPhotos, setBrokenPostuladosPhotos] = useState({})

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const postuladosTotalPages = useMemo(() => Math.max(1, Math.ceil(postuladosTotal / postuladosPageSize)), [postuladosTotal, postuladosPageSize])
  const provinciasCatalog = useMemo(() => {
    return Object.entries(provinciasData || {})
      .map(([id, provincia]) => ({ id, label: String(provincia?.provincia || '').trim() }))
      .filter((item) => item.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const selectedProvinciaId = useMemo(() => {
    const current = normalizeLocationText(form.provincia)
    if (!current) return ''
    const found = provinciasCatalog.find((item) => normalizeLocationText(item.label) === current)
    return found?.id || ''
  }, [form.provincia, provinciasCatalog])

  const cantonesCatalog = useMemo(() => {
    if (!selectedProvinciaId) return []
    const cantones = provinciasData?.[selectedProvinciaId]?.cantones || {}
    return Object.entries(cantones)
      .map(([id, canton]) => ({ id, label: String(canton?.canton || '').trim() }))
      .filter((item) => item.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [selectedProvinciaId])

  const filteredProvinciasCatalog = useMemo(() => {
    const term = provinciaSearch.trim().toLowerCase()
    if (!term) return provinciasCatalog
    return provinciasCatalog.filter(p => p.label.toLowerCase().includes(term))
  }, [provinciasCatalog, provinciaSearch])

  const filteredCantonesCatalog = useMemo(() => {
    const term = ciudadSearch.trim().toLowerCase()
    if (!term) return cantonesCatalog
    return cantonesCatalog.filter(c => c.label.toLowerCase().includes(term))
  }, [cantonesCatalog, ciudadSearch])

  async function fetchVacantes() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (query.trim()) params.set('q', query.trim())
      if (estadoFiltro) params.set('estado', estadoFiltro)
      const data = await apiRequest(`/api/vacantes/mias?${params.toString()}`)
      const nextItems = Array.isArray(data?.items) ? data.items : []
      setItems(nextItems)
      setTotal(Number(data?.total || 0))
      setError('')

      const pairs = await Promise.all(
        nextItems.map(async (item) => {
          try {
            const countData = await apiRequest(`/api/postulaciones/empresa?vacante_id=${item.id}&page=1&page_size=1`)
            return [item.id, Number(countData?.total || 0)]
          } catch (_e) {
            return [item.id, 0]
          }
        })
      )
      setCountByVacante(Object.fromEntries(pairs))
    } catch (err) {
      setItems([])
      setTotal(0)
      setError(err?.payload?.error || err.message || 'No se pudieron cargar las vacantes.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchKpis() {
    try {
      const active = await apiRequest('/api/vacantes/mias?page=1&page_size=1&estado=activa')
      const totalPost = await apiRequest('/api/postulaciones/empresa?page=1&page_size=1')
      const snapshot = await apiRequest('/api/postulaciones/empresa?page=1&page_size=200')
      const statsItems = Array.isArray(snapshot?.items) ? snapshot.items : []
      setKpis({
        vacantesActivas: Number(active?.total || 0),
        totalPostulados: Number(totalPost?.total || 0),
        enProceso: statsItems.filter((it) => EN_PROCESO.has(it.estado_proceso)).length,
        contratados: statsItems.filter((it) => CONTRATADOS.has(it.estado_proceso)).length
      })
    } catch (_err) {
      setKpis({ vacantesActivas: 0, totalPostulados: 0, enProceso: 0, contratados: 0 })
    }
  }

  async function fetchPostuladosByVacante(vacanteId, search = '', nextPage = 1, nextPageSize = 20) {
    if (!vacanteId) return
    try {
      setPostuladosLoading(true)
      const params = new URLSearchParams({
        vacante_id: String(vacanteId),
        page: String(nextPage),
        page_size: String(nextPageSize)
      })
      if (search.trim()) params.set('q', search.trim())
      const data = await apiRequest(`/api/postulaciones/empresa?${params.toString()}`)
      setPostulados(Array.isArray(data?.items) ? data.items : [])
      setPostuladosTotal(Number(data?.total || 0))
      setPostuladosError('')
    } catch (err) {
      setPostulados([])
      setPostuladosTotal(0)
      setPostuladosError(err?.payload?.error || err.message || 'No se pudieron cargar los postulados.')
    } finally {
      setPostuladosLoading(false)
    }
  }

  async function fetchPostuladosKpis(vacanteId) {
    if (!vacanteId) return
    try {
      const data = await apiRequest(`/api/postulaciones/empresa?vacante_id=${vacanteId}&page=1&page_size=500`)
      const items = Array.isArray(data?.items) ? data.items : []
      const total = Number(data?.total || items.length || 0)
      const nuevos = items.filter((it) => it.estado_proceso === 'nuevo').length
      const enProceso = items.filter((it) => EN_PROCESO.has(it.estado_proceso)).length
      const contratados = items.filter((it) => CONTRATADOS.has(it.estado_proceso)).length
      setPostuladosKpis({ total, nuevos, enProceso, contratados })
    } catch (_err) {
      setPostuladosKpis({ total: 0, nuevos: 0, enProceso: 0, contratados: 0 })
    }
  }

  useEffect(() => {
    if (viewMode !== 'vacantes') return
    fetchVacantes()
    fetchKpis()
  }, [viewMode, page, pageSize, estadoFiltro])

  useEffect(() => {
    if (!openActionsVacanteId) return undefined
    const onPointerDown = (event) => {
      if (event.target?.closest?.('[data-vacante-actions]')) return
      setOpenActionsVacanteId(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openActionsVacanteId])

  useEffect(() => {
    if (!openPostuladoActionsId) return undefined
    const onPointerDown = (event) => {
      if (event.target?.closest?.('[data-postulado-actions]')) return
      setOpenPostuladoActionsId(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openPostuladoActionsId])

  useEffect(() => {
    let active = true
    async function fetchPreferenciasEmpresa() {
      try {
        const response = await getMyCompanyPreferences()
        if (!active) return
        const preferencias = response?.preferencias || {}
        setPreferenciasEmpresa({
          modalidades_permitidas: Array.isArray(preferencias.modalidades_permitidas)
            ? preferencias.modalidades_permitidas.filter((item) => MODALIDADES.includes(item))
            : []
        })
      } catch (_err) {
        if (!active) return
        setPreferenciasEmpresa({ modalidades_permitidas: [] })
      }
    }
    fetchPreferenciasEmpresa()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (viewMode !== 'postulados' || !selectedVacante?.id) return
    fetchPostuladosByVacante(selectedVacante.id, postuladosQuery, postuladosPage, postuladosPageSize)
  }, [viewMode, selectedVacante?.id, postuladosPage, postuladosPageSize])

  const openPostulados = (vacante) => {
    setSelectedVacante(vacante)
    setViewMode('postulados')
    setBrokenPostuladosPhotos({})
    setOpenPostuladoActionsId(null)
    setPostuladosQuery('')
    setPostuladosPage(1)
    fetchPostuladosByVacante(vacante.id, '', 1, postuladosPageSize)
    fetchPostuladosKpis(vacante.id)
  }

  const handleOpenPerfil = (candidate) => {
    setProfileCandidate(candidate || null)
    setProfileModalOpen(true)
  }

  const handleOpenMensajes = async (candidatoId) => {
    const vacanteId = Number(selectedVacante?.id || 0)
    const parsedCandidatoId = Number(candidatoId || 0)
    if (!Number.isInteger(vacanteId) || vacanteId <= 0) {
      showToast({ type: 'warning', message: 'Selecciona una vacante valida.' })
      return
    }
    if (!Number.isInteger(parsedCandidatoId) || parsedCandidatoId <= 0) {
      showToast({ type: 'warning', message: 'El candidato seleccionado no es valido.' })
      return
    }

    try {
      const response = await createMensajesVacanteConversation({
        vacante_id: vacanteId,
        candidato_id: parsedCandidatoId
      })
      const conversationId = Number(response?.conversacion?.id || 0)
      if (conversationId > 0) {
        navigate(`/app/company/mensajes?conv=${conversationId}`)
      } else {
        navigate('/app/company/mensajes')
      }
    } catch (error) {
      showToast({
        type: 'error',
        message: getMensajesErrorMessage(error, 'No se pudo abrir la conversacion con el candidato.')
      })
    }
  }

  const handleDownloadCurriculum = async (item, candidateName) => {
    const postulacionId = Number(item?.id || 0)
    if (!Number.isInteger(postulacionId) || postulacionId <= 0) {
      showToast({ type: 'error', message: 'La postulacion seleccionada no es valida.' })
      return
    }

    try {
      setDownloadingPostulacionId(postulacionId)
      const safeName = String(candidateName || 'candidato').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
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
    } catch (error) {
      showToast({ type: 'error', message: getPostulacionesErrorMessage(error, 'No se pudo descargar el curriculum.') })
    } finally {
      setDownloadingPostulacionId(0)
    }
  }

  const openCreateVacanteModal = () => {
    const defaultModalidad = resolveDefaultModalidad(preferenciasEmpresa.modalidades_permitidas)
    setEditingId(null)
    setForm(initialForm(defaultModalidad))
    setProvinciaSearch('')
    setCiudadSearch('')
    setIsModalOpen(true)
    setOpenActionsVacanteId(null)
  }

  const openEditVacanteModal = (item) => {
    setEditingId(item.id)
    setForm({
      ...initialForm(resolveDefaultModalidad(preferenciasEmpresa.modalidades_permitidas)),
      ...item,
      pago_monto: item.pago_monto ?? '',
      pago_periodo: item.pago_periodo || 'mes',
      fecha_cierre: item.fecha_cierre ? String(item.fecha_cierre).slice(0, 10) : ''
    })
    setProvinciaSearch('')
    setCiudadSearch('')
    setIsModalOpen(true)
    setOpenActionsVacanteId(null)
  }

  const updateVacanteEstado = async (vacanteId, estado) => {
    try {
      await apiRequest(`/api/vacantes/${vacanteId}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado })
      })
      showToast({
        type: 'success',
        message: `Vacante ${estado === 'pausada' ? 'pausada' : estado === 'activa' ? 'activada' : estado === 'cerrada' ? 'cerrada' : 'actualizada'
          }.`
      })
      setOpenActionsVacanteId(null)
      fetchVacantes()
      fetchKpis()
    } catch (err) {
      showToast({ type: 'error', message: err?.payload?.error || 'No se pudo actualizar el estado de la vacante.' })
    }
  }

  const estadoProcesoClass = (estado) => {
    if (estado === 'nuevo') return 'bg-blue-100 text-blue-700 border border-blue-200'
    if (estado === 'en_revision') return 'bg-amber-100 text-amber-700 border border-amber-200'
    if (estado === 'entrevista' || estado === 'contactado') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    if (CONTRATADOS.has(estado)) return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    return 'bg-slate-100 text-slate-700 border border-slate-200'
  }

  const getInitials = (nombres, apellidos) => {
    const name = `${nombres || ''} ${apellidos || ''}`.trim()
    if (!name) return 'NA'
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
  }

  const getDisplayNameLines = (nombres, apellidos) => {
    const nombresParts = String(nombres || '').trim().split(/\s+/).filter(Boolean)
    const apellidosParts = String(apellidos || '').trim().split(/\s+/).filter(Boolean)
    const firstLine = nombresParts.slice(0, 2).join(' ') || apellidosParts.slice(0, 2).join(' ') || 'Candidato'
    const secondLine = apellidosParts.join(' ') || (nombresParts.length > 2 ? nombresParts.slice(2).join(' ') : '')
    return { firstLine, secondLine }
  }

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-6">
        {viewMode === 'vacantes' ? (
          <>
            <section className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl sm:text-4xl font-bold company-title">Vacantes</h1>
                <p className="text-sm text-foreground/70 mt-1">Gestiona tus vacantes y revisa postulados desde un solo flujo.</p>
              </div>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0D4D8F]" type="button" onClick={openCreateVacanteModal}>
                <Plus className="w-4 h-4" /> Nueva vacante
              </button>
            </section>

            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <article className="company-card p-4 flex items-center gap-3"><BriefcaseBusiness className="w-5 h-5 text-[#0D4D8F]" /><div><p className="text-xs text-foreground/60">Vacantes activas</p><p className="text-3xl font-bold">{kpis.vacantesActivas}</p></div></article>
              <article className="company-card p-4 flex items-center gap-3"><Users className="w-5 h-5 text-[#0D4D8F]" /><div><p className="text-xs text-foreground/60">Total postulados</p><p className="text-3xl font-bold">{kpis.totalPostulados}</p></div></article>
              <article className="company-card p-4 flex items-center gap-3"><Clock3 className="w-5 h-5 text-[#0D4D8F]" /><div><p className="text-xs text-foreground/60">En proceso</p><p className="text-3xl font-bold">{kpis.enProceso}</p></div></article>
              <article className="company-card p-4 flex items-center gap-3"><TrendingUp className="w-5 h-5 text-[#0D4D8F]" /><div><p className="text-xs text-foreground/60">Contratados</p><p className="text-3xl font-bold">{kpis.contratados}</p></div></article>
            </section>

            <section className="company-card p-3">
              <form className="grid md:grid-cols-[1fr_180px] gap-2 items-center" onSubmit={(e) => { e.preventDefault(); setPage(1); fetchVacantes(); }}>
                <label className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" /><input className="w-full border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por titulo, area o ubicacion..." /></label>
                <div style={{ height: '42px' }}>
                  <FormDropdown
                    value={estadoFiltro}
                    options={[
                      { value: '', label: 'Todos' },
                      ...ESTADOS.map(it => ({ value: it, label: it }))
                    ]}
                    onChange={(value) => {
                      setEstadoFiltro(value)
                      setPage(1)
                    }}
                    placeholder="Estado"
                  />
                </div>
              </form>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
              {loading && <div className="company-card p-4 text-sm text-foreground/70">Cargando vacantes...</div>}
              {!loading && error && <div className="company-card p-4 text-sm text-rose-700">{error}</div>}
              {!loading && !error && items.map((item) => (
                <article key={item.id} className="company-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <h2 className="text-sm font-bold tracking-tight truncate">{item.titulo}</h2>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusClass(item.estado)}`}>{item.estado}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0D4D8F]"
                        type="button"
                        onClick={() => openPostulados(item)}
                        aria-label={`Ver postulados de ${item.titulo}`}
                      >
                        <Users className="w-3.5 h-3.5" /> {countByVacante[item.id] ?? 0}
                      </button>
                      <div className="relative" data-vacante-actions>
                        <button
                          data-vacante-actions
                          className="w-9 h-9 border border-border rounded-xl text-foreground/70 inline-flex items-center justify-center"
                          type="button"
                          onClick={() => setOpenActionsVacanteId((prev) => (prev === item.id ? null : item.id))}
                          aria-label={`Acciones de ${item.titulo}`}
                        >
                          <EllipsisVertical className="w-4 h-4" />
                        </button>
                        {openActionsVacanteId === item.id ? (
                          <div data-vacante-actions className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-white shadow-lg z-20 overflow-hidden">
                            <button data-vacante-actions type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary inline-flex items-center gap-2" onClick={() => openEditVacanteModal(item)}>
                              <Pencil className="w-4 h-4" /> Editar vacante
                            </button>
                            <button data-vacante-actions type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary inline-flex items-center gap-2" onClick={() => { setOpenActionsVacanteId(null); openPostulados(item) }}>
                              <Eye className="w-4 h-4" /> Ver postulados
                            </button>
                            <button
                              data-vacante-actions
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary inline-flex items-center gap-2"
                              onClick={() =>
                                updateVacanteEstado(
                                  item.id,
                                  item.estado === 'activa' ? 'pausada' : 'activa'
                                )
                              }
                            >
                              <Pause className="w-4 h-4" /> {item.estado === 'activa' ? 'Pausar vacante' : 'Activar vacante'}
                            </button>
                            <button
                              data-vacante-actions
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
                              disabled={item.estado === 'cerrada'}
                              onClick={() => updateVacanteEstado(item.id, 'cerrada')}
                            >
                              <XCircle className="w-4 h-4" /> Cerrar vacante
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground/70">
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{asText(item.area)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{asText(item.ciudad)}, {asText(item.provincia)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Monitor className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{asText(item.modalidad)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatPagoVacante(item.pago_monto, item.pago_periodo).replace('$', '')}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatDate(item.fecha_publicacion)}</span>
                    </span>
                  </div>
                </article>
              ))}
            </section>

            <section className="company-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="text-foreground/70">Mostrando {items.length} de {total} vacantes</div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border border-border rounded-xl disabled:opacity-50" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
                <span className="px-3 py-2 rounded-xl bg-[#0D4D8F] text-white font-semibold">{page}</span>
                <button className="px-4 py-2 border border-border rounded-xl disabled:opacity-50" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Siguiente</button>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-start gap-3">
                <button
                  className="w-10 h-10 border border-border rounded-xl inline-flex items-center justify-center text-foreground/70 bg-white"
                  type="button"
                  onClick={() => setViewMode('vacantes')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-heading text-2xl sm:text-4xl font-bold">{selectedVacante?.titulo || 'Vacante'}</h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass(selectedVacante?.estado)}`}>{selectedVacante?.estado || 'N/D'}</span>
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {asText(selectedVacante?.area)} · {asText(selectedVacante?.ciudad)}, {asText(selectedVacante?.provincia)} · {asText(selectedVacante?.modalidad)} · {formatPagoVacante(selectedVacante?.pago_monto, selectedVacante?.pago_periodo)}
                  </p>
                </div>
              </div>

              <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <article className="company-card p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-slate-100 inline-flex items-center justify-center"><Users className="w-5 h-5 text-[#0D4D8F]" /></span><div><p className="text-xs text-foreground/60">Total</p><p className="text-3xl font-bold leading-none mt-1">{postuladosKpis.total}</p></div></article>
                <article className="company-card p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-slate-100 inline-flex items-center justify-center"><FileText className="w-5 h-5 text-[#0D4D8F]" /></span><div><p className="text-xs text-foreground/60">Nuevos</p><p className="text-3xl font-bold leading-none mt-1">{postuladosKpis.nuevos}</p></div></article>
                <article className="company-card p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-slate-100 inline-flex items-center justify-center"><Clock3 className="w-5 h-5 text-[#0D4D8F]" /></span><div><p className="text-xs text-foreground/60">En proceso</p><p className="text-3xl font-bold leading-none mt-1">{postuladosKpis.enProceso}</p></div></article>
                <article className="company-card p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-slate-100 inline-flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-[#0D4D8F]" /></span><div><p className="text-xs text-foreground/60">Contratados</p><p className="text-3xl font-bold leading-none mt-1">{postuladosKpis.contratados}</p></div></article>
              </section>
            </section>

            <section className="company-card p-3">
              <form className="grid md:grid-cols-1 gap-2 items-end" onSubmit={(e) => { e.preventDefault(); setPostuladosPage(1); fetchPostuladosByVacante(selectedVacante?.id, postuladosQuery, 1, postuladosPageSize) }}>
                <label className="relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" /><input className="w-full border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background" value={postuladosQuery} onChange={(e) => setPostuladosQuery(e.target.value)} placeholder="Buscar por nombre o documento..." /></label>
              </form>
            </section>

            <section className="space-y-3">
              {postuladosLoading && <div className="company-card p-4 text-sm text-foreground/70">Cargando postulados...</div>}
              {!postuladosLoading && postuladosError && <div className="company-card p-4 text-sm text-rose-700">{postuladosError}</div>}
              {!postuladosLoading && !postuladosError && postulados.length === 0 && (
                <div className="company-card p-4 text-sm text-foreground/70">
                  {postuladosQuery.trim() ? 'No hay resultados para la busqueda actual.' : 'Esta vacante no tiene postulados aun.'}
                </div>
              )}
              {!postuladosLoading && !postuladosError && postulados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {postulados.map((item) => {
                    const name = `${item.nombres || ''} ${item.apellidos || ''}`.trim() || 'Candidato'
                    const photoKey = Number(item?.candidato_id || item?.id || 0)
                    const photoSrc = brokenPostuladosPhotos[photoKey] ? '' : toAssetUrl(item?.foto_url)
                    const { firstLine, secondLine } = getDisplayNameLines(item.nombres, item.apellidos)
                    return (
                      <article key={item.id} className="company-card p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={name}
                              className="w-12 h-12 rounded-full object-cover border border-border"
                              onError={() => setBrokenPostuladosPhotos((prev) => ({ ...prev, [photoKey]: true }))}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-[#0D4D8F] font-bold inline-flex items-center justify-center border border-border">
                              {getInitials(item.nombres, item.apellidos)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-foreground min-w-0">
                                  {secondLine ? (
                                    <>
                                      <span className="block truncate">{firstLine}</span>
                                      <span className="inline-flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{secondLine}</span>
                                        <VerifiedBadge entity={item} />
                                      </span>
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 min-w-0">
                                      <span className="truncate">{firstLine}</span>
                                      <VerifiedBadge entity={item} />
                                    </span>
                                  )}
                                </h3>
                              </div>
                              <div className="relative" data-postulado-actions>
                                <button
                                  data-postulado-actions
                                  type="button"
                                  className="w-9 h-9 border border-border rounded-xl text-foreground/70 inline-flex items-center justify-center shrink-0"
                                  onClick={() => setOpenPostuladoActionsId((prev) => (prev === item.id ? null : item.id))}
                                  aria-label={`Acciones de ${name}`}
                                >
                                  <EllipsisVertical className="w-4 h-4" />
                                </button>
                                {openPostuladoActionsId === item.id ? (
                                  <div data-postulado-actions className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-white shadow-lg z-20 overflow-hidden">
                                    <button
                                      data-postulado-actions
                                      type="button"
                                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary inline-flex items-center gap-2"
                                      onClick={() => {
                                        setOpenPostuladoActionsId(null)
                                        handleOpenPerfil({
                                          id: item.candidato_id,
                                          name,
                                          candidato_verificado: Number(item.candidato_verificado || 0) === 1,
                                          verificacion_cuenta_estado: item.candidato_verificacion_estado || null
                                        })
                                      }}
                                    >
                                      <User className="w-4 h-4" /> Ver perfil
                                    </button>
                                    <button
                                      data-postulado-actions
                                      type="button"
                                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary inline-flex items-center gap-2 disabled:opacity-60"
                                      onClick={() => {
                                        setOpenPostuladoActionsId(null)
                                        handleDownloadCurriculum(item, name)
                                      }}
                                      disabled={downloadingPostulacionId === Number(item.id)}
                                    >
                                      <Download className="w-4 h-4" /> {downloadingPostulacionId === Number(item.id) ? 'Descargando...' : 'Descargar CV'}
                                    </button>
                                    <button
                                      data-postulado-actions
                                      type="button"
                                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary inline-flex items-center gap-2"
                                      onClick={() => {
                                        setOpenPostuladoActionsId(null)
                                        handleOpenMensajes(item.candidato_id)
                                      }}
                                    >
                                      <MessageCircle className="w-4 h-4" /> Mensaje
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${estadoProcesoClass(item.estado_proceso)}`}>
                                {formatEstadoProcesoLabel(item.estado_proceso)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/70">
                              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {asText(item.documento_identidad)}</span>
                              <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {formatDate(item.fecha_postulacion)}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </section>

            <section className="company-card p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="text-foreground/70">Mostrando {postulados.length} de {postuladosTotal} postulados</div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border border-border rounded-xl disabled:opacity-50" type="button" onClick={() => setPostuladosPage((p) => Math.max(1, p - 1))} disabled={postuladosPage <= 1}>Anterior</button>
                <span className="px-3 py-2 rounded-xl bg-[#0D4D8F] text-white font-semibold">{postuladosPage}</span>
                <button className="px-4 py-2 border border-border rounded-xl disabled:opacity-50" type="button" onClick={() => setPostuladosPage((p) => Math.min(postuladosTotalPages, p + 1))} disabled={postuladosPage >= postuladosTotalPages}>Siguiente</button>
              </div>
            </section>
          </>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 px-4 py-6 overflow-y-auto" onClick={() => { setIsModalOpen(false); setEditingId(null); setForm(initialForm(resolveDefaultModalidad(preferenciasEmpresa.modalidades_permitidas))) }} role="presentation">
          <section className="company-card max-w-3xl mx-auto p-4 sm:p-6 space-y-3" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editingId ? `Editar vacante #${editingId}` : 'Crear vacante'}</h2></div>
            <form className="grid sm:grid-cols-2 gap-3" onSubmit={async (event) => {
              event.preventDefault()
              if (!form.titulo.trim()) return showToast({ type: 'error', message: 'El titulo es obligatorio.' })
              const pagoMontoRaw = String(form.pago_monto || '').trim()
              let pagoMonto = null
              let pagoPeriodo = null
              if (pagoMontoRaw) {
                const parsedMonto = Number(pagoMontoRaw)
                if (!Number.isFinite(parsedMonto) || parsedMonto <= 0) {
                  return showToast({ type: 'error', message: 'El pago debe ser un valor numerico mayor a 0.' })
                }
                if (!PAGO_PERIODOS.includes(form.pago_periodo)) {
                  return showToast({ type: 'error', message: 'Selecciona un periodo de pago valido.' })
                }
                pagoMonto = Number(parsedMonto.toFixed(2))
                pagoPeriodo = form.pago_periodo
              }
              const basePayload = {
                titulo: form.titulo.trim(),
                area: form.area.trim() || null,
                provincia: form.provincia.trim() || null,
                ciudad: form.ciudad.trim() || null,
                modalidad: form.modalidad,
                tipo_contrato: form.tipo_contrato,
                pago_monto: pagoMonto,
                pago_periodo: pagoPeriodo,
                descripcion: form.descripcion.trim() || null,
                requisitos: form.requisitos.trim() || null,
                fecha_cierre: form.fecha_cierre || null
              }
              const payload = editingId ? basePayload : { ...basePayload, estado: form.estado }
              try {
                setSaving(true)
                if (editingId) await apiRequest(`/api/vacantes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
                else await apiRequest('/api/vacantes', { method: 'POST', body: JSON.stringify(payload) })
                showToast({ type: 'success', message: editingId ? 'Vacante actualizada.' : 'Vacante creada.' })
                setIsModalOpen(false); setEditingId(null); setForm(initialForm(resolveDefaultModalidad(preferenciasEmpresa.modalidades_permitidas))); fetchVacantes(); fetchKpis()
              } catch (err) {
                showToast({ type: 'error', message: err?.payload?.error || 'No se pudo guardar la vacante.' })
              } finally { setSaving(false) }
            }}>
              <label className="text-xs text-foreground/65 sm:col-span-2">Titulo<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.titulo} onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65">Area<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65">
                Provincia
                <div
                  className="ef-dropdown w-full mt-1"
                  tabIndex={0}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setDropdownsOpen(prev => ({ ...prev, provincia: false }))
                    }
                  }}
                >
                  <input
                    className="ef-control w-full"
                    placeholder="Selecciona provincia"
                    value={dropdownsOpen.provincia ? provinciaSearch : (provinciasCatalog.find(p => p.id === selectedProvinciaId)?.label || form.provincia || '')}
                    onFocus={() => {
                      setProvinciaSearch(form.provincia || '')
                      setDropdownsOpen(prev => ({ ...prev, provincia: true }))
                    }}
                    onChange={(e) => {
                      setProvinciaSearch(e.target.value)
                      setForm((prev) => ({ ...prev, provincia: e.target.value, ciudad: '' }))
                      setCiudadSearch('')
                      setDropdownsOpen(prev => ({ ...prev, provincia: true }))
                    }}
                  />
                  {dropdownsOpen.provincia && (
                    <div className="ef-dropdown-menu">
                      {filteredProvinciasCatalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="ef-dropdown-option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, provincia: item.label, ciudad: '' }))
                            setCiudadSearch('')
                            setDropdownsOpen(prev => ({ ...prev, provincia: false }))
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                      {!filteredProvinciasCatalog.length && (
                        <p className="px-3 py-2 text-xs text-foreground/60">Sin coincidencias</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="text-xs text-foreground/65">
                Ciudad
                <div
                  className={`ef-dropdown w-full mt-1 ${!selectedProvinciaId ? 'opacity-50 pointer-events-none' : ''}`}
                  tabIndex={0}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setDropdownsOpen(prev => ({ ...prev, ciudad: false }))
                    }
                  }}
                >
                  <input
                    className="ef-control w-full"
                    placeholder="Selecciona ciudad"
                    value={dropdownsOpen.ciudad ? ciudadSearch : form.ciudad}
                    onFocus={() => {
                      setCiudadSearch(form.ciudad || '')
                      setDropdownsOpen(prev => ({ ...prev, ciudad: true }))
                    }}
                    onChange={(e) => {
                      setCiudadSearch(e.target.value)
                      setForm((prev) => ({ ...prev, ciudad: e.target.value }))
                      setDropdownsOpen(prev => ({ ...prev, ciudad: true }))
                    }}
                    disabled={!selectedProvinciaId}
                  />
                  {dropdownsOpen.ciudad && (
                    <div className="ef-dropdown-menu">
                      {filteredCantonesCatalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="ef-dropdown-option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, ciudad: item.label }))
                            setDropdownsOpen(prev => ({ ...prev, ciudad: false }))
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                      {!filteredCantonesCatalog.length && (
                        <p className="px-3 py-2 text-xs text-foreground/60">Sin coincidencias</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="text-xs text-foreground/65">Modalidad
                <div className="mt-1" style={{ height: '40px' }}>
                  <FormDropdown
                    value={form.modalidad}
                    options={MODALIDADES.map(item => ({ value: item, label: item }))}
                    onChange={(val) => setForm(prev => ({ ...prev, modalidad: val }))}
                  />
                </div>
              </label>
              <label className="text-xs text-foreground/65">Tipo contrato
                <div className="mt-1" style={{ height: '40px' }}>
                  <FormDropdown
                    value={form.tipo_contrato}
                    options={TIPOS_CONTRATO.map(item => ({ value: item, label: formatTipoContratoLabel(item) }))}
                    onChange={(val) => setForm(prev => ({ ...prev, tipo_contrato: val }))}
                  />
                </div>
              </label>
              <label className="text-xs text-foreground/65">Pago (USD)
                <input
                  className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Ej: 600"
                  value={form.pago_monto}
                  onChange={(e) => setForm((prev) => ({ ...prev, pago_monto: e.target.value }))}
                />
              </label>
              <label className="text-xs text-foreground/65">Periodo de pago
                <div className="mt-1" style={{ height: '40px' }}>
                  <FormDropdown
                    value={form.pago_periodo}
                    options={PAGO_PERIODOS.map(item => ({ value: item, label: formatPagoPeriodoLabel(item) }))}
                    onChange={(val) => setForm(prev => ({ ...prev, pago_periodo: val }))}
                    placeholder="mes"
                    disabled={!String(form.pago_monto || '').trim()}
                  />
                </div>
              </label>
              {!editingId ? (
                <label className="text-xs text-foreground/65">Estado inicial
                  <div className="mt-1" style={{ height: '40px' }}>
                    <FormDropdown
                      value={form.estado}
                      options={ESTADOS.map(item => ({ value: item, label: item }))}
                      onChange={(val) => setForm(prev => ({ ...prev, estado: val }))}
                    />
                  </div>
                </label>
              ) : null}
              <label className="text-xs text-foreground/65">Fecha cierre<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" type="date" value={form.fecha_cierre} onChange={(e) => setForm((prev) => ({ ...prev, fecha_cierre: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65 sm:col-span-2">Descripcion<textarea className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65 sm:col-span-2">Requisitos<textarea className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.requisitos} onChange={(e) => setForm((prev) => ({ ...prev, requisitos: e.target.value }))} /></label>
              <div className="sm:col-span-2 flex items-center gap-2"><button className="px-4 py-2 bg-[#0D4D8F] text-white rounded-lg text-sm font-medium" type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar vacante' : 'Crear vacante'}</button></div>
            </form>
          </section>
        </div>
      )}

      <CandidatoPerfilProfesionalModal
        open={profileModalOpen}
        candidate={profileCandidate}
        onClose={() => setProfileModalOpen(false)}
        onSendMessage={(candidate) => {
          if (!candidate?.id) return
          setProfileModalOpen(false)
          handleOpenMensajes(candidate.id)
        }}
      />
    </div>
  )
}
