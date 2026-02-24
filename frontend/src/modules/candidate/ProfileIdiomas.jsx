import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import idiomasData from '../../assets/idiomas.json'
import { showToast } from '../../utils/showToast'
import {
  createMyIdioma,
  deleteMyIdioma,
  getMyIdiomas,
  getPerfilErrorMessage,
  updateMyIdioma
} from '../../services/perfilCandidato.api'
import ProfileWizardLayout from './ProfileWizardLayout'

const nivelIdiomaOptions = [
  { value: 'Basico', label: 'Basico' },
  { value: 'Intermedio', label: 'Intermedio' },
  { value: 'Avanzado', label: 'Avanzado' },
  { value: 'Nativo', label: 'Nativo' }
]

const initialForm = {
  idioma: '',
  nivel: 'Basico'
}

export default function ProfileIdiomas() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [idiomaDropdownOpen, setIdiomaDropdownOpen] = useState(false)

  const isSectionComplete = useMemo(() => items.length > 0, [items])
  const idiomaSuggestions = useMemo(() => {
    const map = new Map()
    const source = Array.isArray(idiomasData) ? idiomasData : []
    source.forEach((item) => {
      const value = String(item?.nameES || '').trim()
      if (!value) return
      const key = value.toLowerCase()
      if (!map.has(key)) map.set(key, value)
    })
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es'))
  }, [])
  const filteredIdiomaSuggestions = useMemo(() => {
    const term = form.idioma.trim().toLowerCase()
    if (!term) return idiomaSuggestions
    return idiomaSuggestions.filter((value) => value.toLowerCase().includes(term))
  }, [idiomaSuggestions, form.idioma])

  async function loadIdiomas() {
    const response = await getMyIdiomas()
    setItems(response.items || [])
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const response = await getMyIdiomas()
        if (!active) return
        setItems(response.items || [])
      } catch (error) {
        if (!active) return
        showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo cargar idiomas.') })
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.idioma.trim()) {
      showToast({ type: 'warning', message: 'Ingresa el idioma.' })
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateMyIdioma(editingId, {
          idioma: form.idioma.trim(),
          nivel: form.nivel
        })
      } else {
        await createMyIdioma({
          idioma: form.idioma.trim(),
          nivel: form.nivel
        })
      }

      await loadIdiomas()
      resetForm()
      showToast({ type: 'success', message: 'Idioma guardado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo guardar idioma.') })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      idioma: item.idioma || '',
      nivel: item.nivel || 'Basico'
    })
  }

  const handleDelete = async (id) => {
    try {
      await deleteMyIdioma(id)
      await loadIdiomas()
      if (editingId === id) resetForm()
      showToast({ type: 'success', message: 'Idioma eliminado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo eliminar idioma.') })
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/idiomas"
      title="Idiomas"
      description="Indica los idiomas que manejas y tu nivel de dominio."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
    >
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Idioma
              <div
                className="ef-dropdown"
                tabIndex={0}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIdiomaDropdownOpen(false)
                  }
                }}
              >
                <input
                  className="ef-control"
                  placeholder="Escribe o selecciona"
                  type="text"
                  value={form.idioma}
                  onFocus={() => setIdiomaDropdownOpen(true)}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, idioma: event.target.value }))
                    setIdiomaDropdownOpen(true)
                  }}
                />
                {idiomaDropdownOpen && (
                  <div className="ef-dropdown-menu">
                    {filteredIdiomaSuggestions.map((idioma) => (
                      <button
                        key={idioma}
                        type="button"
                        className="ef-dropdown-option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, idioma }))
                          setIdiomaDropdownOpen(false)
                        }}
                      >
                        {idioma}
                      </button>
                    ))}
                    {!filteredIdiomaSuggestions.length && (
                      <p className="px-3 py-2 text-xs text-foreground/60">
                        Sin coincidencias. Puedes guardar lo que escribiste.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Nivel
              <FormDropdown
                value={form.nivel}
                options={nivelIdiomaOptions}
                onChange={(value) => setForm((prev) => ({ ...prev, nivel: value }))}
                placeholder="Selecciona nivel"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            {editingId && (
              <button
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>
            )}
            <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar idioma' : 'Agregar idioma'}
            </button>
          </div>
        </form>

        <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-base">Idiomas registrados</h2>
          {loading && <p className="text-sm text-foreground/70">Cargando idiomas...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-foreground/70">No tienes idiomas registrados.</p>
          )}
          {!loading && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.idioma}</p>
                    <p className="text-xs text-foreground/60">Nivel: {item.nivel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-3 py-1.5 text-xs border border-border rounded-lg" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button type="button" className="px-3 py-1.5 text-xs border border-rose-300 text-rose-700 rounded-lg" onClick={() => handleDelete(item.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProfileWizardLayout>
  )
}
