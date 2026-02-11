import './admin.css'
import {
  BadgeCheck,
  Building2,
  Filter,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'

export default function AdminCuentas() {
  const empresas = [
    {
      name: 'Logística Andina S.A.',
      status: 'Verificada',
      plan: 'Enterprise',
      owner: 'Ana Torres',
      created: 'Hace 4 meses',
    },
    {
      name: 'Grupo Norte',
      status: 'Pendiente',
      plan: 'Pro',
      owner: 'Luis Mejía',
      created: 'Hace 3 días',
    },
    {
      name: 'Servicios Omega',
      status: 'En revisión',
      plan: 'Basic',
      owner: 'María Paz',
      created: 'Hace 2 semanas',
    },
  ]

  const candidatos = [
    {
      name: 'Daniela Rojas',
      status: 'Activo',
      location: 'Quito',
      verified: true,
      joined: 'Hace 3 meses',
    },
    {
      name: 'Carlos Perez',
      status: 'Bloqueado',
      location: 'Bogotá',
      verified: false,
      joined: 'Hace 2 semanas',
    },
    {
      name: 'Mariana Gomez',
      status: 'Activo',
      location: 'Medellín',
      verified: true,
      joined: 'Hace 1 año',
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
                <BadgeCheck className="w-4 h-4" /> Gestión de cuentas
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Empresas y candidatos
              </h1>
              <p className="text-sm text-foreground/70 max-w-xl">
                Controla el estado de empresas y candidatos, con validaciones y bloqueos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> Crear cuenta
              </button>
              <button className="px-4 py-2 border border-border rounded-lg font-medium flex items-center gap-2">
                <ShieldOff className="w-4 h-4" /> Suspender seleccionados
              </button>
            </div>
          </div>
        </section>

        <section className="admin-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-primary" />
              Filtros rápidos
            </div>
            <button className="text-sm text-primary font-semibold">Limpiar filtros</button>
          </div>
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-3 mt-3">
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60">
              <Search className="w-4 h-4" />
              <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Buscar por nombre" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['Estado', 'Plan', 'Ubicación', 'Verificación'].map((label) => (
                <button
                  key={label}
                  className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <h2 className="font-heading text-lg font-semibold">Empresas</h2>
            <div className="space-y-3">
              {empresas.map((empresa) => (
                <article key={empresa.name} className="border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{empresa.name}</p>
                      <p className="text-xs text-foreground/60 mt-1">
                        Responsable: {empresa.owner} · Alta: {empresa.created}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        empresa.status === 'Verificada'
                          ? 'bg-emerald-100 text-emerald-700'
                          : empresa.status === 'Pendiente'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {empresa.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 mt-3">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> {empresa.plan}
                    </span>
                    <button className="px-2.5 py-1 border border-border rounded-lg">Ver detalle</button>
                    <button className="px-2.5 py-1 border border-border rounded-lg">Cambiar estado</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="admin-card p-5 space-y-4">
            <h2 className="font-heading text-lg font-semibold">Candidatos</h2>
            <div className="space-y-3">
              {candidatos.map((candidato) => (
                <article key={candidato.name} className="border border-border rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{candidato.name}</p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {candidato.location} · {candidato.joined}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        candidato.status === 'Activo'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {candidato.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 mt-3">
                    <span className="inline-flex items-center gap-1">
                      {candidato.verified ? (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <UserX className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      {candidato.verified ? 'Verificado' : 'Sin validar'}
                    </span>
                    <button className="px-2.5 py-1 border border-border rounded-lg">Ver perfil</button>
                    <button className="px-2.5 py-1 border border-border rounded-lg">Acciones</button>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
