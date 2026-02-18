import { useNavigate } from 'react-router-dom'
import ProfileWizardLayout from './ProfileWizardLayout'

export default function ProfileDocumentos() {
  const navigate = useNavigate()
  const isSectionComplete = false

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/documentos"
      title="Documentos"
      description="Sube tu CV y certificados para mejorar tu perfil."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      phase2Notice="Esta seccion aun no guarda datos en backend de perfil (fase 2)."
    >
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
    </ProfileWizardLayout>
  )
}
