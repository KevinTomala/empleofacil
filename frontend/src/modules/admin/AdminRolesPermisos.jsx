import './admin.css'
import { BadgeCheck, Lock, Shield, ShieldCheck, UserCog, Users } from 'lucide-react'
import Header from '../../components/Header'

export default function AdminRolesPermisos() {
  const roles = [
    { name: 'Root', users: 2, scope: 'Control total', updated: 'Hace 2 horas' },
    { name: 'Compliance', users: 6, scope: 'Reportes y auditoria', updated: 'Hace 1 dia' },
    { name: 'Soporte', users: 14, scope: 'Gestion de cuentas', updated: 'Hace 3 dias' },
    { name: 'Operaciones', users: 9, scope: 'Empresas y candidatos', updated: 'Hace 5 dias' },
  ]

  const permisos = [
    { label: 'Vacantes', description: 'Publicar, pausar y borrar vacantes.' },
    { label: 'Candidatos', description: 'Acceso a historiales y validacion.' },
    { label: 'Empresas', description: 'Verificacion y bloqueo de cuentas.' },
    { label: 'Auditoria', description: 'Acceso a logs y exportaciones.' },
  ]

  const solicitudes = [
    { title: 'Solicitud de cambio en rol Soporte', detail: 'Empresa #EF-320' },
    { title: 'Nuevo rol para equipo regional', detail: 'Operaciones Bogota' },
  ]

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <BadgeCheck className="w-4 h-4" /> Control de accesos
            </span>
            <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
              Roles y permisos
            </h1>
            <p className="text-sm text-foreground/70 max-w-2xl">
              Define niveles de acceso por modulo, equipo y criticidad. Cada cambio
              se registra en auditoria para trazabilidad completa.
            </p>
          </div>
          <div className="admin-card px-4 py-3 flex items-center gap-3 text-sm">
            <Shield className="w-5 h-5 text-primary" />
            Politicas activas · 2 revisiones pendientes
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Roles actuales</h2>
              <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold">
                Crear rol
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {roles.map((role) => (
                <div key={role.name} className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold">{role.name}</p>
                    <span className="text-xs text-foreground/60">{role.users} usuarios</span>
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">{role.scope}</p>
                  <p className="text-xs text-foreground/50 mt-2">
                    Actualizado {role.updated}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserCog className="w-4 h-4 text-primary" />
                Permisos clave
              </div>
              {permisos.map((permiso) => (
                <div
                  key={permiso.label}
                  className="border border-border rounded-xl p-3 text-sm"
                >
                  <p className="font-semibold">{permiso.label}</p>
                  <p className="text-xs text-foreground/60 mt-1">{permiso.description}</p>
                </div>
              ))}
            </div>

            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="w-4 h-4 text-primary" />
                Solicitudes recientes
              </div>
              {solicitudes.map((item) => (
                <div key={item.title} className="border border-border rounded-xl p-3 text-sm">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-foreground/60 mt-1">{item.detail}</p>
                </div>
              ))}
              <button className="w-full text-sm font-semibold text-primary">
                Revisar todas
              </button>
            </div>
          </div>
        </section>

        <section className="admin-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Buenas practicas
            </div>
            <span className="text-xs text-foreground/60">Actualizado hoy</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
            {[
              'Revisa permisos criticos cada 30 dias.',
              'Aplica 2FA en accesos root y compliance.',
              'Define backups semanales de roles.',
            ].map((tip) => (
              <div key={tip} className="border border-border rounded-xl p-3">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-foreground/70 mt-2">{tip}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
