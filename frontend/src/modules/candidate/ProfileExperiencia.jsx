import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import { showToast } from '../../utils/showToast'
import {
  createMyExperiencia,
  deleteMyExperiencia,
  getMyExperiencia,
  getPerfilErrorMessage,
  updateMyExperiencia
} from '../../services/perfilCandidato.api'
import ProfileWizardLayout from './ProfileWizardLayout'

const contratoOptions = [
  { value: '', label: 'No especificado' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'practicante', label: 'Practicante' },
  { value: 'otro', label: 'Otro' }
]

const booleanOptions = [
  { value: 1, label: 'Si' },
  { value: 0, label: 'No' }
]

const initialForm = {
  cargo: '',
  empresa_id: null,
  fecha_inicio: '',
  fecha_fin: '',
  actualmente_trabaja: 0,
  tipo_contrato: '',
  descripcion: ''
}

function normalizeDate(value) {
  return value || null
}

export default function ProfileExperiencia() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)

  const isSectionComplete = useMemo(() => items.length > 0, [items])

  async function loadExperiencia() {
    const response = await getMyExperiencia()
    setItems(response.items || [])
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const response = await getMyExperiencia()
        if (!active) return
        setItems(response.items || [])
      } catch (error) {
        if (!active) return
        showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo cargar experiencia.') })
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
    if (!form.cargo.trim()) {
      showToast({ type: 'warning', message: 'Ingresa el cargo.' })
      return
    }

    const payload = {
      cargo: form.cargo.trim(),
      empresa_id: form.empresa_id,
      fecha_inicio: normalizeDate(form.fecha_inicio),
      fecha_fin: normalizeDate(form.fecha_fin),
      actualmente_trabaja: Number(form.actualmente_trabaja),
      tipo_contrato: form.tipo_contrato || null,
      descripcion: form.descripcion.trim() || null
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateMyExperiencia(editingId, payload)
      } else {
        await createMyExperiencia(payload)
      }
      await loadExperiencia()
      resetForm()
      showToast({ type: 'success', message: 'Experiencia guardada.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo guardar experiencia.') })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      cargo: item.cargo || '',
      empresa_id: item.empresa_id ?? null,
      fecha_inicio: item.fecha_inicio || '',
      fecha_fin: item.fecha_fin || '',
      actualmente_trabaja: item.actualmente_trabaja ? 1 : 0,
      tipo_contrato: item.tipo_contrato || '',
      descripcion: item.descripcion || ''
    })
  }

  const handleDelete = async (id) => {
    try {
      await deleteMyExperiencia(id)
      await loadExperiencia()
      if (editingId === id) resetForm()
      showToast({ type: 'success', message: 'Experiencia eliminada.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo eliminar experiencia.') })
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/experiencia"
      title="Experiencia"
      description="Agrega tu historial laboral o habilidades destacadas."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
    >
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Cargo
              <input
                className="ef-control"
                placeholder="Ej: Supervisor"
                type="text"
                value={form.cargo}
                onChange={(event) => setForm((prev) => ({ ...prev, cargo: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tipo de contrato
              <FormDropdown
                value={form.tipo_contrato}
                options={contratoOptions}
                onChange={(value) => setForm((prev) => ({ ...prev, tipo_contrato: value }))}
                placeholder="Selecciona tipo"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Fecha inicio
              <input
                className="ef-control"
                type="date"
                value={form.fecha_inicio}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha_inicio: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Fecha fin
              <input
                className="ef-control"
                type="date"
                value={form.fecha_fin}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha_fin: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Actualmente trabaja
              <FormDropdown
                value={Number(form.actualmente_trabaja)}
                options={booleanOptions}
                onChange={(value) => setForm((prev) => ({ ...prev, actualmente_trabaja: Number(value) }))}
                placeholder="Selecciona"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Descripcion
              <textarea
                className="ef-control min-h-24"
                value={form.descripcion}
                onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
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
              {saving ? 'Guardando...' : editingId ? 'Actualizar experiencia' : 'Agregar experiencia'}
            </button>
          </div>
        </form>

        <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-base">Experiencia registrada</h2>
          {loading && <p className="text-sm text-foreground/70">Cargando experiencia...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-foreground/70">No tienes experiencia registrada.</p>
          )}
          {!loading && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.cargo || 'Sin cargo'}</p>
                    <p className="text-xs text-foreground/60">
                      {item.tipo_contrato || 'Contrato no especificado'} | {item.fecha_inicio || 'Sin inicio'} - {item.fecha_fin || 'Actual'}
                    </p>
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
