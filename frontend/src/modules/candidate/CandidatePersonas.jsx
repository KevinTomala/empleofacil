import { useEffect, useMemo, useState } from 'react'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import {
  followSocialCandidate,
  getSocialErrorMessage,
  listSocialCandidates,
  unfollowSocialCandidate,
} from '../../services/social.api'
import { showToast } from '../../utils/showToast'
import './candidate.css'

function toAssetUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return text.startsWith('/') ? `${apiBase}${text}` : `${apiBase}/${text}`
}

export default function CandidatePersonas() {
  const { user } = useAuth()
  const canFollow = user?.rol === 'candidato'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qInput, setQInput] = useState('')
  const [qApplied, setQApplied] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [brokenPhotos, setBrokenPhotos] = useState({})
  const [followLoadingId, setFollowLoadingId] = useState(null)

  const totalPages = useMemo(() => {
    const pages = Math.ceil(total / pageSize)
    return pages > 0 ? pages : 1
  }, [total, pageSize])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const data = await listSocialCandidates({
        q: qApplied || undefined,
        page,
        page_size: pageSize,
        exclude_me: 1,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
      setError('')
    } catch (err) {
      setItems([])
      setTotal(0)
      setError(getSocialErrorMessage(err, 'No se pudieron cargar los candidatos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qApplied, page, pageSize])

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
        await unfollowSocialCandidate(item.id)
        showToast({ type: 'success', message: 'Dejaste de seguir a este candidato.' })
      } else {
        await followSocialCandidate(item.id)
        showToast({ type: 'success', message: 'Ahora sigues a este candidato.' })
      }
      await fetchCandidates()
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
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Personas</h1>
          <p className="text-foreground/70 max-w-2xl">
            Descubre resumenes profesionales de otros candidatos para networking dentro de EmpleoFacil.
          </p>
        </section>

        <section className="bg-white border border-border rounded-xl p-4">
          <form className="grid md:grid-cols-[1fr_auto] gap-2 items-end" onSubmit={onSearch}>
            <label className="text-xs text-foreground/65">
              Buscar persona
              <input
                className="ef-control mt-1"
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Nombre, ciudad, cargo o habilidad"
              />
            </label>
            <button className="candidate-cta md:w-auto" type="submit">Buscar</button>
          </form>
        </section>

        <section className="space-y-3">
          {loading ? <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">Cargando personas...</div> : null}
          {!loading && error ? <div className="bg-white border border-border rounded-xl p-5 text-sm text-rose-700">{error}</div> : null}
          {!loading && !error && !items.length ? (
            <div className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">
              {qApplied ? 'No hay candidatos para la busqueda aplicada.' : 'No hay resumenes disponibles por ahora.'}
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="candidate-people-grid">
              {items.map((item) => {
                const key = Number(item?.id || 0)
                const photoSrc = brokenPhotos[key] ? '' : toAssetUrl(item?.foto_url)
                return (
                  <article key={item.id} className="candidate-person-card">
                    <div className="candidate-person-card__head">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={item?.nombre || 'Candidato'}
                          className="candidate-person-card__avatar"
                          onError={() => setBrokenPhotos((prev) => ({ ...prev, [key]: true }))}
                        />
                      ) : (
                        <span className="candidate-person-card__avatar-fallback">
                          {item?.iniciales || 'NA'}
                        </span>
                      )}
                      <h2 className="candidate-person-card__name">{item.nombre}</h2>
                      <p className="candidate-person-card__title">{item.titular || 'Perfil profesional en desarrollo'}</p>
                      {item.ubicacion ? <p className="candidate-person-card__meta">{item.ubicacion}</p> : null}
                    </div>

                    <div className="candidate-person-card__stats">
                      {Number(item?.stats?.empresas_actuales || 0) > 0 ? (
                        <span className="candidate-person-chip is-current">{item.stats.empresas_actuales} actuales</span>
                      ) : null}
                      {Number(item?.stats?.empresas_totales || 0) > 0 ? (
                        <span className="candidate-person-chip">{item.stats.empresas_totales} trayectoria</span>
                      ) : null}
                      {Number(item?.stats?.idiomas_total || 0) > 0 ? (
                        <span className="candidate-person-chip">{item.stats.idiomas_total} idiomas</span>
                      ) : null}
                      {Number(item?.stats?.seguidores_total || 0) > 0 ? (
                        <span className="candidate-person-chip">{item.stats.seguidores_total} seguidores</span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className={`candidate-person-follow ${
                        item?.stats?.siguiendo ? 'is-following' : ''
                      }`}
                      disabled={!canFollow || followLoadingId === item.id}
                      onClick={() => toggleFollow(item)}
                    >
                      {followLoadingId === item.id ? 'Procesando...' : (item?.stats?.siguiendo ? 'Siguiendo' : 'Seguir')}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : null}
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
            <button
              className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

