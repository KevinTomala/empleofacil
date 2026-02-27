import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { getPerfilById, getPerfilErrorMessage } from '../../../services/perfilCandidato.api'
import VerifiedBadge from '../../../components/VerifiedBadge'

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
  return `${(totalMonths / 12).toFixed(1)} años estimados`
}

function resolveEmpresaNombre(item) {
  if (item?.empresa_local_nombre) return item.empresa_local_nombre
  if (item?.empresa_nombre) return item.empresa_nombre
  if (item?.empresa_origen === 'ademy' && item?.empresa_origen_id) return `ADEMY #${item.empresa_origen_id}`
  if (item?.empresa_id) return `Empresa #${item.empresa_id}`
  return 'Empresa no especificada'
}

function buildResumenProfesional(perfil) {
  const titularPublico = renderValue(perfil?.social_config?.titular_publico, '')
  if (titularPublico) return titularPublico
  const firstExp = Array.isArray(perfil?.experiencia) ? perfil.experiencia[0] : null
  const cargo = renderValue(firstExp?.cargo, '')
  const empresa = resolveEmpresaNombre(firstExp)
  const descripcion = renderValue(firstExp?.descripcion, '')
  const titulo = renderValue(perfil?.educacion?.titulo_obtenido, '')
  if (descripcion) return descripcion
  if (cargo) return `${cargo} con experiencia en ${empresa}.`
  if (titulo) return `Perfil con formacion en ${titulo}.`
  return 'Perfil profesional en proceso de actualizacion. Revisa experiencia y formacion destacada.'
}

export default function CandidatoPerfilProfesionalModal({
  open,
  candidate,
  onClose,
  onSendMessage
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    let alive = true
    if (!open || !candidate?.id) return undefined

    async function load() {
      try {
        setLoading(true)
        setError('')
        setPerfil(null)
        const data = await getPerfilById(candidate.id)
        if (!alive) return
        setPerfil(data)
      } catch (err) {
        if (!alive) return
        setError(getPerfilErrorMessage(err, 'No se pudo cargar el perfil del candidato.'))
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [open, candidate?.id])

  const experienciaRelevante = useMemo(
    () => (Array.isArray(perfil?.experiencia) ? perfil.experiencia.slice(0, 3) : []),
    [perfil]
  )
  const formacionRelevante = useMemo(
    () => (Array.isArray(perfil?.formacion_detalle) ? perfil.formacion_detalle.slice(0, 3) : []),
    [perfil]
  )
  const idiomasRelevantes = useMemo(
    () => (Array.isArray(perfil?.idiomas) ? perfil.idiomas.slice(0, 4) : []),
    [perfil]
  )
  const resumenProfesional = useMemo(() => buildResumenProfesional(perfil), [perfil])

  if (!open) return null

  return (
    <div className="efmsg-modal">
      <div className="efmsg-modal-backdrop" onClick={onClose} />
      <section className="company-profile-modal">
        <div className="company-profile-head">
          <div>
            <h3>Perfil profesional</h3>
            <p className="inline-flex items-center gap-1.5">
              <span>{candidate?.name || 'Candidato'}</span>
              <VerifiedBadge entity={candidate} />
            </p>
          </div>
          <button type="button" className="efmsg-icon-btn" onClick={onClose} aria-label="Cerrar modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? <p className="company-profile-state">Cargando perfil profesional...</p> : null}
        {!loading && error ? <p className="company-profile-error">{error}</p> : null}

        {!loading && !error && perfil ? (
          <div className="company-profile-body">
            <article className="company-profile-resume">
              <header className="company-resume-header">
                <p className="company-resume-kicker">Curriculum resumido</p>
                <h4 className="inline-flex items-center gap-1.5">
                  <span>{candidate?.name || 'Candidato'}</span>
                  <VerifiedBadge entity={candidate} />
                </h4>
                <p className="company-resume-summary">{resumenProfesional}</p>
              </header>

              <div className="company-resume-layout">
                <aside className="company-resume-sidebar">
                  <section className="company-resume-block">
                    <h5>Datos clave</h5>
                    <div className="company-resume-fact-list">
                      <p><span>Documento</span><strong>{renderValue(perfil?.datos_basicos?.documento_identidad)}</strong></p>
                      <p><span>Nacionalidad</span><strong>{renderValue(perfil?.datos_basicos?.nacionalidad)}</strong></p>
                      <p><span>Ubicacion</span><strong>{renderValue(perfil?.domicilio?.provincia, '') || renderValue(perfil?.domicilio?.pais)}</strong></p>
                      <p><span>Experiencia</span><strong>{buildExperienceYears(perfil?.experiencia)}</strong></p>
                    </div>
                  </section>

                  <section className="company-resume-block">
                    <h5>Disponibilidad</h5>
                    <div className="company-resume-fact-list">
                      <p><span>Movilizacion</span><strong>{boolLabel(perfil?.logistica?.movilizacion)}</strong></p>
                      <p><span>Viajar</span><strong>{boolLabel(perfil?.logistica?.disp_viajar)}</strong></p>
                      <p><span>Turnos</span><strong>{boolLabel(perfil?.logistica?.disp_turnos)}</strong></p>
                      <p><span>Fines semana</span><strong>{boolLabel(perfil?.logistica?.disp_fines_semana)}</strong></p>
                    </div>
                  </section>

                  <section className="company-resume-block">
                    <h5>Idiomas</h5>
                    <div className="company-profile-chips">
                      {idiomasRelevantes.map((item) => (
                        <span key={item.id || `${item.idioma}-${item.nivel}`} className="company-profile-chip">
                          {renderValue(item.idioma)} ({renderValue(item.nivel)})
                        </span>
                      ))}
                      {!idiomasRelevantes.length ? <span className="company-profile-chip">No registrados</span> : null}
                    </div>
                  </section>
                </aside>

                <section className="company-resume-main">
                  <section className="company-profile-section">
                    <h4>Experiencia relevante</h4>
                    {!experienciaRelevante.length ? <p>Sin experiencia registrada.</p> : null}
                    {experienciaRelevante.map((item) => (
                      <article key={item.id || `${item.cargo}-${item.fecha_inicio}`} className="company-profile-item">
                        <p className="company-profile-item-title">{renderValue(item.cargo)}</p>
                        <p>{resolveEmpresaNombre(item)}</p>
                        <p>
                          {formatDateShort(item.fecha_inicio)} - {item.actualmente_trabaja ? 'Actual' : formatDateShort(item.fecha_fin)}
                        </p>
                      </article>
                    ))}
                  </section>

                  <section className="company-profile-section">
                    <h4>Formacion y certificaciones</h4>
                    {!formacionRelevante.length ? <p>Sin formacion registrada.</p> : null}
                    {formacionRelevante.map((item) => (
                      <article key={item.id || `${item.categoria_formacion}-${item.subtipo_formacion}`} className="company-profile-item">
                        <p className="company-profile-item-title">{renderValue(item.nombre_programa || item.titulo_obtenido)}</p>
                        <p>{renderValue(item.institucion || item.centro_cliente_nombre)}</p>
                        <p>{renderValue(item.subtipo_formacion)}</p>
                      </article>
                    ))}
                  </section>
                </section>
              </div>
            </article>
          </div>
        ) : null}

        <div className="company-profile-actions">
          <button type="button" className="company-candidate-btn company-candidate-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          {typeof onSendMessage === 'function' ? (
            <button
              type="button"
              className="company-candidate-btn company-candidate-btn-primary"
              onClick={() => onSendMessage(candidate)}
              disabled={!candidate}
            >
              Enviar mensaje
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}
