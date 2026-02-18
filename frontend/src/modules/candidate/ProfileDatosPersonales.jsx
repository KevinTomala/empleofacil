import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import provinciasData from '../../assets/provincias.json'
import {
  getMyPerfil,
  getPerfilErrorMessage,
  updateMyContacto,
  updateMyDomicilio
} from '../../services/perfilCandidato.api'
import { showToast } from '../../utils/showToast'
import ProfileWizardLayout from './ProfileWizardLayout'
import { isRouteComplete } from './profileSections'

function normalizeText(value) {
  return String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function resolveUbigeoIds(provinciaName, cantonName, parroquiaName) {
  const provinciaEntry = Object.entries(provinciasData).find(
    ([, provincia]) => normalizeText(provincia?.provincia) === normalizeText(provinciaName)
  )
  if (!provinciaEntry) return { provinciaId: '', cantonId: '', parroquiaId: '' }

  const [provinciaId, provincia] = provinciaEntry
  const cantonEntry = Object.entries(provincia?.cantones || {}).find(
    ([, canton]) => normalizeText(canton?.canton) === normalizeText(cantonName)
  )
  if (!cantonEntry) return { provinciaId, cantonId: '', parroquiaId: '' }

  const [cantonId, canton] = cantonEntry
  const parroquiaEntry = Object.entries(canton?.parroquias || {}).find(
    ([, parroquia]) => normalizeText(parroquia) === normalizeText(parroquiaName)
  )
  if (!parroquiaEntry) return { provinciaId, cantonId, parroquiaId: '' }

  const [parroquiaId] = parroquiaEntry
  return { provinciaId, cantonId, parroquiaId }
}

export default function ProfileDatosPersonales() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [initialSensitive, setInitialSensitive] = useState({
    email: '',
    telefono_celular: ''
  })
  const [ubigeo, setUbigeo] = useState({
    provinciaId: '',
    cantonId: '',
    parroquiaId: ''
  })
  const [form, setForm] = useState({
    email: '',
    telefono_celular: '',
    telefono_fijo: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    pais: '',
    provincia: '',
    canton: '',
    parroquia: '',
    direccion: '',
    codigo_postal: ''
  })

  const provincias = useMemo(
    () =>
      Object.entries(provinciasData).map(([id, provincia]) => ({
        value: id,
        label: provincia?.provincia || ''
      })),
    []
  )

  const cantones = useMemo(() => {
    if (!ubigeo.provinciaId) return []
    const provincia = provinciasData[ubigeo.provinciaId]
    return Object.entries(provincia?.cantones || {}).map(([id, canton]) => ({
      value: id,
      label: canton?.canton || ''
    }))
  }, [ubigeo.provinciaId])

  const parroquias = useMemo(() => {
    if (!ubigeo.provinciaId || !ubigeo.cantonId) return []
    const canton = provinciasData[ubigeo.provinciaId]?.cantones?.[ubigeo.cantonId]
    return Object.entries(canton?.parroquias || {}).map(([id, nombre]) => ({
      value: id,
      label: nombre || ''
    }))
  }, [ubigeo.provinciaId, ubigeo.cantonId])

  useEffect(() => {
    let active = true

    async function loadPerfil() {
      try {
        setLoading(true)
        const data = await getMyPerfil()
        if (!active) return

        const initialProvincia = data?.domicilio?.provincia || ''
        const initialCanton = data?.domicilio?.canton || ''
        const initialParroquia = data?.domicilio?.parroquia || ''
        const ids = resolveUbigeoIds(initialProvincia, initialCanton, initialParroquia)

        setIsSectionComplete(isRouteComplete('/perfil/datos-personales', data))
        setInitialSensitive({
          email: data?.contacto?.email || '',
          telefono_celular: data?.contacto?.telefono_celular || ''
        })
        setUbigeo(ids)
        setForm((prev) => ({
          ...prev,
          email: data?.contacto?.email || '',
          telefono_celular: data?.contacto?.telefono_celular || '',
          telefono_fijo: data?.contacto?.telefono_fijo || '',
          contacto_emergencia_nombre: data?.contacto?.contacto_emergencia_nombre || '',
          contacto_emergencia_telefono: data?.contacto?.contacto_emergencia_telefono || '',
          pais: data?.domicilio?.pais || '',
          provincia: initialProvincia,
          canton: initialCanton,
          parroquia: initialParroquia,
          direccion: data?.domicilio?.direccion || '',
          codigo_postal: ids.parroquiaId || ids.cantonId || ids.provinciaId || data?.domicilio?.codigo_postal || ''
        }))
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo cargar tu informacion personal.')
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

  const handleProvinciaChange = (provinciaId) => {
    const provincia = provinciasData[provinciaId]
    setUbigeo({ provinciaId, cantonId: '', parroquiaId: '' })
    setForm((prev) => ({
      ...prev,
      provincia: provincia?.provincia || '',
      canton: '',
      parroquia: '',
      codigo_postal: provinciaId || ''
    }))
  }

  const handleCantonChange = (cantonId) => {
    const canton = provinciasData[ubigeo.provinciaId]?.cantones?.[cantonId]
    setUbigeo((prev) => ({ ...prev, cantonId, parroquiaId: '' }))
    setForm((prev) => ({
      ...prev,
      canton: canton?.canton || '',
      parroquia: '',
      codigo_postal: cantonId || prev.codigo_postal
    }))
  }

  const handleParroquiaChange = (parroquiaId) => {
    const parroquia = provinciasData[ubigeo.provinciaId]?.cantones?.[ubigeo.cantonId]?.parroquias?.[parroquiaId]
    setUbigeo((prev) => ({ ...prev, parroquiaId }))
    setForm((prev) => ({
      ...prev,
      parroquia: parroquia || '',
      codigo_postal: parroquiaId || prev.codigo_postal
    }))
  }

  const contextAlerts = []
  if (form.email !== initialSensitive.email) {
    contextAlerts.push('Cambiar email puede requerir nueva verificacion.')
  }
  if (form.telefono_celular !== initialSensitive.telefono_celular) {
    contextAlerts.push('Verifica que el telefono sea correcto para contacto de empresas.')
  }

  const saveForm = async () => {
    await updateMyContacto({
      email: form.email.trim() || null,
      telefono_celular: form.telefono_celular.trim() || null,
      telefono_fijo: form.telefono_fijo.trim() || null,
      contacto_emergencia_nombre: form.contacto_emergencia_nombre.trim() || null,
      contacto_emergencia_telefono: form.contacto_emergencia_telefono.trim() || null
    })

    await updateMyDomicilio({
      pais: form.pais.trim() || null,
      provincia: form.provincia.trim() || null,
      canton: form.canton.trim() || null,
      parroquia: form.parroquia.trim() || null,
      direccion: form.direccion.trim() || null,
      codigo_postal: form.codigo_postal.trim() || null
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Datos personales guardados.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar la informacion personal.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Datos personales guardados.' })
      navigate('/perfil/preferencias')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar la informacion personal.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/datos-personales"
      title="Datos personales"
      description="Completa tu informacion principal para que las empresas puedan contactarte."
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
              Email de contacto
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono celular
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="tel"
                value={form.telefono_celular}
                onChange={(event) => setField('telefono_celular', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono fijo
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="tel"
                value={form.telefono_fijo}
                onChange={(event) => setField('telefono_fijo', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Pais
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="text"
                value={form.pais}
                onChange={(event) => setField('pais', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Provincia
              <FormDropdown
                value={ubigeo.provinciaId}
                options={provincias}
                placeholder="Selecciona provincia"
                onChange={handleProvinciaChange}
                disabled={false}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Canton
              <FormDropdown
                value={ubigeo.cantonId}
                options={cantones}
                placeholder="Selecciona canton"
                onChange={handleCantonChange}
                disabled={!ubigeo.provinciaId}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Direccion
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="text"
                value={form.direccion}
                onChange={(event) => setField('direccion', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Parroquia
              <FormDropdown
                value={ubigeo.parroquiaId}
                options={parroquias}
                placeholder="Selecciona parroquia"
                onChange={handleParroquiaChange}
                disabled={!ubigeo.provinciaId || !ubigeo.cantonId}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Codigo postal
              <input className="ef-control" type="text" value={form.codigo_postal} readOnly />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Contacto de emergencia
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="text"
                value={form.contacto_emergencia_nombre}
                onChange={(event) => setField('contacto_emergencia_nombre', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Telefono emergencia
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                type="tel"
                value={form.contacto_emergencia_telefono}
                onChange={(event) => setField('contacto_emergencia_telefono', event.target.value)}
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
