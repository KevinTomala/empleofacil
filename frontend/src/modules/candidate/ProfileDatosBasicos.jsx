import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import {
  getMyPerfil,
  getPerfilErrorMessage,
  updateMyContacto,
  updateMyDatosBasicos
} from '../../services/perfilCandidato.api'
import { showToast } from '../../utils/showToast'
import ProfileWizardLayout from './ProfileWizardLayout'
import { isRouteComplete } from './profileSections'

const sexoOptions = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' }
]

const estadoCivilOptions = [
  { value: 'soltero', label: 'Soltero' },
  { value: 'casado', label: 'Casado' },
  { value: 'viudo', label: 'Viudo' },
  { value: 'divorciado', label: 'Divorciado' },
  { value: 'union_libre', label: 'Union libre' }
]

const estadoAcademicoOptions = [
  { value: 'preinscrito', label: 'Preinscrito' },
  { value: 'inscrito', label: 'Inscrito' },
  { value: 'matriculado', label: 'Matriculado' },
  { value: 'rechazado', label: 'Rechazado' }
]

export default function ProfileDatosBasicos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [initialSensitive, setInitialSensitive] = useState({
    email: '',
    telefono_celular: '',
    documento_identidad: ''
  })
  const [form, setForm] = useState({
    documento_identidad: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    nacionalidad: '',
    sexo: 'O',
    estado_civil: 'soltero',
    estado_academico: 'preinscrito',
    telefono_celular: '',
    email: ''
  })

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return

        setIsSectionComplete(isRouteComplete('/perfil/datos-basicos', data))
        setInitialSensitive({
          email: data?.contacto?.email || '',
          telefono_celular: data?.contacto?.telefono_celular || '',
          documento_identidad: data?.datos_basicos?.documento_identidad || ''
        })

        setForm((prev) => ({
          ...prev,
          documento_identidad: data?.datos_basicos?.documento_identidad || '',
          nombres: data?.datos_basicos?.nombres || '',
          apellidos: data?.datos_basicos?.apellidos || '',
          fecha_nacimiento: data?.datos_basicos?.fecha_nacimiento || '',
          nacionalidad: data?.datos_basicos?.nacionalidad || '',
          sexo: data?.datos_basicos?.sexo || 'O',
          estado_civil: data?.datos_basicos?.estado_civil || 'soltero',
          estado_academico: data?.datos_basicos?.estado_academico || 'preinscrito',
          telefono_celular: data?.contacto?.telefono_celular || '',
          email: data?.contacto?.email || ''
        }))
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo cargar tu perfil.')
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

  const contextAlerts = []
  if (form.email !== initialSensitive.email) {
    contextAlerts.push('Cambiar email puede requerir nueva verificacion.')
  }
  if (form.telefono_celular !== initialSensitive.telefono_celular) {
    contextAlerts.push('Verifica que el telefono sea correcto para contacto de empresas.')
  }
  if (form.documento_identidad !== initialSensitive.documento_identidad) {
    contextAlerts.push('Actualizar documento puede afectar validaciones de perfil.')
  }

  const saveForm = async () => {
    const payloadDatosBasicos = {
      documento_identidad: form.documento_identidad.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      fecha_nacimiento: form.fecha_nacimiento || null,
      nacionalidad: form.nacionalidad.trim() || null,
      sexo: form.sexo,
      estado_civil: form.estado_civil,
      estado_academico: form.estado_academico
    }

    const payloadContacto = {
      telefono_celular: form.telefono_celular.trim() || null,
      email: form.email.trim() || null
    }

    await updateMyDatosBasicos(payloadDatosBasicos)
    await updateMyContacto(payloadContacto)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Informacion basica guardada.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar la informacion basica.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Informacion basica guardada.' })
      navigate('/perfil/datos-personales')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar la informacion basica.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/datos-basicos"
      title="Informacion basica"
      description="Completa los datos obligatorios para poder postular."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      contextAlerts={contextAlerts}
      sidebarContext={{
        lastSavedText: saving ? 'Guardando cambios...' : 'Tus cambios se guardan al presionar Guardar.'
      }}
    >
      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-foreground/70">Cargando perfil...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Numero de documento
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: 1234567890"
                type="text"
                value={form.documento_identidad}
                onChange={(event) => setField('documento_identidad', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Nacionalidad
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Ecuatoriana"
                type="text"
                value={form.nacionalidad}
                onChange={(event) => setField('nacionalidad', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Nombres
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Camila"
                type="text"
                value={form.nombres}
                onChange={(event) => setField('nombres', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Apellidos
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Alvarez"
                type="text"
                value={form.apellidos}
                onChange={(event) => setField('apellidos', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Fecha de nacimiento
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="date"
                value={form.fecha_nacimiento}
                onChange={(event) => setField('fecha_nacimiento', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Sexo
              <FormDropdown
                value={form.sexo}
                options={sexoOptions}
                onChange={(value) => setField('sexo', value)}
                placeholder="Selecciona sexo"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Estado civil
              <FormDropdown
                value={form.estado_civil}
                options={estadoCivilOptions}
                onChange={(value) => setField('estado_civil', value)}
                placeholder="Selecciona estado civil"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Estado academico
              <FormDropdown
                value={form.estado_academico}
                options={estadoAcademicoOptions}
                onChange={(value) => setField('estado_academico', value)}
                placeholder="Selecciona estado academico"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono celular
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: 0999999999"
                type="tel"
                value={form.telefono_celular}
                onChange={(event) => setField('telefono_celular', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Email
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="correo@ejemplo.com"
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
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
