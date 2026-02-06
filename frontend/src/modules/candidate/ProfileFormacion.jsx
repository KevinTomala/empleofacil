import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import ProfileTabs from './ProfileTabs'

export default function ProfileFormacion() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <ProfileTabs current="/perfil/formacion" />
        <section className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Formacion</h1>
            <p className="text-sm text-foreground/70">
              Agrega tu formacion academica para reforzar tu perfil.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Nivel educativo
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Secundaria</option>
                  <option>Tecnico</option>
                  <option>Universitario</option>
                  <option>Postgrado</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Institucion
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Instituto Nacional"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Estado
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>En curso</option>
                  <option>Finalizado</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Anio de finalizacion
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: 2023"
                  type="text"
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
                onClick={() => navigate('/perfil/idiomas')}
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
