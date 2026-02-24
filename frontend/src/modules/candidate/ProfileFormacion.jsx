import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormDropdown from '../../components/FormDropdown'
import { showToast } from '../../utils/showToast'
import {
  createMyEducacionGeneralItem,
  createMyFormacionCertificado,
  createMyFormacion,
  deleteMyFormacionCertificado,
  deleteMyEducacionGeneralItem,
  deleteMyFormacion,
  getCentrosCapacitacion,
  getMyEducacionGeneralItems,
  getMyFormacion,
  getPerfilErrorMessage,
  updateMyEducacionGeneralItem,
  updateMyFormacionCertificado,
  updateMyFormacion,
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

const subtipoExternaOptions = [
  { value: 'curso', label: 'Curso' },
  { value: 'ministerio_i', label: 'Ministerio del Interior' },
  { value: 'ministerio', label: 'Ministerio del Trabajo (SETEC)' },
  { value: 'chofer_profesional', label: 'Chofer profesional' },
]

const subtipoLabelMap = {
  curso: 'Curso',
  ministerio_i: 'Ministerio del Interior',
  ministerio: 'Ministerio del Trabajo (SETEC)',
  chofer_profesional: 'Chofer profesional',
}

const filtroExternaOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'curso', label: 'Curso' },
  { value: 'ministerio_i', label: 'Ministerio del Interior' },
  { value: 'ministerio', label: 'Ministerio (SETEC)' },
  { value: 'chofer_profesional', label: 'Chofer profesional' },
]

function getInitialExternaForm() {
  return {
    subtipo_formacion: 'curso',
    centro_cliente_id: null,
    institucion: '',
    entidad_emisora: '',
    numero_registro: '',
    nombre_programa: '',
    titulo_obtenido: '',
    fecha_aprobacion: '',
    fecha_emision: '',
    fecha_vencimiento: '',
  }
}

function getExternaFormBySubtipo(subtipo) {
  const next = {
    ...getInitialExternaForm(),
    subtipo_formacion: subtipo || 'curso',
  }

  if (next.subtipo_formacion === 'ministerio') {
    next.institucion = 'Ministerio del Trabajo'
    next.entidad_emisora = 'Ministerio del Trabajo / SETEC'
  }

  if (next.subtipo_formacion === 'ministerio_i') {
    next.institucion = 'Ministerio del Interior'
    next.entidad_emisora = 'Ministerio del Interior'
  }

  return next
}

function getSubtipoFormacionLabel(subtipo) {
  return subtipoLabelMap[subtipo] || 'Formacion externa'
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
  const [centrosCapacitacion, setCentrosCapacitacion] = useState([])
  const [editingExternaId, setEditingExternaId] = useState(null)
  const [externaForm, setExternaForm] = useState(getInitialExternaForm())
  const [externaFilter, setExternaFilter] = useState('all')
  const [uploadingCertificadoId, setUploadingCertificadoId] = useState(null)

  const externaItems = useMemo(
    () => formaciones.filter((item) => item.categoria_formacion === 'externa'),
    [formaciones]
  )
  const filteredExternaItems = useMemo(() => {
    if (externaFilter === 'all') return externaItems
    return externaItems.filter((item) => item.subtipo_formacion === externaFilter)
  }, [externaItems, externaFilter])

  const externaMode = externaForm.subtipo_formacion || 'curso'
  const isEditingExterna = Boolean(editingExternaId)

  const isSectionComplete = useMemo(() => {
    const hasAcademica = academicaItems.length > 0
    return hasAcademica || externaItems.length > 0
  }, [academicaItems, externaItems])

  async function loadData() {
    const [educacionResponse, formacionResponse, centrosResponse] = await Promise.all([
      getMyEducacionGeneralItems(),
      getMyFormacion(),
      getCentrosCapacitacion({ limit: 100 })
    ])

    setAcademicaItems(educacionResponse?.items || [])
    setFormaciones(formacionResponse?.items || [])
    setCentrosCapacitacion(centrosResponse?.items || [])
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

  const handleChangeExternaSubtipo = (subtipo) => {
    if (isEditingExterna) return
    setExternaForm(getExternaFormBySubtipo(subtipo))
  }

    const handleExternaInstitucionChange = (value) => {
      const text = value || ''
      const matched = centrosCapacitacion.find((item) => item.nombre?.toLowerCase() === text.trim().toLowerCase())
      setExternaForm((prev) => ({
        ...prev,
        institucion: text,
        centro_cliente_id: matched?.id || null,
      }))
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
      if (!externaForm.centro_cliente_id && !externaForm.institucion.trim()) {
        showToast({ type: 'warning', message: 'Debes indicar institucion o seleccionar un centro.' })
        return
      }

      const payload = {
        categoria_formacion: 'externa',
        subtipo_formacion: externaForm.subtipo_formacion,
        centro_cliente_id: externaForm.centro_cliente_id || null,
        institucion: externaForm.institucion.trim() || null,
        entidad_emisora: externaForm.subtipo_formacion === 'curso' ? null : (externaForm.entidad_emisora.trim() || null),
        numero_registro: externaForm.numero_registro.trim() || null,
        nombre_programa: externaForm.nombre_programa.trim() || null,
        titulo_obtenido: externaForm.titulo_obtenido.trim() || null,
        fecha_aprobacion: externaForm.fecha_aprobacion || null,
        fecha_emision: externaForm.fecha_emision || null,
        fecha_vencimiento: externaForm.fecha_vencimiento || null,
      }

      try {
        setSaving(true)

        if (editingExternaId) {
          await updateMyFormacion(editingExternaId, payload)
        } else {
          await createMyFormacion(payload)
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
        centro_cliente_id: item.centro_cliente_id || null,
        institucion: item.institucion || '',
        entidad_emisora: item.entidad_emisora || '',
        numero_registro: item.numero_registro || '',
        nombre_programa: item.nombre_programa || '',
        titulo_obtenido: item.titulo_obtenido || '',
        fecha_aprobacion: item.fecha_aprobacion || '',
        fecha_emision: item.fecha_emision || '',
        fecha_vencimiento: item.fecha_vencimiento || '',
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

    const handleUploadCertificadoCurso = async (item, file) => {
      if (!file) return;

      const formData = new FormData();
      formData.append('archivo', file);
      if (item?.fecha_emision) formData.append('fecha_emision', item.fecha_emision);
      formData.append('descripcion', item?.nombre_programa || item?.titulo_obtenido || 'Certificado de curso');

      try {
        setUploadingCertificadoId(item.id);
        if (item?.certificado_curso?.id) {
          await updateMyFormacionCertificado(item.id, formData);
        } else {
          await createMyFormacionCertificado(item.id, formData);
        }
        await loadData();
        showToast({ type: 'success', message: 'Certificado de curso guardado.' });
      } catch (error) {
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo subir el certificado de curso.'),
        });
      } finally {
        setUploadingCertificadoId(null);
      }
    };

    const handleDeleteCertificadoCurso = async (item) => {
      try {
        setUploadingCertificadoId(item.id);
        await deleteMyFormacionCertificado(item.id);
        await loadData();
        showToast({ type: 'success', message: 'Certificado de curso eliminado.' });
      } catch (error) {
        showToast({
          type: 'error',
          message: getPerfilErrorMessage(error, 'No se pudo eliminar el certificado de curso.'),
        });
      } finally {
        setUploadingCertificadoId(null);
      }
    };

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
                      Tipo de formacion externa
                      <FormDropdown
                        value={externaForm.subtipo_formacion}
                        options={subtipoExternaOptions}
                        onChange={handleChangeExternaSubtipo}
                        disabled={isEditingExterna}
                      />
                    </label>
                    {isEditingExterna && (
                      <p className="text-xs text-foreground/60 sm:col-span-2">
                        Para conservar consistencia historica, el tipo no puede cambiarse en edicion.
                      </p>
                    )}
                    {(externaMode === 'ministerio' || externaMode === 'ministerio_i') && (
                      <label className="space-y-1 text-sm font-medium text-foreground/80">
                        Entidad emisora
                        <input className="ef-control" type="text" value={externaForm.entidad_emisora} onChange={(event) => setExternaForm((prev) => ({ ...prev, entidad_emisora: event.target.value }))} />
                      </label>
                    )}
                    <label className="space-y-1 text-sm font-medium text-foreground/80">
                      Institucion o centro
                      <input
                        className="ef-control"
                        type="text"
                        list="centros-capacitacion-list"
                        value={externaForm.institucion}
                        onChange={(event) => handleExternaInstitucionChange(event.target.value)}
                        placeholder="Ej: CENDCAP, CENDCAP SUCURSAL, CAPACITAREC"
                      />
                      <datalist id="centros-capacitacion-list">
                        {centrosCapacitacion.map((item) => (
                          <option key={item.id} value={item.nombre} />
                        ))}
                      </datalist>
                      <p className="text-xs text-foreground/60">
                        Puedes seleccionar una sugerencia o escribir una institucion nueva.
                      </p>
                    </label>
                    <label className="space-y-1 text-sm font-medium text-foreground/80">
                      {externaMode === 'chofer_profesional' ? 'Tipo de licencia / programa' : (externaMode === 'ministerio' || externaMode === 'ministerio_i') ? 'Proceso / perfil ocupacional' : 'Programa'}
                      <input className="ef-control" type="text" value={externaForm.nombre_programa} onChange={(event) => setExternaForm((prev) => ({ ...prev, nombre_programa: event.target.value }))} />
                    </label>
                    {(externaMode === 'curso' || externaMode === 'chofer_profesional') && (
                      <label className="space-y-1 text-sm font-medium text-foreground/80">
                        Titulo
                        <input className="ef-control" type="text" value={externaForm.titulo_obtenido} onChange={(event) => setExternaForm((prev) => ({ ...prev, titulo_obtenido: event.target.value }))} />
                      </label>
                    )}
                    {(externaMode === 'ministerio' || externaMode === 'ministerio_i' || externaMode === 'chofer_profesional') && (
                      <label className="space-y-1 text-sm font-medium text-foreground/80">
                        Numero de registro
                        <input className="ef-control" type="text" value={externaForm.numero_registro} onChange={(event) => setExternaForm((prev) => ({ ...prev, numero_registro: event.target.value }))} />
                      </label>
                    )}
                    <label className="space-y-1 text-sm font-medium text-foreground/80">
                      Fecha aprobacion
                      <input className="ef-control" type="date" value={externaForm.fecha_aprobacion} onChange={(event) => setExternaForm((prev) => ({ ...prev, fecha_aprobacion: event.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-foreground/80">
                      Fecha emision
                      <input className="ef-control" type="date" value={externaForm.fecha_emision} onChange={(event) => setExternaForm((prev) => ({ ...prev, fecha_emision: event.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-foreground/80">
                      Fecha vencimiento
                      <input className="ef-control" type="date" value={externaForm.fecha_vencimiento} onChange={(event) => setExternaForm((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))} />
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
                {!loading && externaItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filtroExternaOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs border ${externaFilter === option.value ? 'bg-primary text-white border-primary' : 'bg-white text-foreground/80 border-border'}`}
                        onClick={() => setExternaFilter(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {!loading && filteredExternaItems.length === 0 && <p className="text-sm text-foreground/70">Sin registros de formacion externa para este filtro.</p>}
                {!loading && filteredExternaItems.length > 0 && (
                  <div className="space-y-2">
                    {filteredExternaItems.map((item) => (
                      <article key={item.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{item.nombre_programa || item.titulo_obtenido || getSubtipoFormacionLabel(item.subtipo_formacion)}</p>
                          <p className="text-xs text-foreground/60">
                            {item.subtipo_formacion === 'ministerio'
                              ? (item.entidad_emisora || 'Ministerio del Trabajo / SETEC')
                              : item.subtipo_formacion === 'ministerio_i'
                                ? (item.entidad_emisora || 'Ministerio del Interior')
                                : (item.institucion || 'Institucion no especificada')}
                            {' | '}
                            Aprobacion: {item.fecha_aprobacion || 'N/D'}
                          </p>
                          <p className="text-xs text-foreground/60 mt-1">
                            Certificado de curso: {item?.certificado_curso?.id ? 'Cargado' : 'Pendiente'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <label className="px-3 py-1.5 text-xs border border-border rounded-lg cursor-pointer">
                            {item?.certificado_curso?.id ? 'Reemplazar certificado' : 'Subir certificado'}
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingCertificadoId === item.id}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                handleUploadCertificadoCurso(item, file);
                              }}
                            />
                          </label>
                          {item?.certificado_curso?.ruta_archivo && (
                            <a
                              href={item.certificado_curso.ruta_archivo}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 text-xs border border-border rounded-lg"
                            >
                              Ver certificado
                            </a>
                          )}
                          {item?.certificado_curso?.id && (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-xs border border-rose-300 text-rose-700 rounded-lg"
                              onClick={() => handleDeleteCertificadoCurso(item)}
                              disabled={uploadingCertificadoId === item.id}
                            >
                              Eliminar certificado
                            </button>
                          )}
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
