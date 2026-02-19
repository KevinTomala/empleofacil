import { useEffect, useMemo, useState } from 'react'
import './admin.css'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Filter,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'
import { showToast } from '../../utils/showToast'
import {
  getVerificationErrorMessage,
  listVerificationAccounts,
  updateVerificationStatus,
} from '../../services/verificaciones.api'

const STATUS_STYLES = {
  pendiente: 'bg-amber-100 text-amber-700',
  en_revision: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-rose-100 text-rose-700',
  suspendida: 'bg-rose-100 text-rose-700',
  vencida: 'bg-slate-200 text-slate-700',
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

function formatDateShort(value) {
  if (!value) return 'N/A'
  const text = String(value)
  return text.slice(0, 10)
}

export default function AdminCuentas() {
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [items, setItems] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [searchText, setSearchText] = useState('')

  async function loadAccounts() {
    try {
      setLoading(true)
      const data = await listVerificationAccounts({
        estado: filtroEstado || undefined,
        tipo: filtroTipo || undefined,
        q: searchText || undefined,
        page: 1,
        page_size: 100,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
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
  }, [filtroEstado, filtroTipo])

  const empresas = useMemo(
    () => items.filter((item) => item.cuenta_tipo === 'empresa'),
    [items]
  )
  const candidatos = useMemo(
    () => items.filter((item) => item.cuenta_tipo === 'candidato'),
    [items]
  )

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    await loadAccounts()
  }

  const handleUpdateStatus = async (item, estado) => {
    if (!item?.id || updatingId) return

    const payload = { estado }
    if (estado === 'aprobada') {
      payload.nivel = 'completo'
      payload.comentario = 'Cuenta aprobada desde panel admin.'
    }
    if (estado === 'en_revision') {
      payload.comentario = 'Cuenta enviada a revision.'
    }
    if (estado === 'rechazada') {
      const motivo = window.prompt('Motivo de rechazo:')
      if (!motivo || !motivo.trim()) return
      payload.motivo_rechazo = motivo.trim()
      payload.comentario = 'Cuenta rechazada desde panel admin.'
    }
    if (estado === 'suspendida') {
      payload.comentario = 'Cuenta suspendida desde panel admin.'
    }

    try {
      setUpdatingId(item.id)
      const response = await updateVerificationStatus(item.id, payload)
      const updated = response?.verificacion
      if (updated) {
        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...updated } : row)))
      }
      showToast({ type: 'success', message: `Estado actualizado a ${formatStatus(estado)}.` })
    } catch (error) {
      showToast({
        type: 'error',
        message: getVerificationErrorMessage(error, 'No se pudo actualizar el estado.'),
      })
    } finally {
      setUpdatingId(null)
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
                <BadgeCheck className="w-4 h-4" /> Verificacion de cuentas
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Empresas y candidatos
              </h1>
              <p className="text-sm text-foreground/70 max-w-xl">
                Administra estados de verificacion. Administrador opera el flujo diario y superadmin resuelve excepciones.
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

        <section className="admin-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros rapidos
            </div>
            <button
              className="text-sm text-primary font-semibold"
              type="button"
              onClick={() => {
                setFiltroEstado('')
                setFiltroTipo('')
                setSearchText('')
              }}
            >
              Limpiar filtros
            </button>
          </div>
          <form className="grid lg:grid-cols-[1.1fr_1fr] gap-3 mt-3" onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60">
              <Search className="w-4 h-4" />
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar por nombre, email o documento"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
              >
                <option value="">Tipo: todos</option>
                <option value="empresa">Empresa</option>
                <option value="candidato">Candidato</option>
              </select>
              <select
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
              >
                <option value="">Estado: todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En revision</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="suspendida">Suspendida</option>
                <option value="vencida">Vencida</option>
              </select>
              <button className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70" type="submit">
                Buscar
              </button>
            </div>
          </form>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <h2 className="font-heading text-lg font-semibold">Empresas</h2>
            {loading ? <p className="text-sm text-foreground/70">Cargando verificaciones...</p> : null}
            {!loading && !empresas.length ? <p className="text-sm text-foreground/70">No hay empresas para mostrar.</p> : null}
            <div className="space-y-3">
              {empresas.map((empresa) => (
                <article key={empresa.id} className="border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{empresa.empresa_nombre || 'Empresa sin nombre'}</p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {empresa.empresa_email || 'Sin email'} - Solicitud: {formatDateShort(empresa.fecha_solicitud)}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[empresa.estado] || STATUS_STYLES.pendiente}`}>
                      {formatStatus(empresa.estado)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 mt-3">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Nivel: {empresa.nivel === 'completo' ? 'Completo' : 'Basico'}
                    </span>
                    <button
                      className="px-2.5 py-1 border border-border rounded-lg"
                      onClick={() => handleUpdateStatus(empresa, 'en_revision')}
                      type="button"
                      disabled={updatingId === empresa.id}
                    >
                      En revision
                    </button>
                    <button
                      className="px-2.5 py-1 border border-emerald-300 text-emerald-700 rounded-lg"
                      onClick={() => handleUpdateStatus(empresa, 'aprobada')}
                      type="button"
                      disabled={updatingId === empresa.id}
                    >
                      Aprobar
                    </button>
                    <button
                      className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded-lg"
                      onClick={() => handleUpdateStatus(empresa, 'rechazada')}
                      type="button"
                      disabled={updatingId === empresa.id}
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="admin-card p-5 space-y-4">
            <h2 className="font-heading text-lg font-semibold">Candidatos</h2>
            {loading ? <p className="text-sm text-foreground/70">Cargando verificaciones...</p> : null}
            {!loading && !candidatos.length ? <p className="text-sm text-foreground/70">No hay candidatos para mostrar.</p> : null}
            <div className="space-y-3">
              {candidatos.map((candidato) => (
                <article key={candidato.id} className="border border-border rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{candidato.candidato_nombre || 'Candidato sin nombre'}</p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {candidato.candidato_documento || 'Sin documento'} - {candidato.candidato_email || 'Sin email'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[candidato.estado] || STATUS_STYLES.pendiente}`}>
                      {formatStatus(candidato.estado)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 mt-3">
                    <span className="inline-flex items-center gap-1">
                      {candidato.estado === 'aprobada' ? (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : candidato.estado === 'en_revision' ? (
                        <Clock3 className="w-3.5 h-3.5 text-blue-600" />
                      ) : candidato.estado === 'rechazada' ? (
                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {formatStatus(candidato.estado)}
                    </span>
                    <button
                      className="px-2.5 py-1 border border-border rounded-lg"
                      onClick={() => handleUpdateStatus(candidato, 'en_revision')}
                      type="button"
                      disabled={updatingId === candidato.id}
                    >
                      En revision
                    </button>
                    <button
                      className="px-2.5 py-1 border border-emerald-300 text-emerald-700 rounded-lg"
                      onClick={() => handleUpdateStatus(candidato, 'aprobada')}
                      type="button"
                      disabled={updatingId === candidato.id}
                    >
                      Aprobar
                    </button>
                    <button
                      className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded-lg"
                      onClick={() => handleUpdateStatus(candidato, 'rechazada')}
                      type="button"
                      disabled={updatingId === candidato.id}
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
