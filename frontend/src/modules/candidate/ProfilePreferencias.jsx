import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import {
  getMyPerfil,
  getPerfilErrorMessage,
  updateMyLogistica
} from '../../services/perfilCandidato.api'
import { showToast } from '../../utils/showToast'
import ProfileWizardLayout from './ProfileWizardLayout'
import { isRouteComplete } from './profileSections'

const siNoOptions = [
  { value: 'si', label: 'Si' },
  { value: 'no', label: 'No' }
]

const vehiculoOptions = [
  { value: '', label: 'No aplica' },
  { value: 'automovil', label: 'Automovil' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'bus', label: 'Bus' },
  { value: 'camion', label: 'Camion' },
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'tricimoto', label: 'Tricimoto' }
]

const licenciaOptions = [
  { value: '', label: 'No aplica' },
  { value: 'A', label: 'A' },
  { value: 'A1', label: 'A1' },
  { value: 'B', label: 'B' },
  { value: 'C1', label: 'C1' },
  { value: 'C', label: 'C' },
  { value: 'D1', label: 'D1' },
  { value: 'D', label: 'D' },
  { value: 'E1', label: 'E1' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' }
]

function boolToSelect(value) {
  return value === 1 || value === true ? 'si' : 'no'
}

function selectToBool(value) {
  return value === 'si' ? 1 : 0
}

export default function ProfilePreferencias() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [form, setForm] = useState({
    movilizacion: 'no',
    tipo_vehiculo: '',
    licencia: '',
    disp_viajar: 'no',
    disp_turnos: 'no',
    disp_fines_semana: 'no'
  })

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return

        const logistica = data?.logistica || {}
        setIsSectionComplete(isRouteComplete('/perfil/preferencias', data))
        setForm({
          movilizacion: boolToSelect(logistica.movilizacion),
          tipo_vehiculo: logistica.tipo_vehiculo || '',
          licencia: logistica.licencia || '',
          disp_viajar: boolToSelect(logistica.disp_viajar),
          disp_turnos: boolToSelect(logistica.disp_turnos),
          disp_fines_semana: boolToSelect(logistica.disp_fines_semana)
        })
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo cargar tus preferencias.')
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
    await updateMyLogistica({
      movilizacion: selectToBool(form.movilizacion),
      tipo_vehiculo: form.tipo_vehiculo || null,
      licencia: form.licencia || null,
      disp_viajar: selectToBool(form.disp_viajar),
      disp_turnos: selectToBool(form.disp_turnos),
      disp_fines_semana: selectToBool(form.disp_fines_semana)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Preferencias guardadas.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar tus preferencias.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Preferencias guardadas.' })
      navigate('/perfil/experiencia')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar tus preferencias.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/preferencias"
      title="Preferencias laborales"
      description="Configura movilidad y disponibilidad para mejorar coincidencias con vacantes."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      sidebarContext={{
        lastSavedText: saving ? 'Guardando cambios...' : 'Tus cambios se guardan al presionar Guardar.'
      }}
    >
      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-foreground/70">Cargando preferencias...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tiene movilizacion propia
              <FormDropdown
                value={form.movilizacion}
                options={siNoOptions}
                onChange={(value) => setField('movilizacion', value)}
                placeholder="Selecciona una opcion"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tipo de vehiculo
              <FormDropdown
                value={form.tipo_vehiculo}
                options={vehiculoOptions}
                onChange={(value) => setField('tipo_vehiculo', value)}
                placeholder="Selecciona tipo de vehiculo"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tipo de licencia
              <FormDropdown
                value={form.licencia}
                options={licenciaOptions}
                onChange={(value) => setField('licencia', value)}
                placeholder="Selecciona tipo de licencia"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Disponibilidad para viajar
              <FormDropdown
                value={form.disp_viajar}
                options={siNoOptions}
                onChange={(value) => setField('disp_viajar', value)}
                placeholder="Selecciona una opcion"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Disponibilidad de turnos
              <FormDropdown
                value={form.disp_turnos}
                options={siNoOptions}
                onChange={(value) => setField('disp_turnos', value)}
                placeholder="Selecciona una opcion"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Disponibilidad fines de semana
              <FormDropdown
                value={form.disp_fines_semana}
                options={siNoOptions}
                onChange={(value) => setField('disp_fines_semana', value)}
                placeholder="Selecciona una opcion"
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
