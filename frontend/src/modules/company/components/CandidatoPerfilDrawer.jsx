function renderValue(value) {
  if (value === null || value === undefined || value === '') return 'N/D'
  if (value === 1 || value === true) return 'Si'
  if (value === 0 || value === false) return 'No'
  return String(value)
}

function Section({ title, data }) {
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
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
