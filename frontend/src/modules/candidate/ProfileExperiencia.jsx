import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import { showToast } from '../../utils/showToast'
import {
  createMyExperiencia,
  createMyExperienciaCertificado,
  deleteMyExperiencia,
  deleteMyExperienciaCertificado,
  getEmpresasExperiencia,
  getMyExperiencia,
  getMyExperienciaCertificado,
  getPerfilErrorMessage,
  updateMyExperiencia,
  updateMyExperienciaCertificado
} from '../../services/perfilCandidato.api'
import ProfileWizardLayout from './ProfileWizardLayout'

const contratoOptions = [
  { value: '', label: 'No especificado' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'practicante', label: 'Practicante' },
  { value: 'otro', label: 'Otro' }
]

const initialForm = {
  cargo: '',
  empresa_id: null,
  empresa_nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  actualmente_trabaja: 0,
  tipo_contrato: '',
  descripcion: ''
}

const estadoCertificadoOptions = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'vencido', label: 'Vencido' }
]

const initialCertForm = {
  fecha_emision: '',
  descripcion: '',
  estado: 'pendiente'
}

function buildFileUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  if (path.startsWith('/')) return `${apiBase}${path}`
  return `${apiBase}/${path}`
}

function normalizeDate(value) {
  return value || null
}

function formatDateShort(value) {
  if (!value) return 'N/D'
  return String(value).slice(0, 10)
}

function normalizeCompanyName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export default function ProfileExperiencia() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [empresaOptions, setEmpresaOptions] = useState([])
  const [empresasLoading, setEmpresasLoading] = useState(false)
  const [certTargetId, setCertTargetId] = useState(null)
  const [certForm, setCertForm] = useState(initialCertForm)
  const [certFile, setCertFile] = useState(null)
  const [certHasExisting, setCertHasExisting] = useState(false)
  const [certSaving, setCertSaving] = useState(false)

  const isSectionComplete = useMemo(() => items.length > 0, [items])

  async function loadExperiencia() {
    const response = await getMyExperiencia()
    setItems(response.items || [])
  }

  async function loadEmpresas(search = '') {
    try {
      setEmpresasLoading(true)
      const response = await getEmpresasExperiencia({ search, limit: 50 })
      setEmpresaOptions(Array.isArray(response?.items) ? response.items : [])
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo cargar empresas.') })
      setEmpresaOptions([])
    } finally {
      setEmpresasLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const [response] = await Promise.all([
          getMyExperiencia(),
          loadEmpresas('')
        ])
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

  const resetCertForm = () => {
    setCertTargetId(null)
    setCertForm(initialCertForm)
    setCertFile(null)
    setCertHasExisting(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.cargo.trim()) {
      showToast({ type: 'warning', message: 'Ingresa el cargo.' })
      return
    }

    const payload = {
      cargo: form.cargo.trim(),
      empresa_id: null,
      empresa_nombre: null,
      fecha_inicio: normalizeDate(form.fecha_inicio),
      fecha_fin: Number(form.actualmente_trabaja) === 1 ? null : normalizeDate(form.fecha_fin),
      actualmente_trabaja: Number(form.actualmente_trabaja),
      tipo_contrato: form.tipo_contrato || null,
      descripcion: form.descripcion.trim() || null
    }

    const empresaNombreInput = form.empresa_nombre?.trim() || ''
    const selectedEmpresaById = empresaOptions.find((item) => Number(item.id) === Number(form.empresa_id))
    const selectedEmpresaByName = empresaOptions.find((item) => normalizeCompanyName(item.nombre) === normalizeCompanyName(empresaNombreInput))

    if (form.empresa_id) {
      payload.empresa_id = Number(form.empresa_id)
      payload.empresa_nombre = selectedEmpresaById?.nombre || empresaNombreInput || null
    } else if (selectedEmpresaByName) {
      payload.empresa_id = Number(selectedEmpresaByName.id)
      payload.empresa_nombre = selectedEmpresaByName.nombre
    } else {
      payload.empresa_id = null
      payload.empresa_nombre = empresaNombreInput || null
    }

    if (!payload.empresa_id && !payload.empresa_nombre) {
      showToast({ type: 'warning', message: 'Selecciona o escribe la empresa donde trabajaste.' })
      return
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
    const hasEmpresaId = Boolean(item.empresa_id)
    if (hasEmpresaId && item.empresa_local_nombre && !empresaOptions.some((opt) => Number(opt.id) === Number(item.empresa_id))) {
      setEmpresaOptions((prev) => [{ id: item.empresa_id, nombre: item.empresa_local_nombre, ruc: null, email: null, tipo: null }, ...prev])
    }

    setEditingId(item.id)
    setForm({
      cargo: item.cargo || '',
      empresa_id: item.empresa_id ?? null,
      empresa_nombre: item.empresa_local_nombre || item.empresa_nombre || '',
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
      if (certTargetId === id) resetCertForm()
      showToast({ type: 'success', message: 'Experiencia eliminada.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo eliminar experiencia.') })
    }
  }

  const handleOpenCertificado = async (experienciaId) => {
    try {
      setCertTargetId(experienciaId)
      setCertFile(null)
      const response = await getMyExperienciaCertificado(experienciaId)
      const item = response?.item
      setCertHasExisting(Boolean(item))
      setCertForm({
        fecha_emision: item?.fecha_emision || '',
        descripcion: item?.descripcion || '',
        estado: item?.estado || 'pendiente'
      })
    } catch (error) {
      setCertHasExisting(false)
      setCertForm(initialCertForm)
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo cargar el certificado laboral.') })
    }
  }

  const handleSaveCertificado = async () => {
    if (!certTargetId) return
    if (!certHasExisting && !certFile) {
      showToast({ type: 'warning', message: 'Selecciona un archivo para crear el certificado.' })
      return
    }

    const payload = new FormData()
    if (certFile) payload.append('archivo', certFile)
    if (certForm.fecha_emision) payload.append('fecha_emision', certForm.fecha_emision)
    if (certForm.descripcion.trim()) payload.append('descripcion', certForm.descripcion.trim())
    if (certForm.estado) payload.append('estado', certForm.estado)

    try {
      setCertSaving(true)
      if (certHasExisting) {
        await updateMyExperienciaCertificado(certTargetId, payload)
      } else {
        await createMyExperienciaCertificado(certTargetId, payload)
      }
      await loadExperiencia()
      setCertHasExisting(true)
      setCertFile(null)
      showToast({ type: 'success', message: 'Certificado laboral guardado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo guardar el certificado.') })
    } finally {
      setCertSaving(false)
    }
  }

  const handleDeleteCertificado = async () => {
    if (!certTargetId) return
    try {
      setCertSaving(true)
      await deleteMyExperienciaCertificado(certTargetId)
      await loadExperiencia()
      setCertHasExisting(false)
      setCertFile(null)
      setCertForm(initialCertForm)
      showToast({ type: 'success', message: 'Certificado laboral eliminado.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo eliminar el certificado.') })
    } finally {
      setCertSaving(false)
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
            <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
              Empresa
              <input
                className="ef-control"
                type="text"
                list="empresas-experiencia-options"
                placeholder="Escribe nombre, RUC o email para sugerencias"
                value={form.empresa_nombre}
                onChange={(event) => {
                  const nextNombre = event.target.value
                  const normalized = normalizeCompanyName(nextNombre)
                  const exactMatch = empresaOptions.find((opt) => normalizeCompanyName(opt.nombre) === normalized)

                  setForm((prev) => ({
                    ...prev,
                    empresa_nombre: nextNombre,
                    empresa_id: exactMatch ? Number(exactMatch.id) : null
                  }))

                  loadEmpresas(nextNombre)
                }}
                onBlur={() => {
                  const normalized = normalizeCompanyName(form.empresa_nombre)
                  if (!normalized) return
                  const exactMatch = empresaOptions.find((opt) => normalizeCompanyName(opt.nombre) === normalized)
                  if (!exactMatch) return
                  setForm((prev) => ({
                    ...prev,
                    empresa_id: Number(exactMatch.id),
                    empresa_nombre: exactMatch.nombre
                  }))
                }}
              />
              <datalist id="empresas-experiencia-options">
                {empresaOptions.map((empresa) => (
                  <option key={empresa.id} value={empresa.nombre}>
                    {empresa.ruc || empresa.email || ''}
                  </option>
                ))}
              </datalist>
              <p className="text-xs text-foreground/60">
                {empresasLoading
                  ? 'Buscando empresas...'
                  : form.empresa_id
                    ? 'Empresa existente detectada y vinculada.'
                    : 'Si no existe, se guardara como referencia de experiencia.'}
              </p>
            </label>
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
            {Number(form.actualmente_trabaja) !== 1 && (
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Fecha fin
                <input
                  className="ef-control"
                  type="date"
                  value={form.fecha_fin}
                  onChange={(event) => setForm((prev) => ({ ...prev, fecha_fin: event.target.value }))}
                />
              </label>
            )}
            {Number(form.actualmente_trabaja) === 1 && (
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Fecha fin
                <span className="ef-control flex items-center justify-between">
                  <span>No aplica (trabaja actualmente)</span>
                  <input
                    type="checkbox"
                    checked
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        actualmente_trabaja: event.target.checked ? 1 : 0,
                        fecha_fin: event.target.checked ? '' : prev.fecha_fin
                      }))
                    }
                  />
                </span>
              </label>
            )}
            <label className="space-y-1 text-sm font-medium text-foreground/80">
              Actualmente trabaja
              <span className="ef-control flex items-center justify-between">
                <span>{Number(form.actualmente_trabaja) === 1 ? 'Si' : 'No'}</span>
                <input
                  type="checkbox"
                  checked={Number(form.actualmente_trabaja) === 1}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      actualmente_trabaja: event.target.checked ? 1 : 0,
                      fecha_fin: event.target.checked ? '' : prev.fecha_fin
                    }))
                  }
                />
              </span>
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
                    <p className="text-sm text-foreground/70">
                      {item.empresa_local_nombre || item.empresa_nombre || (item.empresa_id ? `Empresa #${item.empresa_id}` : 'Empresa no especificada')}
                    </p>
                    <p className="text-sm font-medium">{item.cargo || 'Sin cargo'}</p>
                    <p className="text-xs text-foreground/60">
                      {item.tipo_contrato || 'Contrato no especificado'} | {formatDateShort(item.fecha_inicio)} - {item.actualmente_trabaja ? 'Actual' : formatDateShort(item.fecha_fin)}
                    </p>
                    <p className="text-xs text-foreground/60">
                      Certificado laboral: {item.certificado_laboral ? 'Cargado' : 'Pendiente'}
                    </p>
                    {item.certificado_laboral?.ruta_archivo && (
                      <a
                        href={buildFileUrl(item.certificado_laboral.ruta_archivo)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Ver certificado
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-3 py-1.5 text-xs border border-border rounded-lg" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button type="button" className="px-3 py-1.5 text-xs border border-border rounded-lg" onClick={() => handleOpenCertificado(item.id)}>
                      Certificado
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

        {certTargetId && (
          <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-base">Certificado laboral</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Archivo (PDF o imagen)
                <input
                  className="ef-control"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setCertFile(event.target.files?.[0] || null)}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Estado
                <FormDropdown
                  value={certForm.estado}
                  options={estadoCertificadoOptions}
                  onChange={(value) => setCertForm((prev) => ({ ...prev, estado: value }))}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80">
                Fecha emision
                <input
                  className="ef-control"
                  type="date"
                  value={certForm.fecha_emision}
                  onChange={(event) => setCertForm((prev) => ({ ...prev, fecha_emision: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
                Descripcion
                <textarea
                  className="ef-control min-h-20"
                  value={certForm.descripcion}
                  onChange={(event) => setCertForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
                onClick={resetCertForm}
                disabled={certSaving}
              >
                Cerrar
              </button>
              {certHasExisting && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 text-sm font-medium"
                  onClick={handleDeleteCertificado}
                  disabled={certSaving}
                >
                  Eliminar certificado
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                onClick={handleSaveCertificado}
                disabled={certSaving}
              >
                {certSaving ? 'Guardando...' : certHasExisting ? 'Actualizar certificado' : 'Subir certificado'}
              </button>
            </div>
          </section>
        )}
      </div>
    </ProfileWizardLayout>
  )
}
