import './admin.css'
import { Building2, Filter, Search, ShieldCheck, UserX, Users } from 'lucide-react'
import Header from '../../components/Header'

export default function AdminCuentas() {
  const cuentas = [
    {
      name: 'Ana Torres',
      role: 'Root',
      company: 'EmpleoFacil',
      status: 'Activa',
      lastAccess: 'Hoy, 09:20',
    },
    {
      name: 'Carlos Medina',
      role: 'Operaciones',
      company: 'Grupo Andino',
      status: 'Revision',
      lastAccess: 'Ayer, 18:02',
    },
    {
      name: 'Luisa Guerra',
      role: 'Soporte',
      company: 'Logistica Nova',
      status: 'Activa',
      lastAccess: 'Ayer, 12:40',
    },
    {
      name: 'Pedro Mena',
      role: 'Compliance',
      company: 'Finanzas 360',
      status: 'Bloqueada',
      lastAccess: 'Hace 3 dias',
    },
  ]

  const filtros = [
    'Rol',
    'Estado',
    'Ultimo acceso',
    'Empresa',
  ]

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Monitoreo de cuentas
            </span>
            <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
              Gestion de cuentas
            </h1>
            <p className="text-sm text-foreground/70 max-w-2xl">
              Supervisa accesos, estados y acciones de usuarios internos y cuentas
              de empresas. Aplica bloqueos o revisiones desde un solo lugar.
            </p>
          </div>
          <div className="admin-card px-4 py-3 flex items-center gap-3 text-sm">
            <Users className="w-5 h-5 text-primary" />
            1.248 usuarios activos · 34 en revision
          </div>
        </section>

        <section className="admin-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros rapidos
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
              <h2 className="font-heading text-lg font-semibold">Usuarios recientes</h2>
              <div className="flex items-center gap-2 text-sm text-foreground/60">
                <Search className="w-4 h-4" /> Buscar cuenta
              </div>
            </div>
            <div className="space-y-3 admin-list">
              {cuentas.map((cuenta) => (
                <div
                  key={cuenta.name}
                  className="border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{cuenta.name}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {cuenta.role} · {cuenta.company}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        cuenta.status === 'Activa'
                          ? 'bg-emerald-100 text-emerald-700'
                          : cuenta.status === 'Revision'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {cuenta.status}
                    </span>
                    <p className="text-xs text-foreground/50 mt-2">
                      Ultimo acceso: {cuenta.lastAccess}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4 text-primary" />
                Empresas con alertas
              </div>
              {[
                { name: 'Grupo Andino', detail: '2 cuentas en revision' },
                { name: 'Logistica Nova', detail: 'Cambio de permisos pendiente' },
                { name: 'Finanzas 360', detail: 'Bloqueo en evaluacion' },
              ].map((item) => (
                <div key={item.name} className="border border-border rounded-xl p-3 text-sm">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-foreground/60 mt-1">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="admin-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserX className="w-4 h-4 text-primary" />
                Acciones recomendadas
              </div>
              {[
                'Revisar cuentas inactivas por 60 dias.',
                'Validar cambios de rol en soporte.',
                'Confirmar bloqueo de usuarios repetidos.',
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
