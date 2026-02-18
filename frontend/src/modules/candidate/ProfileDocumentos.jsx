import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import { showToast } from '../../utils/showToast'
import {
  createMyDocumento,
  deleteMyDocumento,
  getMyDocumentos,
  getPerfilErrorMessage,
  updateMyDocumento
} from '../../services/perfilCandidato.api'
import ProfileWizardLayout from './ProfileWizardLayout'

const tipoDocumentoOptions = [
  { value: 'documento_identidad', label: 'Documento identidad' },
  { value: 'carnet_tipo_sangre', label: 'Carnet tipo sangre' },
  { value: 'libreta_militar', label: 'Libreta militar' },
  { value: 'certificado_antecedentes', label: 'Certificado antecedentes' },
  { value: 'certificado_consejo_judicatura', label: 'Consejo judicatura' },
  { value: 'examen_toxicologico', label: 'Examen toxicologico' },
  { value: 'examen_psicologico', label: 'Examen psicologico' },
  { value: 'registro_biometrico', label: 'Registro biometrico' },
  { value: 'licencia_conducir', label: 'Licencia conducir' },
  { value: 'certificado_estudios', label: 'Certificado estudios' },
  { value: 'foto', label: 'Foto' },
  { value: 'carta_compromiso', label: 'Carta compromiso' },
  { value: 'otro', label: 'Otro' }
]

const initialForm = {
  tipo_documento: 'documento_identidad',
  fecha_emision: '',
  fecha_vencimiento: '',
  numero_documento: '',
  descripcion: '',
  observaciones: ''
}

export default function ProfileDocumentos() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [form, setForm] = useState(initialForm)

  const isSectionComplete = useMemo(() => items.length > 0, [items])

  async function loadDocumentos() {
    const response = await getMyDocumentos()
    setItems(response.items || [])
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const response = await getMyDocumentos()
        if (!active) return
        setItems(response.items || [])
      } catch (error) {
        if (!active) return
        showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo cargar documentos.') })
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
    setSelectedFile(null)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)

      if (editingId) {
        await updateMyDocumento(editingId, {
          tipo_documento: form.tipo_documento,
          fecha_emision: form.fecha_emision || null,
          fecha_vencimiento: form.fecha_vencimiento || null,
          numero_documento: form.numero_documento.trim() || null,
          descripcion: form.descripcion.trim() || null,
          observaciones: form.observaciones.trim() || null
        })
      } else {
        if (!selectedFile) {
          showToast({ type: 'warning', message: 'Selecciona un archivo.' })
          return
        }

        const payload = new FormData()
        payload.append('archivo', selectedFile)
        payload.append('tipo_documento', form.tipo_documento)
        if (form.fecha_emision) payload.append('fecha_emision', form.fecha_emision)
        if (form.fecha_vencimiento) payload.append('fecha_vencimiento', form.fecha_vencimiento)
        if (form.numero_documento.trim()) payload.append('numero_documento', form.numero_documento.trim())
        if (form.descripcion.trim()) payload.append('descripcion', form.descripcion.trim())
        if (form.observaciones.trim()) payload.append('observaciones', form.observaciones.trim())

        await createMyDocumento(payload)
      }

      await loadDocumentos()
      resetForm()
      showToast({ type: 'success', message: 'Documento guardado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo guardar documento.') })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      tipo_documento: item.tipo_documento || 'documento_identidad',
      fecha_emision: item.fecha_emision || '',
      fecha_vencimiento: item.fecha_vencimiento || '',
      numero_documento: item.numero_documento || '',
      descripcion: item.descripcion || '',
      observaciones: item.observaciones || ''
    })
  }

  const handleDelete = async (id) => {
    try {
      await deleteMyDocumento(id)
      await loadDocumentos()
      if (editingId === id) resetForm()
      showToast({ type: 'success', message: 'Documento eliminado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo eliminar documento.') })
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/documentos"
      title="Documentos"
      description="Sube tu CV y certificados para mejorar tu perfil."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
    >
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Tipo de documento
              <FormDropdown
                value={form.tipo_documento}
                options={tipoDocumentoOptions}
                onChange={(value) => setForm((prev) => ({ ...prev, tipo_documento: value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Archivo {editingId ? '(sin reemplazo en edicion)' : ''}
              <input
                className="ef-control"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={Boolean(editingId)}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Fecha emision
              <input
                className="ef-control"
                type="date"
                value={form.fecha_emision}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha_emision: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Fecha vencimiento
              <input
                className="ef-control"
                type="date"
                value={form.fecha_vencimiento}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Numero documento
              <input
                className="ef-control"
                type="text"
                value={form.numero_documento}
                onChange={(event) => setForm((prev) => ({ ...prev, numero_documento: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Descripcion
              <textarea
                className="ef-control min-h-20"
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
              {saving ? 'Guardando...' : editingId ? 'Actualizar documento' : 'Subir documento'}
            </button>
          </div>
        </form>

        <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-base">Documentos cargados</h2>
          {loading && <p className="text-sm text-foreground/70">Cargando documentos...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-foreground/70">No hay documentos cargados.</p>
          )}
          {!loading && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.tipo_documento}</p>
                    <p className="text-xs text-foreground/60">
                      Estado: {item.estado} | Archivo: {item.nombre_original || item.nombre_archivo}
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
