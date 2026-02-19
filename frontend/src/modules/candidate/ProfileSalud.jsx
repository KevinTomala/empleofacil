import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import { getMyPerfil, getPerfilErrorMessage, updateMySalud } from '../../services/perfilCandidato.api'
import { showToast } from '../../utils/showToast'
import ProfileWizardLayout from './ProfileWizardLayout'
import { isRouteComplete } from './profileSections'

const tipoSangreOptions = [
  { value: '', label: 'No especificado' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' }
]

const tatuajeOptions = [
  { value: 'no', label: 'No' },
  { value: 'si_visible', label: 'Si visible' },
  { value: 'si_no_visible', label: 'Si no visible' }
]

export default function ProfileSalud() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [form, setForm] = useState({
    tipo_sangre: '',
    estatura: '',
    peso: '',
    tatuaje: 'no'
  })

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return

        setIsSectionComplete(isRouteComplete('/perfil/salud', data))
        setForm({
          tipo_sangre: data?.salud?.tipo_sangre || '',
          estatura: data?.salud?.estatura ?? '',
          peso: data?.salud?.peso ?? '',
          tatuaje: data?.salud?.tatuaje || 'no'
        })
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo cargar datos de salud.')
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
    await updateMySalud({
      tipo_sangre: form.tipo_sangre || null,
      estatura: form.estatura === '' ? null : Number(form.estatura),
      peso: form.peso === '' ? null : Number(form.peso),
      tatuaje: form.tatuaje || null
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Salud guardada.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar salud.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Salud guardada.' })
      navigate('/perfil/formacion')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar salud.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/salud"
      title="Salud"
      description="Registra datos de salud relevantes para el perfil laboral."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      sidebarContext={{
        lastSavedText: saving ? 'Guardando cambios...' : 'Tus cambios se guardan al presionar Guardar.'
      }}
    >
      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-foreground/70">Cargando salud...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tipo de sangre
              <FormDropdown value={form.tipo_sangre} options={tipoSangreOptions} onChange={(value) => setField('tipo_sangre', value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tatuajes
              <FormDropdown value={form.tatuaje} options={tatuajeOptions} onChange={(value) => setField('tatuaje', value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Estatura (m)
              <input className="ef-control" type="number" step="0.01" value={form.estatura} onChange={(event) => setField('estatura', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Peso (kg)
              <input className="ef-control" type="number" step="0.01" value={form.peso} onChange={(event) => setField('peso', event.target.value)} />
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          {isSectionComplete ? (
            <>
              <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="button" onClick={() => navigate('/app/candidate/perfil')} disabled={loading || saving}>
                Cancelar
              </button>
              <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium" type="submit" disabled={loading || saving}>
                {saving ? 'Guardando...' : 'Actualizar informacion'}
              </button>
            </>
          ) : (
            <>
              <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="submit" disabled={loading || saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium" type="button" onClick={handleContinue} disabled={loading || saving}>
                {saving ? 'Guardando...' : 'Guardar y continuar'}
              </button>
            </>
          )}
        </div>
      </form>
    </ProfileWizardLayout>
  )
}
