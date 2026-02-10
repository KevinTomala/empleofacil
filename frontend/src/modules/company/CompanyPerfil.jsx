import './company.css'
import { Building2, Globe, MapPin, Phone } from 'lucide-react'
import Header from '../../components/Header'

export default function CompanyPerfil() {
  return (
    <div className="company-scope company-compact min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              <Building2 className="w-4 h-4" /> Perfil de empresa
            </span>
            <h1 className="company-title font-heading text-2xl sm:text-3xl font-bold">
              Informacion corporativa
            </h1>
            <p className="text-foreground/70 max-w-xl">
              Mantén tus datos actualizados para aumentar la confianza de los candidatos.
            </p>
          </div>
          <button className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium">
            Guardar cambios
          </button>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="company-card p-5 space-y-4">
            <h2 className="font-heading text-base font-semibold">Datos generales</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <label className="flex flex-col gap-2">
                Razon social
                <input
                  type="text"
                  defaultValue="Servicios S.A."
                  className="px-3 py-2 border border-border rounded-lg bg-white"
                />
              </label>
              <label className="flex flex-col gap-2">
                RUC
                <input
                  type="text"
                  defaultValue="1790012345001"
                  className="px-3 py-2 border border-border rounded-lg bg-white"
                />
              </label>
              <label className="flex flex-col gap-2">
                Sector
                <input
                  type="text"
                  defaultValue="Servicios corporativos"
                  className="px-3 py-2 border border-border rounded-lg bg-white"
                />
              </label>
              <label className="flex flex-col gap-2">
                Numero de empleados
                <input
                  type="text"
                  defaultValue="120"
                  className="px-3 py-2 border border-border rounded-lg bg-white"
                />
              </label>
            </div>
          </div>

          <div className="company-card p-5 space-y-4">
            <h2 className="font-heading text-base font-semibold">Contacto</h2>
            <div className="space-y-3 text-sm text-foreground/70">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Av. Republica 123, Quito
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                +593 2 123 4567
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                www.servicios.com.ec
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <label className="flex flex-col gap-2">
                Email de contacto
                <input
                  type="email"
                  defaultValue="talento@servicios.com.ec"
                  className="px-3 py-2 border border-border rounded-lg bg-white"
                />
              </label>
              <label className="flex flex-col gap-2">
                Sitio web
                <input
                  type="text"
                  defaultValue="www.servicios.com.ec"
                  className="px-3 py-2 border border-border rounded-lg bg-white"
                />
              </label>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
