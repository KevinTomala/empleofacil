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

export default function ProfilePerfil() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [form, setForm] = useState({
    documento_identidad: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    nacionalidad: '',
    sexo: 'O',
    estado_civil: 'soltero',
    telefono_celular: '',
    telefono_fijo: '',
    email: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: ''
  })

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return

        setIsSectionComplete(isRouteComplete('/perfil/perfil', data))
        setForm((prev) => ({
          ...prev,
          documento_identidad: data?.datos_basicos?.documento_identidad || '',
          nombres: data?.datos_basicos?.nombres || '',
          apellidos: data?.datos_basicos?.apellidos || '',
          fecha_nacimiento: data?.datos_basicos?.fecha_nacimiento || '',
          nacionalidad: data?.datos_basicos?.nacionalidad || '',
          sexo: data?.datos_basicos?.sexo || 'O',
          estado_civil: data?.datos_basicos?.estado_civil || 'soltero',
          telefono_celular: data?.contacto?.telefono_celular || '',
          telefono_fijo: data?.contacto?.telefono_fijo || '',
          email: data?.contacto?.email || '',
          contacto_emergencia_nombre: data?.contacto?.contacto_emergencia_nombre || '',
          contacto_emergencia_telefono: data?.contacto?.contacto_emergencia_telefono || ''
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

  const saveForm = async () => {
    const payloadDatosBasicos = {
      documento_identidad: form.documento_identidad.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      fecha_nacimiento: form.fecha_nacimiento || null,
      nacionalidad: form.nacionalidad.trim() || null,
      sexo: form.sexo,
      estado_civil: form.estado_civil
    }

    const payloadContacto = {
      telefono_celular: form.telefono_celular.trim() || null,
      telefono_fijo: form.telefono_fijo.trim() || null,
      email: form.email.trim() || null,
      contacto_emergencia_nombre: form.contacto_emergencia_nombre.trim() || null,
      contacto_emergencia_telefono: form.contacto_emergencia_telefono.trim() || null
    }

    await updateMyDatosBasicos(payloadDatosBasicos)
    await updateMyContacto(payloadContacto)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Perfil guardado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar el perfil.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Perfil guardado.' })
      navigate('/perfil/domicilio')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar el perfil.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/perfil"
      title="Perfil"
      description="Completa tus datos personales y de contacto."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
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
              <input className="ef-control" type="text" value={form.documento_identidad} onChange={(event) => setField('documento_identidad', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Nacionalidad
              <input className="ef-control" type="text" value={form.nacionalidad} onChange={(event) => setField('nacionalidad', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Nombres
              <input className="ef-control" type="text" value={form.nombres} onChange={(event) => setField('nombres', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Apellidos
              <input className="ef-control" type="text" value={form.apellidos} onChange={(event) => setField('apellidos', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Fecha de nacimiento
              <input className="ef-control" type="date" value={form.fecha_nacimiento} onChange={(event) => setField('fecha_nacimiento', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Sexo
              <FormDropdown value={form.sexo} options={sexoOptions} onChange={(value) => setField('sexo', value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Estado civil
              <FormDropdown value={form.estado_civil} options={estadoCivilOptions} onChange={(value) => setField('estado_civil', value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono celular
              <input className="ef-control" type="tel" value={form.telefono_celular} onChange={(event) => setField('telefono_celular', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono fijo
              <input className="ef-control" type="tel" value={form.telefono_fijo} onChange={(event) => setField('telefono_fijo', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Email
              <input className="ef-control" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Contacto emergencia
              <input className="ef-control" type="text" value={form.contacto_emergencia_nombre} onChange={(event) => setField('contacto_emergencia_nombre', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono emergencia
              <input className="ef-control" type="tel" value={form.contacto_emergencia_telefono} onChange={(event) => setField('contacto_emergencia_telefono', event.target.value)} />
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
