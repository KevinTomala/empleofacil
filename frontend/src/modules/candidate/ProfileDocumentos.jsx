import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import ProfileTabs from './ProfileTabs'

export default function ProfileDocumentos() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="page-container pt-12 pb-20 space-y-8">
        <ProfileTabs current="/perfil/documentos" />
        <section className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Documentos</h1>
            <p className="text-sm text-foreground/70">
              Sube tu CV y certificados para mejorar tu perfil.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Curriculum Vitae (PDF)
                <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="file" />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Certificados (opcional)
                <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="file" />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="submit">
                Guardar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                type="button"
                onClick={() => navigate('/app/candidate/perfil')}
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
