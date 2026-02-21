function renderValue(value) {
  if (value === null || value === undefined || value === '') return 'N/D'
  if (value === 1 || value === true) return 'Si'
  if (value === 0 || value === false) return 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatDateShort(value) {
  if (!value) return 'N/D'
  return String(value).slice(0, 10)
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

function formatDurationLabel(item) {
  const start = item?.fecha_inicio
  const end = item?.actualmente_trabaja ? new Date().toISOString().slice(0, 10) : item?.fecha_fin
  const months = diffMonths(start, end)
  if (months === null) return 'N/D'
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  if (years > 0 && restMonths > 0) return `${years}a ${restMonths}m`
  if (years > 0) return `${years}a`
  return `${restMonths}m`
}

function resolveEmpresaNombre(item) {
  if (item?.empresa_local_nombre) return item.empresa_local_nombre
  if (item?.empresa_nombre) return item.empresa_nombre
  if (item?.empresa_origen === 'ademy' && item?.empresa_origen_id) return `ADEMY #${item.empresa_origen_id}`
  if (item?.empresa_id) return `Empresa #${item.empresa_id}`
  return 'Empresa no especificada'
}

function Section({ title, data }) {
  if (Array.isArray(data)) {
    return (
      <section className="border border-border rounded-xl p-3 bg-white">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        {!data.length && <p className="text-xs text-foreground/60">Sin registros</p>}
        {data.length > 0 && (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id || JSON.stringify(item)} className="border border-border/70 rounded-lg px-2 py-1.5">
                {Object.entries(item).map(([key, value]) => (
                  <p key={key} className="text-xs text-foreground/80">
                    <span className="text-foreground/50">{key}: </span>
                    {renderValue(value)}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  const entries = Object.entries(data || {})
  return (
    <section className="border border-border rounded-xl p-3 bg-white">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="border border-border/70 rounded-lg px-2 py-1.5">
            <p className="text-foreground/50">{key}</p>
            <p className="text-foreground/80">{renderValue(value)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ExperienceSection({ items }) {
  const data = Array.isArray(items) ? items : []
  return (
    <section className="border border-border rounded-xl p-3 bg-white">
      <h3 className="text-sm font-semibold mb-2">Experiencia</h3>
      {!data.length && <p className="text-xs text-foreground/60">Sin registros</p>}
      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((item) => (
            <article key={item.id || JSON.stringify(item)} className="border border-border/70 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-foreground/90">{resolveEmpresaNombre(item)}</p>
              <p className="text-xs text-foreground/70">Cargo: {item?.cargo || 'N/D'}</p>
              <p className="text-xs text-foreground/70">
                Periodo: {formatDateShort(item?.fecha_inicio)} - {item?.actualmente_trabaja ? 'Actual' : formatDateShort(item?.fecha_fin)}
              </p>
              <p className="text-xs text-foreground/70">Tiempo trabajado: {formatDurationLabel(item)}</p>
              <p className="text-xs text-foreground/70">Actualmente trabaja ahi: {item?.actualmente_trabaja ? 'Si' : 'No'}</p>
              <p className="text-xs text-foreground/70">Descripcion del puesto: {item?.descripcion || 'N/D'}</p>
              <p className="text-xs text-foreground/70">Certificado laboral: {item?.certificado_laboral ? 'Adjuntado' : 'Pendiente'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default function CandidatoPerfilDrawer({
  open,
  candidatoName,
  loading,
  error,
  perfil,
  onClose,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background border-l border-border shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Perfil de candidato</h2>
            <p className="text-xs text-foreground/60">{candidatoName || 'Candidato'}</p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 border border-border rounded-lg text-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loading && <p className="text-sm text-foreground/70">Cargando perfil...</p>}
          {!loading && error && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {!loading && !error && perfil && (
            <>
              <Section title="Datos basicos" data={perfil.datos_basicos} />
              <Section title="Contacto" data={perfil.contacto} />
              <Section title="Domicilio" data={perfil.domicilio} />
              <Section title="Salud" data={perfil.salud} />
              <Section title="Logistica" data={perfil.logistica} />
              <Section title="Educacion" data={perfil.educacion} />
              <Section title="Educacion general" data={perfil.educacion_general_items} />
              <Section title="Formacion" data={perfil.formacion_detalle} />
              <ExperienceSection items={perfil.experiencia} />
              <Section title="Documentos" data={perfil.documentos} />
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
