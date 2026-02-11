import './admin.css'
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Download,
  Filter,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react'
import Header from '../../components/Header'

export default function AdminAuditoria() {
  const logs = [
    {
      id: 'LOG-2331',
      action: 'Cambio de permisos en rol Operaciones',
      actor: 'Root admin',
      date: 'Hoy · 09:21',
      level: 'Crítico',
    },
    {
      id: 'LOG-2329',
      action: 'Bloqueo de empresa Servicios Omega',
      actor: 'Compliance',
      date: 'Hoy · 08:05',
      level: 'Alto',
    },
    {
      id: 'LOG-2320',
      action: 'Exportación de logs por soporte',
      actor: 'Soporte',
      date: 'Ayer · 16:40',
      level: 'Medio',
    },
  ]

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <BadgeCheck className="w-4 h-4" /> Auditoría
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Logs y trazabilidad
              </h1>
              <p className="text-sm text-foreground/70 max-w-xl">
                Consulta eventos críticos, cambios de permisos y acciones de seguridad.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> Exportar
              </button>
              <button className="px-4 py-2 border border-border rounded-lg font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Rango de fechas
              </button>
            </div>
          </div>
        </section>

        <section className="admin-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros avanzados
            </div>
            <button className="text-sm text-primary font-semibold">Limpiar filtros</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['Nivel', 'Actor', 'Tipo de acción', 'Módulo', 'IP'].map((label) => (
              <button key={label} className="px-3 py-2 border border-border rounded-lg text-foreground/70">
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Eventos recientes</h2>
              <span className="text-xs text-foreground/60">Últimas 24 horas</span>
            </div>
            <div className="space-y-3">
              {logs.map((log) => (
                <article key={log.id} className="border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{log.action}</p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {log.id} · {log.date}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        log.level === 'Crítico'
                          ? 'bg-rose-100 text-rose-700'
                          : log.level === 'Alto'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/60 mt-3">
                    <UserCircle2 className="w-4 h-4" /> {log.actor}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Alertas de seguridad
              </div>
              <div className="border border-border rounded-xl p-3 text-sm">
                <p className="font-semibold">3 intentos fallidos</p>
                <p className="text-xs text-foreground/60 mt-1">IP 186.44.23.18 · Hoy 08:00</p>
              </div>
              <div className="border border-border rounded-xl p-3 text-sm">
                <p className="font-semibold">Cambio de 2FA</p>
                <p className="text-xs text-foreground/60 mt-1">Usuario soporte-03 · Ayer 19:10</p>
              </div>
            </div>

            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Cumplimiento
              </div>
              <div className="text-sm text-foreground/70 space-y-2">
                <p>2 eventos requieren verificación manual.</p>
                <p>Exportaciones sensibles: 4 en la última semana.</p>
                <button className="px-3 py-2 border border-border rounded-lg text-xs">
                  Ver reporte completo
                </button>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
