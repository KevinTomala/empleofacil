import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import {
  getMyPerfil,
  getPerfilErrorMessage,
  updateMyEducacion
} from '../../services/perfilCandidato.api'
import { showToast } from '../../utils/showToast'
import ProfileWizardLayout from './ProfileWizardLayout'
import { isRouteComplete } from './profileSections'

const nivelEstudioOptions = [
  { value: 'Educacion Basica', label: 'Educacion Basica' },
  { value: 'Bachillerato', label: 'Bachillerato' },
  { value: 'Educacion Superior', label: 'Educacion Superior' }
]

export default function ProfileFormacion() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [form, setForm] = useState({
    nivel_estudio: 'Educacion Basica',
    institucion: '',
    titulo_obtenido: ''
  })

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return

        setIsSectionComplete(isRouteComplete('/perfil/formacion', data))
        setForm({
          nivel_estudio: data?.educacion?.nivel_estudio || 'Educacion Basica',
          institucion: data?.educacion?.institucion || '',
          titulo_obtenido: data?.educacion?.titulo_obtenido || ''
        })
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo cargar la formacion.')
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPerfil()

    return () => {
      active = false
    }
  }, [])

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const saveForm = async () => {
    await updateMyEducacion({
      nivel_estudio: form.nivel_estudio,
      institucion: form.institucion.trim() || null,
      titulo_obtenido: form.titulo_obtenido.trim() || null
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Formacion guardada.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar la formacion.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Formacion guardada.' })
      navigate('/perfil/idiomas')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar la formacion.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/formacion"
      title="Formacion"
      description="Registra tu nivel de estudio e institucion principal."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      sidebarContext={{
        lastSavedText: saving ? 'Guardando cambios...' : 'Tus cambios se guardan al presionar Guardar.'
      }}
    >
      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-foreground/70">Cargando formacion...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Nivel educativo
              <FormDropdown
                value={form.nivel_estudio}
                options={nivelEstudioOptions}
                onChange={(value) => setField('nivel_estudio', value)}
                placeholder="Selecciona nivel educativo"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Institucion
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Instituto Nacional"
                type="text"
                value={form.institucion}
                onChange={(event) => setField('institucion', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Titulo obtenido
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Bachiller en Ciencias"
                type="text"
                value={form.titulo_obtenido}
                onChange={(event) => setField('titulo_obtenido', event.target.value)}
              />
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          {isSectionComplete ? (
            <>
              <button
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
                type="button"
                onClick={() => navigate('/app/candidate/perfil')}
                disabled={loading || saving}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                type="submit"
                disabled={loading || saving}
              >
                {saving ? 'Guardando...' : 'Actualizar informacion'}
              </button>
            </>
          ) : (
            <>
              <button
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
                type="submit"
                disabled={loading || saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                type="button"
                onClick={handleContinue}
                disabled={loading || saving}
              >
                {saving ? 'Guardando...' : 'Guardar y continuar'}
              </button>
            </>
          )}
        </div>
      </form>
    </ProfileWizardLayout>
  )
}
