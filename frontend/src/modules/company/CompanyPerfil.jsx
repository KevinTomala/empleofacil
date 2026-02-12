import './company.css'
import {
  Building2,
  CheckCircle2,
  Globe,
  Link2,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react'
import Header from '../../components/Header'

export default function CompanyPerfil() {
  const pendientes = ['Beneficios', 'Cultura', 'Redes sociales']

  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-6">
        <section className="space-y-3">
          <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
            Perfil de empresa
          </h1>
          <p className="text-sm text-foreground/70">
            Completa tu perfil para recibir mas postulaciones calificadas.
          </p>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="company-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Building2 className="w-5 h-5 text-primary" />
                Perfil de empresa
              </div>
              <span className="text-xs font-semibold bg-secondary px-2.5 py-1 rounded-full">
                70% completado
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary w-[70%]" />
            </div>
            <p className="text-xs text-foreground/60">
              Las empresas con perfil completo reciben mas postulaciones.
            </p>
            <div className="bg-secondary rounded-xl p-3 text-xs text-foreground/70 flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground/80">Falta completar</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {pendientes.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 rounded-full bg-white border border-border"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="border border-border rounded-xl p-4">
                <p className="text-foreground/60">Nombre</p>
                <p className="font-semibold">ADEMY S.A.S.</p>
              </div>
              <div className="border border-border rounded-xl p-4">
                <p className="text-foreground/60">Industria</p>
                <p className="font-semibold">Servicios</p>
              </div>
              <div className="border border-border rounded-xl p-4">
                <p className="text-foreground/60">Ubicacion</p>
                <p className="font-semibold">Barranquilla</p>
              </div>
              <div className="border border-border rounded-xl p-4">
                <p className="text-foreground/60">Tamaño</p>
                <p className="font-semibold">120 personas</p>
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 text-sm space-y-2">
              <p className="text-foreground/60">Descripcion</p>
              <p className="font-semibold">
                Empresa especializada en soluciones logisticas y operativas.
              </p>
              <button className="text-xs text-primary font-semibold">Editar descripcion</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="border border-border rounded-xl p-4 space-y-2">
                <p className="text-foreground/60">Logo</p>
                <span className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                  Cargado
                </span>
                <button className="text-xs text-primary font-semibold">Cambiar logo</button>
              </div>
              <div className="border border-border rounded-xl p-4 space-y-2">
                <p className="text-foreground/60">Redes / web</p>
                <a
                  className="inline-flex items-center gap-2 text-primary text-sm font-semibold"
                  href="https://ademy.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe className="w-4 h-4" /> ademy.com
                </a>
                <button className="text-xs text-primary font-semibold">Editar enlace</button>
              </div>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium">
              Editar datos generales
            </button>
          </div>

          <div className="space-y-4">
            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Users className="w-5 h-5 text-primary" />
                Usuarios / reclutadores
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Recruiter principal</span>
                  <span className="font-semibold">2 activos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Roles asignados</span>
                  <span className="font-semibold">Admin / Reclutador</span>
                </div>
              </div>
              <button className="text-xs text-primary font-semibold">Gestionar usuarios</button>
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Link2 className="w-5 h-5 text-primary" />
                Preferencias de contratacion
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Modalidad</span>
                  <span className="font-semibold">Hibrido / Presencial</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nivel de experiencia</span>
                  <span className="font-semibold">Junior / Semi-senior</span>
                </div>
              </div>
              <button className="text-xs text-primary font-semibold">Editar preferencias</button>
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Verificacion
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Estado</span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                  Verificado
                </span>
              </div>
              <button className="text-xs text-primary font-semibold">Ver detalles</button>
            </div>

            <div className="company-card p-4 bg-secondary/60 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <Globe className="w-5 h-5 text-primary" />
                Facturacion
              </div>
              <p className="text-sm text-foreground/70">
                Configura metodos de pago y plan de suscripcion si aplica.
              </p>
              <button className="text-xs text-primary font-semibold">Configurar facturacion</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
