import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import ProfileTabs from './ProfileTabs'

export default function ProfilePreferencias() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <ProfileTabs current="/perfil/preferencias" />
        <section className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Preferencias laborales</h1>
            <p className="text-sm text-foreground/70">
              Define el tipo de trabajo que estas buscando para mejorar coincidencias.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Cargo deseado
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Asistente administrativo"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Area u oficio
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Ventas, logistica"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Modalidad preferida
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Presencial</option>
                  <option>Remoto</option>
                  <option>Hibrido</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Disponibilidad
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Tiempo completo</option>
                  <option>Medio tiempo</option>
                  <option>Por horas</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Puedes viajar
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Si</option>
                  <option>No</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Entrevistas en linea
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Si</option>
                  <option>No</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="submit">
                Guardar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                type="button"
                onClick={() => navigate('/perfil/experiencia')}
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
