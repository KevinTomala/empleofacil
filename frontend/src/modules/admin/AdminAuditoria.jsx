import './admin.css'
import { Activity, Download, FileText, Filter, ShieldAlert } from 'lucide-react'
import Header from '../../components/Header'

export default function AdminAuditoria() {
  const registros = [
    {
      action: 'Cambio de permisos',
      actor: 'Root admin',
      target: 'Empresa #EF-233',
      time: 'Hace 12 minutos',
      level: 'Alta',
    },
    {
      action: 'Suspension de cuenta',
      actor: 'Operaciones',
      target: 'Candidato #CA-889',
      time: 'Hace 38 minutos',
      level: 'Media',
    },
    {
      action: 'Exportacion de logs',
      actor: 'Compliance',
      target: 'Auditoria semanal',
      time: 'Hoy, 07:30',
      level: 'Baja',
    },
    {
      action: 'Cambio de rol',
      actor: 'Root admin',
      target: 'Soporte regional',
      time: 'Ayer, 18:10',
      level: 'Media',
    },
  ]

  const filtros = ['Criticidad', 'Modulo', 'Usuario', 'Rango de fechas']

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Activity className="w-4 h-4" /> Registro trazable
            </span>
            <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
              Auditoria y logs
            </h1>
            <p className="text-sm text-foreground/70 max-w-2xl">
              Consulta la actividad critica del sistema, exporta reportes y revisa
              incidencias con filtros por modulo y criticidad.
            </p>
          </div>
          <div className="admin-card px-4 py-3 flex items-center gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-primary" />
            3 alertas activas · 1 requiere accion
          </div>
        </section>

        <section className="admin-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros avanzados
            </div>
            <button className="text-sm text-primary font-semibold">
              Limpiar filtros
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            {filtros.map((label) => (
              <button
                key={label}
                className="flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm text-foreground/70 hover:border-primary/40"
              >
                <span>{label}</span>
                <span className="text-xs text-foreground/40">Seleccionar</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Eventos recientes</h2>
              <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold flex items-center gap-2">
                <Download className="w-4 h-4" /> Exportar CSV
              </button>
            </div>
            <div className="space-y-3 admin-list">
              {registros.map((item) => (
                <div
                  key={`${item.action}-${item.time}`}
                  className="border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{item.action}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {item.actor} · {item.target}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.level === 'Alta'
                          ? 'bg-rose-100 text-rose-700'
                          : item.level === 'Media'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.level}
                    </span>
                    <p className="text-xs text-foreground/50 mt-2">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Resumen de cumplimiento
              </div>
              {[
                { label: 'Cambios criticos', value: '6 esta semana' },
                { label: 'Exportaciones', value: '4 reportes' },
                { label: 'Alertas resueltas', value: '9 en 24 h' },
              ].map((item) => (
                <div key={item.label} className="border border-border rounded-xl p-3 text-sm">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-foreground/60 mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Alertas activas
              </div>
              {[
                'Validar 2FA en cuentas root.',
                'Auditar accesos fuera de horario.',
                'Revisar exportacion masiva del lunes.',
              ].map((item) => (
                <div key={item} className="border border-border rounded-xl p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
