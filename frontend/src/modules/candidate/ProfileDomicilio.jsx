import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import provinciasData from '../../assets/provincias.json'
import { getMyPerfil, getPerfilErrorMessage, updateMyDomicilio } from '../../services/perfilCandidato.api'
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

export default function ProfileDomicilio() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSectionComplete, setIsSectionComplete] = useState(false)
  const [ubigeo, setUbigeo] = useState({
    provinciaId: '',
    cantonId: '',
    parroquiaId: ''
  })
  const [form, setForm] = useState({
    pais: '',
    provincia: '',
    canton: '',
    parroquia: '',
    direccion: '',
    codigo_postal: ''
  })
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredProvincias = useMemo(() => {
    if (!searchQuery) return provincias
    const lower = normalizeText(searchQuery)
    return provincias.filter((p) => normalizeText(p.label).includes(lower))
  }, [provincias, searchQuery])

  const filteredCantones = useMemo(() => {
    if (!searchQuery) return cantones
    const lower = normalizeText(searchQuery)
    return cantones.filter((c) => normalizeText(c.label).includes(lower))
  }, [cantones, searchQuery])

  const filteredParroquias = useMemo(() => {
    if (!searchQuery) return parroquias
    const lower = normalizeText(searchQuery)
    return parroquias.filter((p) => normalizeText(p.label).includes(lower))
  }, [parroquias, searchQuery])

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

        setIsSectionComplete(isRouteComplete('/perfil/domicilio', data))
        setUbigeo(ids)
        setForm((prev) => ({
          ...prev,
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
          message: getPerfilErrorMessage(error, 'No se pudo cargar el domicilio.')
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

  const saveForm = async () => {
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
      showToast({ type: 'success', message: 'Domicilio guardado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar el domicilio.')
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      await saveForm()
      showToast({ type: 'success', message: 'Domicilio guardado.' })
      navigate('/perfil/movilidad')
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar el domicilio.')
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/domicilio"
      title="Domicilio"
      description="Registra tu ubicacion y direccion actual."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
      sidebarContext={{
        lastSavedText: saving ? 'Guardando cambios...' : 'Tus cambios se guardan al presionar Guardar.'
      }}
    >
      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-foreground/70">Cargando domicilio...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Pais
              <input className="ef-control" type="text" value={form.pais} onChange={(event) => setField('pais', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Provincia
              <div className="ef-dropdown w-full">
                <input
                  type="text"
                  className="ef-control w-full cursor-text"
                  placeholder="Selecciona provincia"
                  value={dropdownOpen === 'provincia' ? searchQuery : (provincias.find(p => p.value === ubigeo.provinciaId)?.label || '')}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setDropdownOpen('provincia')
                  }}
                  onFocus={() => {
                    setSearchQuery(provincias.find(p => p.value === ubigeo.provinciaId)?.label || '')
                    setDropdownOpen('provincia')
                  }}
                  onBlur={() => setTimeout(() => setDropdownOpen(null), 200)}
                />
                {dropdownOpen === 'provincia' && (
                  <div className="ef-dropdown-menu absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProvincias.length > 0 ? (
                      filteredProvincias.map((prov) => (
                        <button
                          key={prov.value}
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                          onClick={() => {
                            handleProvinciaChange(prov.value)
                            setDropdownOpen(null)
                          }}
                        >
                          {prov.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-foreground/50">No hay coincidencias</div>
                    )}
                  </div>
                )}
              </div>
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Canton
              <div className="ef-dropdown w-full">
                <input
                  type="text"
                  className="ef-control w-full cursor-text"
                  placeholder="Selecciona canton"
                  disabled={!ubigeo.provinciaId}
                  value={dropdownOpen === 'canton' ? searchQuery : (cantones.find(c => c.value === ubigeo.cantonId)?.label || '')}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setDropdownOpen('canton')
                  }}
                  onFocus={() => {
                    if (ubigeo.provinciaId) {
                      setSearchQuery(cantones.find(c => c.value === ubigeo.cantonId)?.label || '')
                      setDropdownOpen('canton')
                    }
                  }}
                  onBlur={() => setTimeout(() => setDropdownOpen(null), 200)}
                />
                {dropdownOpen === 'canton' && (
                  <div className="ef-dropdown-menu absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCantones.length > 0 ? (
                      filteredCantones.map((canton) => (
                        <button
                          key={canton.value}
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                          onClick={() => {
                            handleCantonChange(canton.value)
                            setDropdownOpen(null)
                          }}
                        >
                          {canton.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-foreground/50">No hay coincidencias</div>
                    )}
                  </div>
                )}
              </div>
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Parroquia
              <div className="ef-dropdown w-full">
                <input
                  type="text"
                  className="ef-control w-full cursor-text"
                  placeholder="Selecciona parroquia"
                  disabled={!ubigeo.cantonId}
                  value={dropdownOpen === 'parroquia' ? searchQuery : (parroquias.find(p => p.value === ubigeo.parroquiaId)?.label || '')}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setDropdownOpen('parroquia')
                  }}
                  onFocus={() => {
                    if (ubigeo.cantonId) {
                      setSearchQuery(parroquias.find(p => p.value === ubigeo.parroquiaId)?.label || '')
                      setDropdownOpen('parroquia')
                    }
                  }}
                  onBlur={() => setTimeout(() => setDropdownOpen(null), 200)}
                />
                {dropdownOpen === 'parroquia' && (
                  <div className="ef-dropdown-menu absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredParroquias.length > 0 ? (
                      filteredParroquias.map((parr) => (
                        <button
                          key={parr.value}
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                          onClick={() => {
                            handleParroquiaChange(parr.value)
                            setDropdownOpen(null)
                          }}
                        >
                          {parr.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-foreground/50">No hay coincidencias</div>
                    )}
                  </div>
                )}
              </div>
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Direccion
              <input className="ef-control" type="text" value={form.direccion} onChange={(event) => setField('direccion', event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Codigo postal
              <input className="ef-control" type="text" value={form.codigo_postal} readOnly />
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
