import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import ProfileTabs from './ProfileTabs'

export default function ProfileDatosBasicos() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <ProfileTabs current="/perfil/datos-basicos" />
        <section className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Informacion basica</h1>
            <p className="text-sm text-foreground/70">
              Completa los datos obligatorios para poder postular.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Tipo de documento
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Cedula</option>
                  <option>Pasaporte</option>
                  <option>Otro</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Numero de documento
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: 001-1234567-8"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Nombres
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Camila"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Apellidos
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Alvarez"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Fecha de nacimiento
                <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="date" />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Ciudad o provincia
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Santo Domingo"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Telefono
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: 809 555 1234"
                  type="tel"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Email
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="correo@ejemplo.com"
                  type="email"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="submit">
                Guardar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                type="button"
                onClick={() => navigate('/perfil/preferencias')}
              >
                Guardar y continuar
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
