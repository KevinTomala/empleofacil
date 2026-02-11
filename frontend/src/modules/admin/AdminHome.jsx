import './admin.css'
import {
  Activity,
  BadgeCheck,
  Building2,
  Shield,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'

export default function AdminHome() {
  const resumen = [
    { label: 'Usuarios activos', value: '1.248', hint: '+4% mes', icon: Users },
    { label: 'Empresas verificadas', value: '286', hint: '12 nuevas', icon: Building2 },
    { label: 'Candidatos en revisión', value: '94', hint: 'requieren acción', icon: UserCheck },
    { label: 'Alertas de seguridad', value: '3', hint: 'últimas 24 h', icon: ShieldCheck },
  ]

  const acciones = [
    { label: 'Crear rol', description: 'Define accesos granulares por módulo.' },
    { label: 'Suspender cuenta', description: 'Bloqueo inmediato y trazable.' },
    { label: 'Exportar logs', description: 'CSV con filtros por fecha.' },
  ]

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <BadgeCheck className="w-4 h-4" /> Consola root
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Administración del sistema
              </h1>
              <p className="text-sm text-foreground/70 max-w-2xl">
                Controla permisos, cuentas y auditoría en un solo lugar. Cada acción queda
                registrada con trazabilidad completa.
              </p>
            </div>
            <div className="admin-card px-4 py-3 flex items-center gap-3 text-sm">
              <Shield className="w-5 h-5 text-primary" />
              Modo seguro activo · 2FA requerido para cambios críticos
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resumen.map((item) => (
            <div key={item.label} className="admin-card p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs text-foreground/60">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
                <p className="text-xs text-foreground/50">{item.hint}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Panel de roles y permisos</h2>
              <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold">
                Crear rol
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Root', desc: 'Control total y auditoría avanzada.' },
                { label: 'Soporte', desc: 'Gestión de cuentas con límites.' },
                { label: 'Compliance', desc: 'Acceso a reportes y logs.' },
                { label: 'Operaciones', desc: 'Gestión de empresas y candidatos.' },
              ].map((role) => (
                <div key={role.label} className="border border-border rounded-xl p-3">
                  <p className="font-semibold text-sm">{role.label}</p>
                  <p className="text-xs text-foreground/60 mt-1">{role.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserCog className="w-4 h-4 text-primary" />
                Acciones rápidas
              </div>
              {acciones.map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left border border-border rounded-xl p-3 hover:border-primary/40"
                >
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-foreground/60 mt-1">{item.description}</p>
                </button>
              ))}
            </div>

            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-primary" />
                Última actividad crítica
              </div>
              <div className="border border-border rounded-xl p-3 text-sm">
                <p className="font-semibold">Cambio de permisos en Empresa #EF-233</p>
                <p className="text-xs text-foreground/60 mt-1">Hace 12 minutos · Root admin</p>
              </div>
              <div className="border border-border rounded-xl p-3 text-sm">
                <p className="font-semibold">Bloqueo de candidato por verificación</p>
                <p className="text-xs text-foreground/60 mt-1">Hace 38 minutos · Operaciones</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
