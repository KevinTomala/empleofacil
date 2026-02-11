import './admin.css'
import { BadgeCheck, KeyRound, LockKeyhole, Shield, ShieldAlert, Users } from 'lucide-react'
import Header from '../../components/Header'

export default function AdminRolesPermisos() {
  const roles = [
    {
      name: 'Root',
      users: 3,
      scope: 'Todos los módulos',
      status: 'Crítico',
      updated: 'Hace 2 días',
    },
    {
      name: 'Operaciones',
      users: 12,
      scope: 'Empresas, candidatos',
      status: 'Activo',
      updated: 'Hace 5 días',
    },
    {
      name: 'Soporte',
      users: 8,
      scope: 'Cuentas, tickets',
      status: 'Activo',
      updated: 'Hace 1 semana',
    },
    {
      name: 'Compliance',
      users: 4,
      scope: 'Auditoría, reportes',
      status: 'Revisión',
      updated: 'Hace 3 semanas',
    },
  ]

  const permisos = [
    { label: 'Crear usuarios', level: 'Root, Soporte' },
    { label: 'Editar permisos', level: 'Root' },
    { label: 'Suspender cuentas', level: 'Root, Operaciones' },
    { label: 'Descargar logs', level: 'Root, Compliance' },
  ]

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <BadgeCheck className="w-4 h-4" /> Control de acceso
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Roles y permisos
              </h1>
              <p className="text-sm text-foreground/70 max-w-xl">
                Administra niveles de acceso, permisos sensibles y auditoría de cambios.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Crear rol
              </button>
              <button className="px-4 py-2 border border-border rounded-lg font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Revisar cambios
              </button>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Roles activos</h2>
              <span className="text-xs text-foreground/60">Total: {roles.length}</span>
            </div>
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.name} className="border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{role.name}</p>
                      <p className="text-xs text-foreground/60 mt-1">{role.scope}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        role.status === 'Crítico'
                          ? 'bg-rose-100 text-rose-700'
                          : role.status === 'Revisión'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {role.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60 mt-3">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {role.users} usuarios
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LockKeyhole className="w-3.5 h-3.5" /> Última edición: {role.updated}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="w-4 h-4 text-primary" />
                Permisos críticos
              </div>
              {permisos.map((permiso) => (
                <div key={permiso.label} className="border border-border rounded-xl p-3 text-sm">
                  <p className="font-semibold">{permiso.label}</p>
                  <p className="text-xs text-foreground/60 mt-1">{permiso.level}</p>
                </div>
              ))}
            </div>

            <div className="admin-card p-5 space-y-3">
              <h3 className="font-heading text-sm font-semibold">Cambios recientes</h3>
              <div className="text-sm text-foreground/70 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground/80">Rol Operaciones</p>
                    <p className="text-xs text-foreground/50">Se añadió acceso a auditoría.</p>
                  </div>
                  <span className="text-xs text-foreground/50">Hace 6 h</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground/80">Rol Soporte</p>
                    <p className="text-xs text-foreground/50">Se retiró permiso de bloqueo.</p>
                  </div>
                  <span className="text-xs text-foreground/50">Ayer</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
