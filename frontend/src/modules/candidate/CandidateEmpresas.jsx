import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import VerifiedBadge from '../../components/VerifiedBadge'
import { useAuth } from '../../context/AuthContext'
import {
  followSocialCompany,
  getSocialErrorMessage,
  listSocialCompanies,
  unfollowSocialCompany,
} from '../../services/social.api'
import { showToast } from '../../utils/showToast'
import './candidate.css'

function formatCount(value, singular, plural) {
  const safe = Number(value || 0)
  if (!safe) return null
  return safe === 1 ? `1 ${singular}` : `${safe} ${plural}`
}

export default function CandidateEmpresas() {
  const { user } = useAuth()
  const canFollow = user?.rol === 'candidato'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qInput, setQInput] = useState('')
  const [qApplied, setQApplied] = useState('')
  const [soloSeguidas, setSoloSeguidas] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [followLoadingId, setFollowLoadingId] = useState(null)

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / pageSize)
    return pages > 0 ? pages : 1
  }, [total, pageSize])

  async function fetchCompanies() {
    try {
      setLoading(true)
      const data = await listSocialCompanies({
        q: qApplied || undefined,
        solo_seguidas: soloSeguidas ? 1 : undefined,
        page,
        page_size: pageSize,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
      setError('')
    } catch (err) {
      setItems([])
      setTotal(0)
      setError(getSocialErrorMessage(err, 'No se pudieron cargar las empresas.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qApplied, soloSeguidas, page, pageSize])

  const onSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setQApplied(qInput.trim())
  }

  const toggleFollow = async (item) => {
    if (!canFollow || !item?.id) return
    try {
      setFollowLoadingId(item.id)
      if (item?.stats?.siguiendo) {
        await unfollowSocialCompany(item.id)
        showToast({ type: 'success', message: 'Dejaste de seguir esta empresa.' })
      } else {
        await followSocialCompany(item.id)
        showToast({ type: 'success', message: 'Ahora sigues esta empresa.' })
      }
      await fetchCompanies()
    } catch (err) {
      showToast({
        type: 'error',
        message: getSocialErrorMessage(err, 'No se pudo actualizar el seguimiento.'),
      })
    } finally {
      setFollowLoadingId(null)
    }
  }

  return (
    <div className="candidate-page">
      <Header />
      <main className="page-container candidate-content space-y-8">
        <section className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Empresas</h1>
          <p className="text-foreground/70 max-w-2xl">
            Explora empresas, revisa su perfil publico y sigue las que te interesan para monitorear nuevas vacantes.
          </p>
        </section>

        <section className="bg-white border border-border rounded-xl p-4">
          <form className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-end" onSubmit={onSearch}>
            <label className="text-xs text-foreground/65">
              Buscar empresa
              <input
                className="ef-control mt-1"
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Nombre, industria o ubicacion"
              />
            </label>
            <label className="text-xs text-foreground/65 inline-flex items-center gap-2 h-10 mt-auto">
              <input
                type="checkbox"
                checked={soloSeguidas}
                onChange={(event) => {
                  setSoloSeguidas(event.target.checked)
                  setPage(1)
                }}
              />
              Solo seguidas
            </label>
            <button className="candidate-cta md:w-auto" type="submit">Buscar</button>
          </form>
        </section>

        <section className="space-y-3">
          {loading ? <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">Cargando empresas...</div> : null}
          {!loading && error ? <div className="bg-white border border-border rounded-xl p-5 text-sm text-rose-700">{error}</div> : null}
          {!loading && !error && !items.length ? (
            <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">
              {qApplied || soloSeguidas
                ? 'No hay empresas para el filtro aplicado.'
                : 'No hay empresas disponibles para mostrar.'}
            </div>
          ) : null}

          {!loading && !error && items.map((item) => {
            const activeVacancies = Number(item?.stats?.vacantes_activas || 0)
            const peopleWorking = formatCount(
              item?.stats?.personas_actuales,
              'persona trabaja aqui actualmente',
              'personas trabajan aqui actualmente'
            )
            const peopleWorked = formatCount(
              item?.stats?.personas_total,
              'persona ha trabajado aqui',
              'personas han trabajado aqui'
            )

            return (
              <article key={item.id} className="bg-white border border-border rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-semibold inline-flex items-center gap-1.5">
                      <span>{item.nombre}</span>
                      <VerifiedBadge entity={item} />
                    </h2>
                    <p className="text-sm text-foreground/70">
                      {[item.industria, item.ubicacion_principal].filter(Boolean).join(' - ') || 'Perfil en construccion'}
                    </p>
                    {peopleWorking ? <p className="text-xs text-emerald-700 mt-1">{peopleWorking}</p> : null}
                    {peopleWorked ? <p className="text-xs text-foreground/60 mt-1">{peopleWorked}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/app/candidate/empresas/${item.id}`}
                      className="px-3 py-2 border border-border rounded-lg text-xs font-semibold text-foreground/80"
                    >
                      Ver perfil
                    </Link>
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                        item?.stats?.siguiendo
                          ? 'border border-primary text-primary bg-primary/10'
                          : 'bg-primary text-white'
                      } disabled:opacity-50`}
                      disabled={!canFollow || followLoadingId === item.id}
                      onClick={() => toggleFollow(item)}
                    >
                      {followLoadingId === item.id ? 'Procesando...' : (item?.stats?.siguiendo ? 'Siguiendo' : 'Seguir')}
                    </button>
                  </div>
                </div>
                {item.descripcion ? (
                  <p className="text-sm text-foreground/75">{item.descripcion}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {activeVacancies > 0 ? <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{activeVacancies} vacantes activas</span> : null}
                  {Number(item?.stats?.seguidores_total || 0) > 0 ? (
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                      {item.stats.seguidores_total} seguidores
                    </span>
                  ) : null}
                </div>
              </article>
            )
          })}
        </section>

        <section className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-foreground/70">Pagina {page} de {totalPages} - Total {total}</div>
          <div className="flex items-center gap-2">
            <select
              className="ef-control"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <button className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
