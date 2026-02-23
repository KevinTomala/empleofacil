import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Ellipsis,
  ListFilter,
  MapPin,
  Monitor,
  Plus,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'
import { apiRequest } from '../../services/api'
import { showToast } from '../../utils/showToast'
import CandidatoPerfilDrawer from './components/CandidatoPerfilDrawer'
import { getPerfilById, getPerfilErrorMessage } from '../../services/perfilCandidato.api'
import './company.css'

const ESTADOS = ['borrador', 'activa', 'pausada', 'cerrada']
const MODALIDADES = ['presencial', 'remoto', 'hibrido']
const TIPOS_CONTRATO = ['tiempo_completo', 'medio_tiempo', 'por_horas', 'temporal', 'indefinido', 'otro']
const EN_PROCESO = new Set(['nuevo', 'en_revision', 'contactado', 'entrevista'])
const CONTRATADOS = new Set(['seleccionado', 'finalizado', 'contratado'])

function initialForm() {
  return {
    titulo: '',
    area: '',
    provincia: '',
    ciudad: '',
    modalidad: 'presencial',
    tipo_contrato: 'tiempo_completo',
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

export default function CompanyVacantes() {
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

  const [postulados, setPostulados] = useState([])
  const [postuladosLoading, setPostuladosLoading] = useState(false)
  const [postuladosError, setPostuladosError] = useState('')
  const [postuladosQuery, setPostuladosQuery] = useState('')
  const [postuladosPage, setPostuladosPage] = useState(1)
  const [postuladosPageSize, setPostuladosPageSize] = useState(20)
  const [postuladosTotal, setPostuladosTotal] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [drawerPerfil, setDrawerPerfil] = useState(null)
  const [drawerCandidatoName, setDrawerCandidatoName] = useState('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])
  const postuladosTotalPages = useMemo(() => Math.max(1, Math.ceil(postuladosTotal / postuladosPageSize)), [postuladosTotal, postuladosPageSize])

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

  useEffect(() => {
    if (viewMode !== 'vacantes') return
    fetchVacantes()
    fetchKpis()
  }, [viewMode, page, pageSize, estadoFiltro])

  useEffect(() => {
    if (viewMode !== 'postulados' || !selectedVacante?.id) return
    fetchPostuladosByVacante(selectedVacante.id, postuladosQuery, postuladosPage, postuladosPageSize)
  }, [viewMode, selectedVacante?.id, postuladosPage, postuladosPageSize])

  const openPostulados = (vacante) => {
    setSelectedVacante(vacante)
    setViewMode('postulados')
    setPostuladosQuery('')
    setPostuladosPage(1)
    fetchPostuladosByVacante(vacante.id, '', 1, postuladosPageSize)
  }

  const handleOpenPerfil = async (id, name) => {
    setDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError('')
    setDrawerPerfil(null)
    setDrawerCandidatoName(name)
    try {
      setDrawerPerfil(await getPerfilById(id))
    } catch (err) {
      setDrawerError(getPerfilErrorMessage(err, 'No se pudo cargar el perfil del candidato.'))
    } finally {
      setDrawerLoading(false)
    }
  }

  const copyValue = async (value, label) => {
    const text = String(value || '').trim()
    if (!text) return showToast({ type: 'warning', message: `${label} no disponible.` })
    try {
      await navigator.clipboard.writeText(text)
      showToast({ type: 'success', message: `${label} copiado.` })
    } catch (_err) {
      showToast({ type: 'error', message: `No se pudo copiar ${label.toLowerCase()}.` })
    }
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
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0D4D8F]" type="button" onClick={() => setIsModalOpen(true)}>
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
              <form className="grid md:grid-cols-[1fr_180px] gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); fetchVacantes(); }}>
                <label className="relative"><Search className="w-2 h-2 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" /><input className="w-full border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por titulo, area o ubicacion..." /></label>
                <label className="relative"><ListFilter className="w-2 h-2 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" /><select className="w-full border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background appearance-none" value={estadoFiltro} onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1) }}>{['', ...ESTADOS].map((it) => <option key={it || 'all'} value={it}>{it || 'Todos'}</option>)}</select></label>
              </form>
            </section>

            <section className="space-y-3">
              {loading && <div className="company-card p-4 text-sm text-foreground/70">Cargando vacantes...</div>}
              {!loading && error && <div className="company-card p-4 text-sm text-rose-700">{error}</div>}
              {!loading && !error && items.map((item) => (
                <article key={item.id} className="company-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-1xl sm:text-1xl font-bold tracking-tight">{item.titulo}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass(item.estado)}`}>{item.estado}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/70">
                        <span className="inline-flex items-center gap-1"><Building2 className="w-4 h-4" /> {asText(item.area)}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {asText(item.ciudad)}, {asText(item.provincia)}</span>
                        <span className="inline-flex items-center gap-1"><Monitor className="w-4 h-4" /> {asText(item.modalidad)}</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {formatDate(item.fecha_publicacion)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0D4D8F]" type="button" onClick={() => openPostulados(item)}><Users className="w-4 h-4" /> {countByVacante[item.id] ?? 0} postulados</button>
                      <button className="w-10 h-10 border border-border rounded-xl text-foreground/70 inline-flex items-center justify-center" type="button" onClick={() => { setEditingId(item.id); setForm({ ...initialForm(), ...item, fecha_cierre: item.fecha_cierre ? String(item.fecha_cierre).slice(0, 10) : '' }); setIsModalOpen(true) }}><Ellipsis className="w-4 h-4" /></button>
                    </div>
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
            <section className="company-card p-4 sm:p-5 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h1 className="font-heading text-2xl sm:text-3xl font-bold">Postulados de vacante</h1><p className="text-sm text-foreground/70 mt-1">{selectedVacante?.titulo || 'Vacante'} - Estado: {selectedVacante?.estado || 'N/D'}</p></div>
                <button className="px-4 py-2 border border-border rounded-xl text-sm font-medium" type="button" onClick={() => setViewMode('vacantes')}>Volver a vacantes</button>
              </div>
            </section>

            <section className="company-card p-3">
              <form className="grid md:grid-cols-[1fr_auto] gap-2 items-end" onSubmit={(e) => { e.preventDefault(); setPostuladosPage(1); fetchPostuladosByVacante(selectedVacante?.id, postuladosQuery, 1, postuladosPageSize) }}>
                <label className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" /><input className="w-full border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background" value={postuladosQuery} onChange={(e) => setPostuladosQuery(e.target.value)} placeholder="Buscar por nombre, documento o email" /></label>
                <button className="px-4 py-2.5 bg-[#0D4D8F] text-white rounded-xl text-sm font-medium" type="submit">Buscar</button>
              </form>
            </section>

            <section className="space-y-3">
              {postuladosLoading && <div className="company-card p-4 text-sm text-foreground/70">Cargando postulados...</div>}
              {!postuladosLoading && postuladosError && <div className="company-card p-4 text-sm text-rose-700">{postuladosError}</div>}
              {!postuladosLoading && !postuladosError && postulados.map((item) => {
                const name = `${item.nombres || ''} ${item.apellidos || ''}`.trim() || 'Candidato'
                return (
                  <article key={item.id} className="company-card p-4 sm:p-5 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 text-sm text-foreground/75">
                        <h3 className="font-semibold text-xl text-foreground">{name}</h3>
                        <p>Documento: {asText(item.documento_identidad)}</p>
                        <p>Email: {asText(item.email)}</p>
                        <p>Telefono: {asText(item.telefono_celular)}</p>
                        <p>Postulado: {formatDate(item.fecha_postulacion)}</p>
                        <p>Estado proceso: {asText(item.estado_proceso)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="px-3 py-2 bg-[#0D4D8F] text-white rounded-xl text-xs font-semibold" onClick={() => handleOpenPerfil(item.candidato_id, name)}>Ver perfil</button>
                        <button type="button" className="px-3 py-2 border border-border rounded-xl text-xs" onClick={() => copyValue(item.email, 'Email')}>Copiar email</button>
                        <button type="button" className="px-3 py-2 border border-border rounded-xl text-xs" onClick={() => copyValue(item.telefono_celular, 'Telefono')}>Copiar telefono</button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 px-4 py-6 overflow-y-auto" onClick={() => { setIsModalOpen(false); setEditingId(null); setForm(initialForm()) }} role="presentation">
          <section className="company-card max-w-3xl mx-auto p-4 sm:p-6 space-y-3" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editingId ? `Editar vacante #${editingId}` : 'Crear vacante'}</h2></div>
            <form className="grid sm:grid-cols-2 gap-3" onSubmit={async (event) => {
              event.preventDefault()
              if (!form.titulo.trim()) return showToast({ type: 'error', message: 'El titulo es obligatorio.' })
              const payload = { ...form, titulo: form.titulo.trim(), area: form.area.trim() || null, provincia: form.provincia.trim() || null, ciudad: form.ciudad.trim() || null, descripcion: form.descripcion.trim() || null, requisitos: form.requisitos.trim() || null, fecha_cierre: form.fecha_cierre || null }
              try {
                setSaving(true)
                if (editingId) await apiRequest(`/api/vacantes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
                else await apiRequest('/api/vacantes', { method: 'POST', body: JSON.stringify(payload) })
                showToast({ type: 'success', message: editingId ? 'Vacante actualizada.' : 'Vacante creada.' })
                setIsModalOpen(false); setEditingId(null); setForm(initialForm()); fetchVacantes(); fetchKpis()
              } catch (err) {
                showToast({ type: 'error', message: err?.payload?.error || 'No se pudo guardar la vacante.' })
              } finally { setSaving(false) }
            }}>
              <label className="text-xs text-foreground/65 sm:col-span-2">Titulo<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.titulo} onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65">Area<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65">Provincia<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.provincia} onChange={(e) => setForm((prev) => ({ ...prev, provincia: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65">Ciudad<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.ciudad} onChange={(e) => setForm((prev) => ({ ...prev, ciudad: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65">Modalidad<select className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.modalidad} onChange={(e) => setForm((prev) => ({ ...prev, modalidad: e.target.value }))}>{MODALIDADES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs text-foreground/65">Tipo contrato<select className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.tipo_contrato} onChange={(e) => setForm((prev) => ({ ...prev, tipo_contrato: e.target.value }))}>{TIPOS_CONTRATO.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs text-foreground/65">Estado inicial<select className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.estado} onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value }))}>{ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs text-foreground/65">Fecha cierre<input className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" type="date" value={form.fecha_cierre} onChange={(e) => setForm((prev) => ({ ...prev, fecha_cierre: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65 sm:col-span-2">Descripcion<textarea className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} /></label>
              <label className="text-xs text-foreground/65 sm:col-span-2">Requisitos<textarea className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" value={form.requisitos} onChange={(e) => setForm((prev) => ({ ...prev, requisitos: e.target.value }))} /></label>
              <div className="sm:col-span-2 flex items-center gap-2"><button className="px-4 py-2 bg-[#0D4D8F] text-white rounded-lg text-sm font-medium" type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar vacante' : 'Crear vacante'}</button></div>
            </form>
          </section>
        </div>
      )}

      <CandidatoPerfilDrawer open={drawerOpen} candidatoName={drawerCandidatoName} loading={drawerLoading} error={drawerError} perfil={drawerPerfil} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
