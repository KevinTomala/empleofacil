function renderValue(value) {
  if (value === null || value === undefined || value === '') return 'N/D'
  if (value === 1 || value === true) return 'Si'
  if (value === 0 || value === false) return 'No'
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

function FieldsGrid({ title, fields }) {
  return (
    <section className="border border-border rounded-xl p-3 bg-white">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        {fields.map((field) => (
          <div key={field.label} className="border border-border/70 rounded-lg px-2 py-1.5">
            <p className="text-foreground/50">{field.label}</p>
            <p className="text-foreground/80">{renderValue(field.value)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function EducacionGeneralSection({ items }) {
  const data = Array.isArray(items) ? items : []
  return (
    <section className="border border-border rounded-xl p-3 bg-white">
      <h3 className="text-sm font-semibold mb-2">Educacion general</h3>
      {!data.length && <p className="text-xs text-foreground/60">Sin registros</p>}
      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((item) => (
            <article key={item.id || `${item.nivel_estudio}-${item.institucion || 's'}`} className="border border-border/70 rounded-lg px-3 py-2">
              <p className="text-xs text-foreground/70">Nivel: {renderValue(item.nivel_estudio)}</p>
              <p className="text-xs text-foreground/70">Institucion: {renderValue(item.institucion)}</p>
              <p className="text-xs text-foreground/70">Titulo: {renderValue(item.titulo_obtenido)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function FormacionSection({ items }) {
  const data = Array.isArray(items) ? items : []
  return (
    <section className="border border-border rounded-xl p-3 bg-white">
      <h3 className="text-sm font-semibold mb-2">Formacion</h3>
      {!data.length && <p className="text-xs text-foreground/60">Sin registros</p>}
      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((item) => (
            <article key={item.id || `${item.categoria_formacion}-${item.subtipo_formacion}`} className="border border-border/70 rounded-lg px-3 py-2">
              <p className="text-xs text-foreground/70">
                Categoria/Subtipo: {renderValue(item.categoria_formacion)} / {renderValue(item.subtipo_formacion)}
              </p>
              <p className="text-xs text-foreground/70">Institucion: {renderValue(item.institucion || item.centro_cliente_nombre)}</p>
              <p className="text-xs text-foreground/70">Programa: {renderValue(item.nombre_programa)}</p>
              <p className="text-xs text-foreground/70">Titulo: {renderValue(item.titulo_obtenido)}</p>
              <p className="text-xs text-foreground/70">
                Fechas: Aprobacion {formatDateShort(item.fecha_aprobacion)} / Emision {formatDateShort(item.fecha_emision)} / Vencimiento {formatDateShort(item.fecha_vencimiento)}
              </p>
            </article>
          ))}
        </div>
      )}
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
            <article key={item.id || `${item.cargo}-${item.fecha_inicio}`} className="border border-border/70 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-foreground/90">{resolveEmpresaNombre(item)}</p>
              <p className="text-xs text-foreground/70">Cargo: {renderValue(item?.cargo)}</p>
              <p className="text-xs text-foreground/70">
                Periodo: {formatDateShort(item?.fecha_inicio)} - {item?.actualmente_trabaja ? 'Actual' : formatDateShort(item?.fecha_fin)}
              </p>
              <p className="text-xs text-foreground/70">Tiempo trabajado: {formatDurationLabel(item)}</p>
              <p className="text-xs text-foreground/70">Disponible para referencias: {item?.actualmente_trabaja ? 'Si' : 'No'}</p>
              <p className="text-xs text-foreground/70">Resumen: {renderValue(item?.descripcion)}</p>
              <p className="text-xs text-foreground/70">Certificado laboral: {item?.certificado_laboral ? 'Adjuntado' : 'Pendiente'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function DocumentosSection({ items }) {
  const data = Array.isArray(items) ? items : []
  return (
    <section className="border border-border rounded-xl p-3 bg-white">
      <h3 className="text-sm font-semibold mb-2">Documentos</h3>
      {!data.length && <p className="text-xs text-foreground/60">Sin registros</p>}
      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((item) => (
            <article key={item.id || `${item.tipo_documento}-${item.nombre_archivo}`} className="border border-border/70 rounded-lg px-3 py-2">
              <p className="text-xs text-foreground/70">Tipo: {renderValue(item.tipo_documento)}</p>
              <p className="text-xs text-foreground/70">Estado: {renderValue(item.estado)}</p>
              <p className="text-xs text-foreground/70">Emision: {formatDateShort(item.fecha_emision)}</p>
              <p className="text-xs text-foreground/70">Vencimiento: {formatDateShort(item.fecha_vencimiento)}</p>
              <p className="text-xs text-foreground/70">Descripcion: {renderValue(item.descripcion)}</p>
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
              <FieldsGrid
                title="Datos basicos"
                fields={[
                  { label: 'Nombres', value: perfil?.datos_basicos?.nombres },
                  { label: 'Apellidos', value: perfil?.datos_basicos?.apellidos },
                  { label: 'Documento', value: perfil?.datos_basicos?.documento_identidad },
                  { label: 'Nacionalidad', value: perfil?.datos_basicos?.nacionalidad },
                  { label: 'Fecha nacimiento', value: formatDateShort(perfil?.datos_basicos?.fecha_nacimiento) },
                  { label: 'Sexo', value: perfil?.datos_basicos?.sexo },
                  { label: 'Estado civil', value: perfil?.datos_basicos?.estado_civil },
                  { label: 'Activo', value: perfil?.datos_basicos?.activo }
                ]}
              />
              <FieldsGrid
                title="Contacto"
                fields={[
                  { label: 'Email', value: perfil?.contacto?.email },
                  { label: 'Telefono celular', value: perfil?.contacto?.telefono_celular },
                  { label: 'Telefono fijo', value: perfil?.contacto?.telefono_fijo },
                  { label: 'Contacto emergencia', value: perfil?.contacto?.contacto_emergencia_nombre },
                  { label: 'Telefono emergencia', value: perfil?.contacto?.contacto_emergencia_telefono }
                ]}
              />
              <FieldsGrid
                title="Domicilio"
                fields={[
                  { label: 'Pais', value: perfil?.domicilio?.pais },
                  { label: 'Provincia', value: perfil?.domicilio?.provincia },
                  { label: 'Canton', value: perfil?.domicilio?.canton },
                  { label: 'Parroquia', value: perfil?.domicilio?.parroquia },
                  { label: 'Direccion', value: perfil?.domicilio?.direccion },
                  { label: 'Codigo postal', value: perfil?.domicilio?.codigo_postal }
                ]}
              />
              <FieldsGrid
                title="Salud y Logistica"
                fields={[
                  { label: 'Tipo sangre', value: perfil?.salud?.tipo_sangre },
                  { label: 'Estatura', value: perfil?.salud?.estatura },
                  { label: 'Peso', value: perfil?.salud?.peso },
                  { label: 'Tatuaje', value: perfil?.salud?.tatuaje },
                  { label: 'Movilizacion', value: perfil?.logistica?.movilizacion },
                  { label: 'Tipo vehiculo', value: perfil?.logistica?.tipo_vehiculo },
                  { label: 'Licencia', value: perfil?.logistica?.licencia },
                  { label: 'Disponible viajar', value: perfil?.logistica?.disp_viajar },
                  { label: 'Disponible turnos', value: perfil?.logistica?.disp_turnos },
                  { label: 'Disponible fines semana', value: perfil?.logistica?.disp_fines_semana }
                ]}
              />
              <FieldsGrid
                title="Educacion"
                fields={[
                  { label: 'Nivel estudio', value: perfil?.educacion?.nivel_estudio },
                  { label: 'Institucion', value: perfil?.educacion?.institucion },
                  { label: 'Titulo', value: perfil?.educacion?.titulo_obtenido }
                ]}
              />
              <EducacionGeneralSection items={perfil?.educacion_general_items} />
              <FormacionSection items={perfil?.formacion_detalle} />
              <ExperienceSection items={perfil.experiencia} />
              <DocumentosSection items={perfil.documentos} />
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
