import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import { showToast } from '../../utils/showToast'
import {
  createMyEducacionGeneralItem,
  createMyFormacion,
  deleteMyEducacionGeneralItem,
  deleteMyFormacion,
  getMyEducacionGeneralItems,
  getMyFormacion,
  getPerfilErrorMessage,
  updateMyEducacionGeneralItem,
  updateMyFormacion,
  updateMyFormacionResultado,
} from '../../services/perfilCandidato.api'
import ProfileWizardLayout from './ProfileWizardLayout'

const tabs = [
  { id: 'academica', label: 'Academica' },
  { id: 'externa', label: 'Externa' },
]

const nivelEstudioOptions = [
  { value: 'Educacion Basica', label: 'Educacion Basica' },
  { value: 'Bachillerato', label: 'Bachillerato' },
  { value: 'Educacion Superior', label: 'Educacion Superior' },
]

const estadoOptions = [
  { value: 'inscrito', label: 'Inscrito' },
  { value: 'cursando', label: 'Cursando' },
  { value: 'egresado', label: 'Egresado' },
  { value: 'acreditado', label: 'Acreditado' },
  { value: 'anulado', label: 'Anulado' },
  { value: 'reprobado', label: 'Reprobado' },
]

const subtipoExternaOptions = [
  { value: 'curso', label: 'Curso' },
  { value: 'ministerio', label: 'Ministerio' },
  { value: 'chofer_profesional', label: 'Chofer profesional' },
]

function getInitialExternaForm() {
  return {
    subtipo_formacion: 'curso',
    institucion: '',
    nombre_programa: '',
    titulo_obtenido: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'inscrito',
    documento_url_resultado: '',
  }
}

export default function ProfileFormacion() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('academica')

  const [academicaForm, setAcademicaForm] = useState({
    nivel_estudio: 'Educacion Basica',
    institucion: '',
    titulo_obtenido: '',
  })
  const [academicaItems, setAcademicaItems] = useState([])
  const [editingAcademicaId, setEditingAcademicaId] = useState(null)

  const [formaciones, setFormaciones] = useState([])
  const [editingExternaId, setEditingExternaId] = useState(null)
  const [externaForm, setExternaForm] = useState(getInitialExternaForm())

  const externaItems = useMemo(
    () => formaciones.filter((item) => (item.categoria_ui || item.categoria_formacion) === 'externa'),
    [formaciones]
  )

  const isSectionComplete = useMemo(() => {
    const hasAcademica = academicaItems.length > 0
    return hasAcademica || externaItems.length > 0
  }, [academicaItems, externaItems])

  async function loadData() {
    const [educacionResponse, formacionResponse] = await Promise.all([
      getMyEducacionGeneralItems(),
      getMyFormacion()
    ])

    setAcademicaItems(educacionResponse?.items || [])
    setFormaciones(formacionResponse?.items || [])
  }

  useEffect(() => {
    let active = true

    async function run() {
      try {
        setLoading(true)
        await loadData()
      } catch (error) {
        if (!active) return
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo cargar la formacion.'),
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    run()

    return () => {
      active = false
    }
  }, [])

  const resetExternaForm = () => {
    setExternaForm(getInitialExternaForm())
    setEditingExternaId(null)
  }

  const resetAcademicaForm = () => {
    setAcademicaForm({
      nivel_estudio: 'Educacion Basica',
      institucion: '',
      titulo_obtenido: '',
    })
    setEditingAcademicaId(null)
  }

  const handleSaveAcademica = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      const payload = {
        nivel_estudio: academicaForm.nivel_estudio,
        institucion: academicaForm.institucion.trim() || null,
        titulo_obtenido: academicaForm.titulo_obtenido.trim() || null,
      }

      if (editingAcademicaId) {
        await updateMyEducacionGeneralItem(editingAcademicaId, payload)
      } else {
        await createMyEducacionGeneralItem(payload)
      }

      await loadData()
      resetAcademicaForm()
      showToast({ type: 'success', message: 'Registro academico guardado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo guardar el registro academico.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditAcademica = (item) => {
    setEditingAcademicaId(item.id)
    setAcademicaForm({
      nivel_estudio: item.nivel_estudio || 'Educacion Basica',
      institucion: item.institucion || '',
      titulo_obtenido: item.titulo_obtenido || '',
    })
  }

  const handleDeleteAcademica = async (id) => {
    try {
      await deleteMyEducacionGeneralItem(id)
      await loadData()
      if (editingAcademicaId === id) resetAcademicaForm()
      showToast({ type: 'success', message: 'Registro academico eliminado.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo eliminar el registro academico.'),
      })
    }
  }

  const handleSaveExterna = async (event) => {
    event.preventDefault()
    if (!externaForm.subtipo_formacion) {
      showToast({ type: 'warning', message: 'Selecciona un subtipo de formacion externa.' })
      return
    }

    const payload = {
      categoria_formacion: 'externa',
      subtipo_formacion: externaForm.subtipo_formacion,
      institucion: externaForm.institucion.trim() || null,
      nombre_programa: externaForm.nombre_programa.trim() || null,
      titulo_obtenido: externaForm.titulo_obtenido.trim() || null,
      fecha_inicio: externaForm.fecha_inicio || null,
      fecha_fin: externaForm.fecha_fin || null,
      estado: externaForm.estado,
    }

    try {
      setSaving(true)
      let formacionId = editingExternaId

      if (editingExternaId) {
        await updateMyFormacion(editingExternaId, payload)
      } else {
        const created = await createMyFormacion(payload)
        formacionId = created?.id
      }

      if (formacionId && externaForm.documento_url_resultado.trim()) {
        await updateMyFormacionResultado(formacionId, {
          documento_url: externaForm.documento_url_resultado.trim(),
        })
      }

      await loadData()
      resetExternaForm()
      showToast({ type: 'success', message: 'Formacion externa guardada.' })
    } catch (error) {
      showToast({ type: 'error', message: getPerfilErrorMessage(error, 'No se pudo guardar la formacion externa.') })
    } finally {
      setSaving(false)
    }
  }

  const handleEditExterna = (item) => {
    setEditingExternaId(item.id)
    setActiveTab('externa')
    setExternaForm({
      subtipo_formacion: item.subtipo_formacion || 'curso',
      institucion: item.institucion || '',
      nombre_programa: item.nombre_programa || '',
      titulo_obtenido: item.titulo_obtenido || '',
      fecha_inicio: item.fecha_inicio || '',
      fecha_fin: item.fecha_fin || '',
      estado: item.estado || 'inscrito',
      documento_url_resultado: item?.resultado?.documento_url || '',
    })
  }

  const handleDeleteExterna = async (id) => {
    try {
      await deleteMyFormacion(id)
      await loadData()
      if (editingExternaId === id) resetExternaForm()
      showToast({ type: 'success', message: 'Formacion externa eliminada.' })
    } catch (error) {
      showToast({
        type: 'error',
        message: getPerfilErrorMessage(error, 'No se pudo eliminar la formacion externa.'),
      })
    }
  }

  return (
    <ProfileWizardLayout
      currentTab="/perfil/formacion"
      title="Formacion"
      description="Academica en educacion general, externa por cursos y certificacion laboral desde experiencia."
      isSectionComplete={isSectionComplete}
      onCancel={() => navigate('/app/candidate/perfil')}
    >
      <div className="space-y-4">
        <div className="bg-white border border-border rounded-2xl p-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-slate-100 text-foreground/70'}`}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id !== 'externa') resetExternaForm()
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'academica' && (
          <>
            <form onSubmit={handleSaveAcademica} className="bg-white border border-border rounded-2xl p-6 space-y-5">
              {loading ? (
                <p className="text-sm text-foreground/70">Cargando formacion academica...</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Nivel educativo
                    <FormDropdown
                      value={academicaForm.nivel_estudio}
                      options={nivelEstudioOptions}
                      onChange={(value) => setAcademicaForm((prev) => ({ ...prev, nivel_estudio: value }))}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Institucion
                    <input
                      className="ef-control"
                      type="text"
                      value={academicaForm.institucion}
                      onChange={(event) => setAcademicaForm((prev) => ({ ...prev, institucion: event.target.value }))}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
                    Titulo obtenido
                    <input
                      className="ef-control"
                      type="text"
                      value={academicaForm.titulo_obtenido}
                      onChange={(event) => setAcademicaForm((prev) => ({ ...prev, titulo_obtenido: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                {editingAcademicaId && (
                  <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="button" onClick={resetAcademicaForm} disabled={saving}>
                    Cancelar
                  </button>
                )}
                <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium" type="submit" disabled={loading || saving}>
                  {saving ? 'Guardando...' : editingAcademicaId ? 'Actualizar academica' : 'Agregar academica'}
                </button>
              </div>
            </form>

            <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
              <h2 className="font-semibold text-base">Formacion academica registrada</h2>
              {!loading && academicaItems.length === 0 && <p className="text-sm text-foreground/70">Sin registros academicos.</p>}
              {!loading && academicaItems.length > 0 && (
                <div className="space-y-2">
                  {academicaItems.map((item) => (
                    <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{item.titulo_obtenido || item.nivel_estudio}</p>
                        <p className="text-xs text-foreground/60">{item.institucion || 'Institucion no especificada'} | {item.nivel_estudio}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-3 py-1.5 text-xs border border-border rounded-lg" onClick={() => handleEditAcademica(item)}>
                          Editar
                        </button>
                        <button type="button" className="px-3 py-1.5 text-xs border border-rose-300 text-rose-700 rounded-lg" onClick={() => handleDeleteAcademica(item.id)}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'externa' && (
          <>
            <form onSubmit={handleSaveExterna} className="bg-white border border-border rounded-2xl p-6 space-y-5">
              {loading ? (
                <p className="text-sm text-foreground/70">Cargando formaciones externas...</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Subtipo
                    <FormDropdown
                      value={externaForm.subtipo_formacion}
                      options={subtipoExternaOptions}
                      onChange={(value) => setExternaForm((prev) => ({ ...prev, subtipo_formacion: value }))}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Estado
                    <FormDropdown
                      value={externaForm.estado}
                      options={estadoOptions}
                      onChange={(value) => setExternaForm((prev) => ({ ...prev, estado: value }))}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Institucion
                    <input className="ef-control" type="text" value={externaForm.institucion} onChange={(event) => setExternaForm((prev) => ({ ...prev, institucion: event.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Programa
                    <input className="ef-control" type="text" value={externaForm.nombre_programa} onChange={(event) => setExternaForm((prev) => ({ ...prev, nombre_programa: event.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Titulo
                    <input className="ef-control" type="text" value={externaForm.titulo_obtenido} onChange={(event) => setExternaForm((prev) => ({ ...prev, titulo_obtenido: event.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Fecha inicio
                    <input className="ef-control" type="date" value={externaForm.fecha_inicio} onChange={(event) => setExternaForm((prev) => ({ ...prev, fecha_inicio: event.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80">
                    Fecha fin
                    <input className="ef-control" type="date" value={externaForm.fecha_fin} onChange={(event) => setExternaForm((prev) => ({ ...prev, fecha_fin: event.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground/80 sm:col-span-2">
                    Documento URL de resultado (opcional)
                    <input className="ef-control" type="url" value={externaForm.documento_url_resultado} onChange={(event) => setExternaForm((prev) => ({ ...prev, documento_url_resultado: event.target.value }))} />
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                {editingExternaId && (
                  <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium" type="button" onClick={resetExternaForm} disabled={saving}>
                    Cancelar
                  </button>
                )}
                <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium" type="submit" disabled={loading || saving}>
                  {saving ? 'Guardando...' : editingExternaId ? 'Actualizar externa' : 'Agregar externa'}
                </button>
              </div>
            </form>

            <section className="bg-white border border-border rounded-2xl p-6 space-y-3">
              <h2 className="font-semibold text-base">Formacion externa registrada</h2>
              {!loading && externaItems.length === 0 && <p className="text-sm text-foreground/70">Sin registros de formacion externa.</p>}
              {!loading && externaItems.length > 0 && (
                <div className="space-y-2">
                  {externaItems.map((item) => (
                    <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{item.nombre_programa || item.titulo_obtenido || item.subtipo_formacion || 'Registro externo'}</p>
                        <p className="text-xs text-foreground/60">{item.institucion || 'Institucion no especificada'} | {item.estado || 'Sin estado'}</p>
                        {item.legacy_importado && (
                          <p className="text-[11px] text-amber-700 mt-1">Externa (importada)</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-3 py-1.5 text-xs border border-border rounded-lg" onClick={() => handleEditExterna(item)}>
                          Editar
                        </button>
                        <button type="button" className="px-3 py-1.5 text-xs border border-rose-300 text-rose-700 rounded-lg" onClick={() => handleDeleteExterna(item.id)}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </ProfileWizardLayout>
  )
}
