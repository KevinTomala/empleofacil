import { useEffect, useMemo, useState } from 'react'
import './admin.css'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  MoreVertical,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { showToast } from '../../utils/showToast'
import {
  getVerificationAccountById,
  getVerificationErrorMessage,
  listVerificationAccounts,
} from '../../services/verificaciones.api'
import { getPerfilById, getPerfilErrorMessage } from '../../services/perfilCandidato.api'
import CandidatoPerfilDrawer from '../company/components/CandidatoPerfilDrawer'

const STATUS_STYLES = {
  pendiente: 'bg-amber-100 text-amber-700',
  en_revision: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-rose-100 text-rose-700',
  suspendida: 'bg-rose-100 text-rose-700',
  vencida: 'bg-slate-200 text-slate-700',
}

const TYPE_STYLES = {
  empresa: 'bg-indigo-100 text-indigo-700',
  candidato: 'bg-cyan-100 text-cyan-700',
}

function formatStatus(status) {
  const labelByStatus = {
    pendiente: 'Pendiente',
    en_revision: 'En revision',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    suspendida: 'Suspendida',
    vencida: 'Vencida',
  }
  return labelByStatus[String(status || '').trim()] || 'Pendiente'
}

function formatTypeLabel(tipo) {
  return String(tipo || '').trim() === 'empresa' ? 'Empresa' : 'Candidato'
}

function formatDateShort(value) {
  if (!value) return 'N/A'
  return String(value).slice(0, 10)
}

export default function AdminCuentas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [featuredIds, setFeaturedIds] = useState({})
  const [menuOpenId, setMenuOpenId] = useState(null)

  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [drawerPerfil, setDrawerPerfil] = useState(null)
  const [drawerCandidatoName, setDrawerCandidatoName] = useState('')

  const [empresaModalOpen, setEmpresaModalOpen] = useState(false)
  const [empresaModalLoading, setEmpresaModalLoading] = useState(false)
  const [empresaModalError, setEmpresaModalError] = useState('')
  const [empresaModalData, setEmpresaModalData] = useState(null)

  const totalPages = useMemo(() => {
    const pages = Math.ceil(Number(total || 0) / Number(pageSize || 1))
    return Math.max(pages, 1)
  }, [total, pageSize])

  const visibleFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const visibleTo = total === 0 ? 0 : Math.min(page * pageSize, total)

  async function loadAccounts() {
    try {
      setLoading(true)
      const data = await listVerificationAccounts({
        estado: filtroEstado || undefined,
        tipo: filtroTipo || undefined,
        q: searchQuery || undefined,
        page,
        page_size: pageSize,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudo cargar verificaciones.'),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroTipo, searchQuery, page, pageSize])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleClearFilters = () => {
    setFiltroEstado('')
    setFiltroTipo('')
    setSearchInput('')
    setSearchQuery('')
    setPage(1)
    setPageSize(20)
  }

  const handleGoToVerification = (item) => {
    if (!item?.has_solicitud) {
      showToast({
        type: 'error',
        message: 'Esta cuenta no tiene solicitud de verificacion. La opcion permanece bloqueada.',
      })
      return
    }
    const tab = item?.cuenta_tipo === 'empresa' ? 'verificacion_empresas' : 'solicitudes_candidatos'
    setMenuOpenId(null)
    navigate(`/app/admin/solicitudes#${tab}`)
  }

  const handleSendMessage = (item) => {
    const isEmpresa = item?.cuenta_tipo === 'empresa'
    const email = isEmpresa ? item?.empresa_email : item?.candidato_email
    if (!email) {
      showToast({ type: 'error', message: 'No hay correo disponible para enviar mensaje.' })
      return
    }
    const subject = encodeURIComponent('Revision de cuenta - EmpleoFacil')
    const body = encodeURIComponent('Hola,\n\nTe contactamos desde administracion para revisar tu cuenta.')
    setMenuOpenId(null)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  const handleToggleFeatured = (item) => {
    const canFeature = item?.nivel === 'completo'
    if (!canFeature) {
      showToast({ type: 'error', message: 'Solo cuentas premium (nivel completo) pueden destacarse.' })
      return
    }
    setFeaturedIds((prev) => {
      const nextValue = !prev[item.id]
      const nextMap = { ...prev, [item.id]: nextValue }
      showToast({
        type: 'success',
        message: nextValue ? 'Cuenta marcada como destacada.' : 'Cuenta removida de destacados.',
      })
      return nextMap
    })
    setMenuOpenId(null)
  }

  const handleOpenPerfil = async (item) => {
    const isEmpresa = item?.cuenta_tipo === 'empresa'

    if (isEmpresa) {
      try {
        setEmpresaModalOpen(true)
        setEmpresaModalLoading(true)
        setEmpresaModalError('')
        setEmpresaModalData(null)
        const data = await getVerificationAccountById(item.id, { limit: 10 })
        setEmpresaModalData(data)
      } catch (error) {
        setEmpresaModalError(getVerificationErrorMessage(error, 'No se pudo cargar el perfil de la empresa.'))
      } finally {
        setEmpresaModalLoading(false)
      }
      return
    }

    if (!item?.candidato_id) {
      showToast({ type: 'error', message: 'No se encontro el candidato de esta cuenta.' })
      return
    }

    setDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError('')
    setDrawerPerfil(null)
    setDrawerCandidatoName(item?.candidato_nombre || 'Candidato')
    try {
      const perfil = await getPerfilById(item.candidato_id)
      setDrawerPerfil(perfil)
    } catch (error) {
      setDrawerError(getPerfilErrorMessage(error, 'No se pudo cargar el perfil del candidato.'))
    } finally {
      setDrawerLoading(false)
    }
  }

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <BadgeCheck className="w-4 h-4" /> Gestion de cuentas
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Empresas y candidatos
              </h1>
              <p className="text-sm text-foreground/70 max-w-2xl">
                Vista administrable para alto volumen: filtros, busqueda, paginacion y acciones operativas unificadas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium flex items-center gap-2"
                onClick={loadAccounts}
                type="button"
              >
                <Users className="w-4 h-4" /> Actualizar
              </button>
              <button className="px-4 py-2 border border-border rounded-lg font-medium flex items-center gap-2" type="button">
                <ShieldOff className="w-4 h-4" /> Escalar a superadmin
              </button>
            </div>
          </div>
        </section>

        <section className="admin-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros inteligentes
            </div>
            <button className="text-sm text-primary font-semibold" type="button" onClick={handleClearFilters}>
              Limpiar filtros
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                filtroTipo === '' ? 'bg-primary text-white border-primary' : 'bg-white border-border text-foreground/70'
              }`}
              onClick={() => {
                setFiltroTipo('')
                setPage(1)
              }}
            >
              Todos
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                filtroTipo === 'empresa'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border text-foreground/70'
              }`}
              onClick={() => {
                setFiltroTipo('empresa')
                setPage(1)
              }}
            >
              Empresas
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                filtroTipo === 'candidato'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border text-foreground/70'
              }`}
              onClick={() => {
                setFiltroTipo('candidato')
                setPage(1)
              }}
            >
              Candidatos
            </button>
          </div>

          <form className="grid lg:grid-cols-[1.3fr_1fr] gap-3" onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60 bg-white">
              <Search className="w-4 h-4" />
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar por nombre, email o documento"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                value={filtroEstado}
                onChange={(event) => {
                  setFiltroEstado(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Estado: todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En revision</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="suspendida">Suspendida</option>
                <option value="vencida">Vencida</option>
              </select>
              <select
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) || 20)
                  setPage(1)
                }}
              >
                <option value="20">20 por pagina</option>
                <option value="50">50 por pagina</option>
                <option value="100">100 por pagina</option>
              </select>
              <button className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white" type="submit">
                Buscar
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-foreground/70">
              Mostrando <span className="font-semibold text-foreground">{visibleFrom}</span> a{' '}
              <span className="font-semibold text-foreground">{visibleTo}</span> de{' '}
              <span className="font-semibold text-foreground">{total}</span> cuentas
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-border rounded-lg text-xs font-semibold disabled:opacity-50"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={loading || page <= 1}
              >
                Anterior
              </button>
              <span className="text-xs text-foreground/70 px-2">
                Pagina {page} / {totalPages}
              </span>
              <button
                type="button"
                className="px-3 py-2 border border-border rounded-lg text-xs font-semibold disabled:opacity-50"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={loading || page >= totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>

          {loading ? <p className="text-sm text-foreground/70">Cargando cuentas...</p> : null}
          {!loading && !items.length ? (
            <p className="text-sm text-foreground/70">No se encontraron cuentas con los filtros aplicados.</p>
          ) : null}

          <div className="space-y-3">
            {items.map((item) => {
              const isEmpresa = item.cuenta_tipo === 'empresa'
              const title = isEmpresa ? item.empresa_nombre : item.candidato_nombre
              const email = isEmpresa ? item.empresa_email : item.candidato_email
              const documento = !isEmpresa ? item.candidato_documento : null
              const isFeatured = Boolean(featuredIds[item.id])
              const canVerifyAccount = Boolean(item.has_solicitud)

              return (
                <article key={item.id} className="border border-border rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{title || 'Sin nombre'}</p>
                        <button
                          className="p-1 rounded-md border border-border text-foreground/70 hover:text-foreground hover:bg-secondary"
                          onClick={() => handleOpenPerfil(item)}
                          type="button"
                          title="Abrir perfil"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-foreground/60 mt-1">
                        {email || 'Sin email'}
                        {documento ? ` - ${documento}` : ''}
                      </p>
                      <p className="text-xs text-foreground/50 mt-1">Solicitud: {formatDateShort(item.fecha_solicitud)}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_STYLES[item.cuenta_tipo] || TYPE_STYLES.candidato}`}
                        >
                          {formatTypeLabel(item.cuenta_tipo)}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[item.estado] || STATUS_STYLES.pendiente}`}
                        >
                          {formatStatus(item.estado)}
                        </span>
                        {isFeatured ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Destacada
                          </span>
                        ) : null}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          className="p-1.5 border border-border rounded-lg text-foreground/70 hover:text-foreground hover:bg-secondary"
                          onClick={() => setMenuOpenId((prev) => (prev === item.id ? null : item.id))}
                          title="Opciones"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === item.id ? (
                          <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-white shadow-lg p-1 z-10">
                            <button
                              type="button"
                              onClick={() => handleGoToVerification(item)}
                              disabled={!canVerifyAccount}
                              className="w-full text-left px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-secondary disabled:text-foreground/40 disabled:cursor-not-allowed"
                            >
                              Verificar cuenta
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendMessage(item)}
                              className="w-full text-left px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-secondary"
                            >
                              Enviar mensaje
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(item)}
                              className="w-full text-left px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-secondary"
                            >
                              {isFeatured ? 'Quitar destaque' : 'Destacar'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                    <span className="inline-flex items-center gap-1">
                      {item.estado === 'aprobada' ? (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : item.estado === 'en_revision' ? (
                        <Clock3 className="w-3.5 h-3.5 text-blue-600" />
                      ) : item.estado === 'rechazada' ? (
                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {formatStatus(item.estado)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Nivel: {item.nivel === 'completo' ? 'Completo (premium)' : 'Basico'}
                    </span>
                  </div>

                  {!canVerifyAccount ? (
                    <p className="text-[11px] text-foreground/50">
                      Verificar cuenta bloqueado: no existe una solicitud registrada.
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
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

      {empresaModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEmpresaModalOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-background border-l border-border shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Perfil de empresa</h2>
                <p className="text-xs text-foreground/60">Detalle de verificacion y trazabilidad</p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 border border-border rounded-lg text-sm"
                onClick={() => setEmpresaModalOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-3">
              {empresaModalLoading ? <p className="text-sm text-foreground/70">Cargando perfil...</p> : null}
              {!empresaModalLoading && empresaModalError ? (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {empresaModalError}
                </p>
              ) : null}

              {!empresaModalLoading && !empresaModalError && empresaModalData?.verificacion ? (
                <>
                  <section className="border border-border rounded-xl p-3 bg-white space-y-2">
                    <h3 className="text-sm font-semibold">Datos principales</h3>
                    <p className="text-xs text-foreground/80">
                      <span className="text-foreground/50">Empresa: </span>
                      {empresaModalData.verificacion.empresa_nombre || 'N/D'}
                    </p>
                    <p className="text-xs text-foreground/80">
                      <span className="text-foreground/50">Email: </span>
                      {empresaModalData.verificacion.empresa_email || 'N/D'}
                    </p>
                    <p className="text-xs text-foreground/80">
                      <span className="text-foreground/50">Estado: </span>
                      {formatStatus(empresaModalData.verificacion.estado)}
                    </p>
                    <p className="text-xs text-foreground/80">
                      <span className="text-foreground/50">Nivel: </span>
                      {empresaModalData.verificacion.nivel === 'completo' ? 'Completo' : 'Basico'}
                    </p>
                    <p className="text-xs text-foreground/80">
                      <span className="text-foreground/50">Ultima revision: </span>
                      {formatDateShort(empresaModalData.verificacion.reviewed_at)}
                    </p>
                    <p className="text-xs text-foreground/80">
                      <span className="text-foreground/50">Revisado por: </span>
                      {empresaModalData.verificacion.reviewed_by_nombre || 'N/D'}
                    </p>
                    {empresaModalData.verificacion.motivo_rechazo ? (
                      <p className="text-xs text-foreground/80">
                        <span className="text-foreground/50">Motivo rechazo: </span>
                        {empresaModalData.verificacion.motivo_rechazo}
                      </p>
                    ) : null}
                  </section>

                  <section className="border border-border rounded-xl p-3 bg-white space-y-2">
                    <h3 className="text-sm font-semibold">Eventos recientes</h3>
                    {!Array.isArray(empresaModalData.eventos) || !empresaModalData.eventos.length ? (
                      <p className="text-xs text-foreground/60">Sin eventos registrados.</p>
                    ) : (
                      <div className="space-y-2">
                        {empresaModalData.eventos.map((evento) => (
                          <article key={evento.id} className="border border-border/70 rounded-lg px-2 py-1.5">
                            <p className="text-xs text-foreground/80">
                              <span className="text-foreground/50">Accion: </span>
                              {evento.accion || 'N/D'}
                            </p>
                            <p className="text-xs text-foreground/80">
                              <span className="text-foreground/50">Actor: </span>
                              {evento.actor_nombre || evento.actor_rol || 'N/D'}
                            </p>
                            <p className="text-xs text-foreground/80">
                              <span className="text-foreground/50">Fecha: </span>
                              {formatDateShort(evento.created_at)}
                            </p>
                            {evento.comentario ? (
                              <p className="text-xs text-foreground/80">
                                <span className="text-foreground/50">Comentario: </span>
                                {evento.comentario}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
