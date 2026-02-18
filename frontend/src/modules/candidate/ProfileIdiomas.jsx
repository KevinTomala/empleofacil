import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import ProfileWizardLayout from './ProfileWizardLayout'

const nivelIdiomaOptions = [
  { value: 'Basico', label: 'Basico' },
  { value: 'Intermedio', label: 'Intermedio' },
  { value: 'Avanzado', label: 'Avanzado' },
  { value: 'Nativo', label: 'Nativo' }
]

export default function ProfileIdiomas() {
  const navigate = useNavigate()
  const [nivel, setNivel] = useState('Basico')
  const isSectionComplete = false

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/idiomas"
      title="Idiomas"
      description="Indica los idiomas que manejas y tu nivel de dominio."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      phase2Notice="Esta seccion aun no guarda datos en backend de perfil (fase 2)."
    >
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
            <FormDropdown
              value={nivel}
              options={nivelIdiomaOptions}
              onChange={setNivel}
              placeholder="Selecciona nivel"
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
            onClick={() => navigate('/perfil/documentos')}
          >
            Guardar y continuar
          </button>
        </div>
      </form>
    </ProfileWizardLayout>
  )
}
