import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import {
  followSocialCompany,
  getSocialCompanyProfile,
  getSocialErrorMessage,
  unfollowSocialCompany,
} from '../../services/social.api'
import { showToast } from '../../utils/showToast'
import './candidate.css'

function formatCount(value, singular, plural) {
  const safe = Number(value || 0)
  if (!safe) return null
  return safe === 1 ? `1 ${singular}` : `${safe} ${plural}`
}

function toAssetUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('http://') || text.startsWith('https://')) return text
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return text.startsWith('/') ? `${apiBase}${text}` : `${apiBase}/${text}`
}

export default function CandidateEmpresaPerfil() {
  const { user } = useAuth()
  const canFollow = user?.rol === 'candidato'
  const { empresaId } = useParams()

  const [empresa, setEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [brokenAvatars, setBrokenAvatars] = useState({})

  const stats = useMemo(() => empresa?.stats || {}, [empresa])
  const trayectoriaItems = useMemo(() => {
    const source = Array.isArray(empresa?.trayectoria_preview?.items) ? empresa.trayectoria_preview.items : []
    return source.slice(0, 5)
  }, [empresa])
  const personasActualesLabel = useMemo(
    () => formatCount(stats?.personas_actuales, 'persona trabaja aqui actualmente', 'personas trabajan aqui actualmente'),
    [stats]
  )
  const extraActuales = useMemo(() => {
    const totalActuales = Number(stats?.personas_actuales || 0)
    return Math.max(totalActuales - trayectoriaItems.length, 0)
  }, [stats, trayectoriaItems.length])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await getSocialCompanyProfile(empresaId)
      setEmpresa(data?.empresa || null)
      setError('')
    } catch (err) {
      setEmpresa(null)
      setError(getSocialErrorMessage(err, 'No se pudo cargar el perfil de empresa.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  useEffect(() => {
    setBrokenAvatars({})
  }, [empresaId, trayectoriaItems.length])

  const toggleFollow = async () => {
    if (!canFollow || !empresa?.id) return
    try {
      setSaving(true)
      let response
      if (stats?.siguiendo) {
        response = await unfollowSocialCompany(empresa.id)
        showToast({ type: 'success', message: 'Dejaste de seguir esta empresa.' })
      } else {
        response = await followSocialCompany(empresa.id)
        showToast({ type: 'success', message: 'Ahora sigues esta empresa.' })
      }
      if (response?.empresa) setEmpresa(response.empresa)
      else await loadProfile()
    } catch (err) {
      showToast({
        type: 'error',
        message: getSocialErrorMessage(err, 'No se pudo actualizar el seguimiento.'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="candidate-page">
      <Header />
      <main className="page-container candidate-content space-y-6">
        <section className="flex items-center justify-between gap-3">
          <h1 className="font-heading text-3xl font-bold">Perfil de empresa</h1>
          <Link to="/app/candidate/empresas" className="px-3 py-2 border border-border rounded-lg text-sm text-foreground/80">
            Volver a empresas
          </Link>
        </section>

        {loading ? <section className="bg-white border border-border rounded-xl p-5 text-sm text-foreground/70">Cargando perfil...</section> : null}
        {!loading && error ? <section className="bg-white border border-border rounded-xl p-5 text-sm text-rose-700">{error}</section> : null}

        {!loading && !error && empresa ? (
          <>
            <section className="bg-white border border-border rounded-xl p-6 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-2xl font-semibold">{empresa.nombre}</h2>
                  <p className="text-sm text-foreground/70">
                    {[empresa.industria, empresa.ubicacion_principal].filter(Boolean).join(' - ') || 'Sin informacion publica adicional'}
                  </p>
                </div>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    stats?.siguiendo ? 'border border-primary text-primary bg-primary/10' : 'bg-primary text-white'
                  } disabled:opacity-50`}
                  disabled={!canFollow || saving}
                  onClick={toggleFollow}
                >
                  {saving ? 'Procesando...' : (stats?.siguiendo ? 'Siguiendo' : 'Seguir empresa')}
                </button>
              </div>

              {empresa.descripcion ? (
                <p className="text-sm text-foreground/80">{empresa.descripcion}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {Number(stats?.vacantes_activas || 0) > 0 ? (
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    {stats.vacantes_activas} vacantes activas
                  </span>
                ) : null}
                {Number(stats?.seguidores_total || 0) > 0 ? (
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {stats.seguidores_total} seguidores
                  </span>
                ) : null}
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <article className="bg-white border border-border rounded-xl p-5 space-y-2">
                <h3 className="font-heading text-lg font-semibold">Personas que trabajan aqui</h3>
                {(trayectoriaItems.length || extraActuales > 0) ? (
                  <div className="candidate-company-avatars" aria-label="Personas que actualmente trabajan en esta empresa">
                    {trayectoriaItems.map((persona, index) => {
                      const key = persona?.candidato_id || `${persona?.nombre || 'candidato'}-${index}`
                      const photoSrc = brokenAvatars[key] ? '' : toAssetUrl(persona?.foto_url)
                      return (
                        <span
                          key={key}
                          className={`candidate-company-avatar ${persona?.actualmente_trabaja ? 'is-current' : ''}`}
                          title={persona?.nombre || 'Candidato'}
                        >
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={persona?.nombre || 'Candidato'}
                              onError={() => setBrokenAvatars((prev) => ({ ...prev, [key]: true }))}
                            />
                          ) : (
                            <span>{persona?.iniciales || 'NA'}</span>
                          )}
                        </span>
                      )
                    })}
                    {extraActuales > 0 ? (
                      <span className="candidate-company-avatar-extra" title={`${extraActuales} personas adicionales`}>
                        +{extraActuales}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {personasActualesLabel ? (
                  <p className="text-sm text-emerald-700">{personasActualesLabel}</p>
                ) : null}
                {!trayectoriaItems.length && !personasActualesLabel ? (
                  <p className="text-sm text-foreground/70">Sin personas trabajando actualmente visibles por ahora.</p>
                ) : null}
              </article>

              <article className="bg-white border border-border rounded-xl p-5 space-y-2">
                <h3 className="font-heading text-lg font-semibold">Contacto y enlaces</h3>
                <p className="text-sm text-foreground/70">Email: {empresa.email || 'N/D'}</p>
                <p className="text-sm text-foreground/70">Telefono: {empresa.telefono || 'N/D'}</p>
                {empresa.sitio_web ? (
                  <a className="text-sm text-primary underline" href={empresa.sitio_web} target="_blank" rel="noreferrer">
                    Sitio web
                  </a>
                ) : null}
              </article>
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}
