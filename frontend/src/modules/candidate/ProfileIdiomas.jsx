import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import ProfileTabs from './ProfileTabs'

export default function ProfileIdiomas() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <ProfileTabs current="/perfil/idiomas" />
        <section className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Idiomas</h1>
            <p className="text-sm text-foreground/70">
              Indica los idiomas que manejas y tu nivel de dominio.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Idioma
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Ingles"
                  type="text"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Nivel
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option>Basico</option>
                  <option>Intermedio</option>
                  <option>Avanzado</option>
                  <option>Nativo</option>
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
                onClick={() => navigate('/perfil/documentos')}
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
