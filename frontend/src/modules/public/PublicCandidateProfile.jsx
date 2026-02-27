import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicPerfilById, getPerfilErrorMessage } from '../../services/perfilCandidato.api'
import './publicProfile.css'

function renderValue(value, fallback = 'N/D') {
  if (value === null || value === undefined || String(value).trim() === '') return fallback
  return String(value)
}

function formatDateShort(value) {
  if (!value) return 'N/D'
  return String(value).slice(0, 10)
}

function boolLabel(value) {
  if (value === 1 || value === true) return 'Si'
  if (value === 0 || value === false) return 'No'
  return 'N/D'
}

function diffMonths(fromDate, toDate) {
  if (!fromDate || !toDate) return null
  const start = new Date(fromDate)
  const end = new Date(toDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  let months = (end.getFullYear() - start.getFullYear()) * 12
  months += end.getMonth() - start.getMonth()
  if (end.getDate() < start.getDate()) months -= 1
  return Math.max(months, 0)
}

function buildExperienceYears(experiencia = []) {
  if (!Array.isArray(experiencia) || !experiencia.length) return 'Sin experiencia registrada'
  const totalMonths = experiencia.reduce((sum, item) => {
    const end = item?.actualmente_trabaja ? new Date().toISOString().slice(0, 10) : item?.fecha_fin
    const months = diffMonths(item?.fecha_inicio, end)
    return sum + (months || 0)
  }, 0)
  if (!totalMonths) return 'Sin experiencia registrada'
  return `${(totalMonths / 12).toFixed(1)} anios estimados`
}

function resolveEmpresaNombre(item) {
  if (item?.empresa_local_nombre) return item.empresa_local_nombre
  if (item?.empresa_nombre) return item.empresa_nombre
  if (item?.empresa_origen === 'ademy' && item?.empresa_origen_id) return `ADEMY #${item.empresa_origen_id}`
  if (item?.empresa_origen === 'manual') return 'Empresa registrada'
  return 'Empresa no especificada'
}

function buildResumenProfesional(perfil) {
  const firstExp = Array.isArray(perfil?.experiencia) ? perfil.experiencia[0] : null
  const cargo = renderValue(firstExp?.cargo, '')
  const empresa = resolveEmpresaNombre(firstExp)
  const descripcion = renderValue(firstExp?.descripcion, '')
  const titulo = renderValue(perfil?.educacion?.titulo_obtenido, '')
  if (descripcion) return descripcion
  if (cargo) return `${cargo} con experiencia en ${empresa}.`
  if (titulo) return `Perfil con formacion en ${titulo}.`
  return 'Perfil profesional en proceso de actualizacion.'
}

export default function PublicCandidateProfile() {
  const { candidatoId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        setLoading(true)
        setError('')
        setPerfil(null)
        const data = await getPublicPerfilById(candidatoId)
        if (!alive) return
        setPerfil(data?.perfil || null)
      } catch (err) {
        if (!alive) return
        setError(getPerfilErrorMessage(err, 'No se pudo cargar el perfil publico.'))
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [candidatoId])

  const experienciaRelevante = useMemo(
    () => (Array.isArray(perfil?.experiencia) ? perfil.experiencia.slice(0, 4) : []),
    [perfil]
  )
  const formacionRelevante = useMemo(
    () => (Array.isArray(perfil?.formacion_detalle) ? perfil.formacion_detalle.slice(0, 4) : []),
    [perfil]
  )
  const idiomasRelevantes = useMemo(
    () => (Array.isArray(perfil?.idiomas) ? perfil.idiomas.slice(0, 6) : []),
    [perfil]
  )
  const resumenProfesional = useMemo(() => buildResumenProfesional(perfil), [perfil])
  const nombreCompleto = `${renderValue(perfil?.datos_basicos?.nombres, '')} ${renderValue(perfil?.datos_basicos?.apellidos, '')}`.trim() || 'Perfil profesional'

  return (
    <main className="public-profile-page">
      <section className="public-profile-hero">
        <div className="public-profile-hero-content">
          <p className="public-profile-kicker">Perfil profesional publico</p>
          <h1>{loading ? 'Cargando perfil...' : nombreCompleto}</h1>
          {!loading && !error && perfil ? (
            <p className="public-profile-summary">{resumenProfesional}</p>
          ) : null}
        </div>
        <Link to="/" className="public-profile-home-link">Ir al inicio</Link>
      </section>

      {loading ? <section className="public-profile-card">Cargando informacion...</section> : null}
      {!loading && error ? <section className="public-profile-card public-profile-error">{error}</section> : null}

      {!loading && !error && perfil ? (
        <section className="public-profile-layout">
          <article className="public-profile-card public-profile-stats">
            <h2>Resumen</h2>
            <div className="public-profile-stat-grid">
              <div>
                <span>Experiencia</span>
                <strong>{buildExperienceYears(perfil?.experiencia)}</strong>
              </div>
              <div>
                <span>Nacionalidad</span>
                <strong>{renderValue(perfil?.datos_basicos?.nacionalidad)}</strong>
              </div>
              <div>
                <span>Ubicacion</span>
                <strong>{renderValue(perfil?.ubicacion?.provincia || perfil?.ubicacion?.pais)}</strong>
              </div>
              <div>
                <span>Movilizacion</span>
                <strong>{boolLabel(perfil?.logistica?.movilizacion)}</strong>
              </div>
            </div>
            <p className="public-profile-policy">
              El contacto se gestiona por mensajeria interna dentro de EmpleoFacil.
            </p>
          </article>

          <article className="public-profile-card">
            <h2>Experiencia relevante</h2>
            {!experienciaRelevante.length ? <p>Sin experiencia registrada.</p> : null}
            {experienciaRelevante.map((item, idx) => (
              <div className="public-profile-item" key={`${item.cargo || 'cargo'}-${item.fecha_inicio || idx}`}>
                <h3>{renderValue(item.cargo)}</h3>
                <p>{resolveEmpresaNombre(item)}</p>
                <p>
                  {formatDateShort(item.fecha_inicio)} - {item.actualmente_trabaja ? 'Actual' : formatDateShort(item.fecha_fin)}
                </p>
              </div>
            ))}
          </article>

          <article className="public-profile-card">
            <h2>Formacion y certificaciones</h2>
            {!formacionRelevante.length ? <p>Sin formacion registrada.</p> : null}
            {formacionRelevante.map((item, idx) => (
              <div className="public-profile-item" key={`${item.subtipo_formacion || 'formacion'}-${idx}`}>
                <h3>{renderValue(item.nombre_programa || item.titulo_obtenido)}</h3>
                <p>{renderValue(item.institucion)}</p>
                <p>{renderValue(item.subtipo_formacion)}</p>
              </div>
            ))}
          </article>

          <article className="public-profile-card">
            <h2>Idiomas y disponibilidad</h2>
            <div className="public-profile-chips">
              {idiomasRelevantes.map((item, idx) => (
                <span className="public-profile-chip" key={`${item.idioma || 'idioma'}-${idx}`}>
                  {renderValue(item.idioma)} ({renderValue(item.nivel)})
                </span>
              ))}
              {!idiomasRelevantes.length ? <span className="public-profile-chip">Idiomas no registrados</span> : null}
            </div>
            <div className="public-profile-availability">
              <p>Disponible para viajar: {boolLabel(perfil?.logistica?.disp_viajar)}</p>
              <p>Disponible para turnos: {boolLabel(perfil?.logistica?.disp_turnos)}</p>
              <p>Disponible fines de semana: {boolLabel(perfil?.logistica?.disp_fines_semana)}</p>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  )
}
