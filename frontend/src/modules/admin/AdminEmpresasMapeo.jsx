import { useEffect, useMemo, useState } from 'react'
import './admin.css'
import { Building2, Link2, Link2Off, RefreshCw, Save, Search, Shuffle } from 'lucide-react'
import Header from '../../components/Header'
import { showToast } from '../../utils/showToast'
import {
  actualizarNombreEmpresaOrigen,
  descartarEmpresaOrigen,
  getIntegracionEmpresasErrorMessage,
  listEmpresasMapeo,
  searchEmpresasLocales,
  vincularEmpresaOrigen,
} from '../../services/integracionesEmpresas.api'

const STATUS_STYLES = {
  pendiente: 'bg-amber-100 text-amber-700',
  vinculada: 'bg-emerald-100 text-emerald-700',
  descartada: 'bg-slate-200 text-slate-700',
}

function formatStatus(status) {
  const labelByStatus = {
    pendiente: 'Pendiente',
    vinculada: 'Vinculada',
    descartada: 'Descartada',
  }
  return labelByStatus[String(status || '').trim()] || 'Pendiente'
}

function formatDateShort(value) {
  if (!value) return 'N/A'
  return String(value).slice(0, 10)
}

export default function AdminEmpresasMapeo() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [estado, setEstado] = useState('pendiente')
  const [searchText, setSearchText] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [selectedOrigenEmpresaId, setSelectedOrigenEmpresaId] = useState(null)
  const [empresaQuery, setEmpresaQuery] = useState('')
  const [empresasLocales, setEmpresasLocales] = useState([])
  const [empresasLoading, setEmpresasLoading] = useState(false)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [nombreOrigenInput, setNombreOrigenInput] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selectedItem = useMemo(
    () => items.find((item) => Number(item.origen_empresa_id) === Number(selectedOrigenEmpresaId)) || null,
    [items, selectedOrigenEmpresaId]
  )

  const resumen = useMemo(() => {
    const next = { pendiente: 0, vinculada: 0, descartada: 0 }
    items.forEach((item) => {
      const key = String(item.estado || '').trim()
      if (next[key] !== undefined) next[key] += 1
    })
    return next
  }, [items])

  const loadMapeo = async () => {
    try {
      setLoading(true)
      const data = await listEmpresasMapeo({
        estado: estado || undefined,
        q: searchApplied || undefined,
        page,
        page_size: pageSize,
      })
      const nextItems = Array.isArray(data?.items) ? data.items : []
      setItems(nextItems)
      setTotal(Number(data?.total || 0))
      if (!nextItems.length) {
        setSelectedOrigenEmpresaId(null)
      } else if (!nextItems.some((item) => Number(item.origen_empresa_id) === Number(selectedOrigenEmpresaId))) {
        const first = nextItems[0]
        setSelectedOrigenEmpresaId(Number(first.origen_empresa_id))
        setSelectedEmpresaId(first?.empresa_id ? String(first.empresa_id) : '')
      }
    } catch (error) {
      showToast({
        type: 'error',
        message: getIntegracionEmpresasErrorMessage(error, 'No se pudo cargar el mapeo de empresas.'),
      })
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadEmpresasLocales = async (queryText) => {
    try {
      setEmpresasLoading(true)
      const data = await searchEmpresasLocales({
        q: queryText || undefined,
        limit: 20,
      })
      setEmpresasLocales(Array.isArray(data?.items) ? data.items : [])
    } catch (error) {
      showToast({
        type: 'error',
        message: getIntegracionEmpresasErrorMessage(error, 'No se pudieron cargar empresas locales.'),
      })
      setEmpresasLocales([])
    } finally {
      setEmpresasLoading(false)
    }
  }

  useEffect(() => {
    loadMapeo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, page, searchApplied])

  useEffect(() => {
    if (!selectedItem) {
      setEmpresaQuery('')
      setEmpresasLocales([])
      setSelectedEmpresaId('')
      return
    }
    const initial = selectedItem?.empresa_local_nombre || selectedItem?.nombre_origen || ''
    setEmpresaQuery(initial)
    setSelectedEmpresaId(selectedItem?.empresa_id ? String(selectedItem.empresa_id) : '')
    setNombreOrigenInput(selectedItem?.nombre_origen || '')
    loadEmpresasLocales(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.origen_empresa_id])

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    setPage(1)
    setSearchApplied(searchText.trim())
  }

  const handleSelectItem = (item) => {
    setSelectedOrigenEmpresaId(Number(item.origen_empresa_id))
    setSelectedEmpresaId(item?.empresa_id ? String(item.empresa_id) : '')
    setNombreOrigenInput(item?.nombre_origen || '')
  }

  const handleGuardarNombreOrigen = async () => {
    if (!selectedItem) return
    const nombre = String(nombreOrigenInput || '').trim()
    if (!nombre) {
      showToast({ type: 'warning', message: 'Ingresa el nombre de empresa en ADEMY.' })
      return
    }

    try {
      setSaving(true)
      const response = await actualizarNombreEmpresaOrigen(selectedItem.origen_empresa_id, {
        nombre_origen: nombre,
      })
      showToast({
        type: 'success',
        message: `Nombre guardado. Experiencias actualizadas: ${response?.experiencias_actualizadas ?? 0}.`,
      })
      await loadMapeo()
    } catch (error) {
      showToast({
        type: 'error',
        message: getIntegracionEmpresasErrorMessage(error, 'No se pudo guardar el nombre de origen.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleVincular = async () => {
    if (!selectedItem || !selectedEmpresaId) {
      showToast({ type: 'warning', message: 'Selecciona una empresa local antes de vincular.' })
      return
    }

    try {
      setSaving(true)
      const nombre = String(nombreOrigenInput || '').trim()
      const response = await vincularEmpresaOrigen(selectedItem.origen_empresa_id, {
        empresa_id: Number(selectedEmpresaId),
        nombre_origen: nombre || selectedItem.nombre_origen || null,
      })
      showToast({
        type: 'success',
        message: `Vinculada. Experiencias actualizadas: ${response?.experiencias_actualizadas ?? 0}.`,
      })
      await loadMapeo()
    } catch (error) {
      showToast({
        type: 'error',
        message: getIntegracionEmpresasErrorMessage(error, 'No se pudo vincular la empresa.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDescartar = async () => {
    if (!selectedItem) return
    const ok = window.confirm(
      'Se marcara como descartada y se quitara la vinculacion local de las experiencias asociadas. Continuar?'
    )
    if (!ok) return

    try {
      setSaving(true)
      const nombre = String(nombreOrigenInput || '').trim()
      const response = await descartarEmpresaOrigen(selectedItem.origen_empresa_id, {
        nombre_origen: nombre || selectedItem.nombre_origen || null,
      })
      showToast({
        type: 'success',
        message: `Origen descartado. Experiencias actualizadas: ${response?.experiencias_actualizadas ?? 0}.`,
      })
      await loadMapeo()
    } catch (error) {
      showToast({
        type: 'error',
        message: getIntegracionEmpresasErrorMessage(error, 'No se pudo descartar el origen.'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Shuffle className="w-4 h-4" /> Integracion ADEMY
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Mapeo de empresas de experiencia
              </h1>
              <p className="text-sm text-foreground/70 max-w-2xl">
                Vincula empresas externas reportadas por ADEMY con empresas locales de EmpleoFacil sin crear usuarios reclutadores automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="admin-pill">Pendientes: {resumen.pendiente}</span>
              <span className="admin-pill">Vinculadas: {resumen.vinculada}</span>
              <span className="admin-pill">Descartadas: {resumen.descartada}</span>
            </div>
          </div>
        </section>

        <section className="admin-card p-4">
          <form className="grid lg:grid-cols-[1.1fr_1fr] gap-3" onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60">
              <Search className="w-4 h-4" />
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar por nombre origen, empresa local o ID origen"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70 bg-white"
                value={estado}
                onChange={(event) => {
                  setPage(1)
                  setEstado(event.target.value)
                }}
              >
                <option value="">Estado: todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="vinculada">Vinculada</option>
                <option value="descartada">Descartada</option>
              </select>
              <button className="px-3 py-2 border border-border rounded-lg text-xs text-foreground/70" type="submit">
                Buscar
              </button>
              <button
                className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                type="button"
                onClick={loadMapeo}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </button>
            </div>
          </form>
        </section>

        <section className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Empresas origen</h2>
              <p className="text-xs text-foreground/60">
                {total} total
              </p>
            </div>
            {loading ? <p className="text-sm text-foreground/70">Cargando mapeos...</p> : null}
            {!loading && !items.length ? (
              <p className="text-sm text-foreground/70">No hay registros para el filtro seleccionado.</p>
            ) : null}
            <div className="admin-list space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`w-full text-left border rounded-xl p-4 ${
                    Number(selectedItem?.id) === Number(item.id) ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleSelectItem(item)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{item.nombre_origen || `Empresa ADEMY #${item.origen_empresa_id}`}</p>
                      <p className="text-xs text-foreground/60 mt-1">Origen ID: {item.origen_empresa_id}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[item.estado] || STATUS_STYLES.pendiente}`}>
                      {formatStatus(item.estado)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-foreground/60">
                    <p>Experiencias: {Number(item.experiencias_total || 0)}</p>
                    <p>Sin vinculo local: {Number(item.experiencias_sin_vinculo || 0)}</p>
                    <p>Ultima actualizacion: {formatDateShort(item.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <button
                className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
              >
                Anterior
              </button>
              <span>Pagina {page} de {totalPages}</span>
              <button
                className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50"
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
              >
                Siguiente
              </button>
            </div>
          </div>

          <aside className="admin-card p-5 space-y-4">
            <h2 className="font-heading text-lg font-semibold">Vinculacion local</h2>
            {!selectedItem ? (
              <p className="text-sm text-foreground/70">Selecciona una empresa origen para gestionar su vinculo.</p>
            ) : (
              <>
                <div className="border border-border rounded-xl p-4 space-y-1 text-sm">
                  <p className="font-semibold">{selectedItem.nombre_origen || `Empresa ADEMY #${selectedItem.origen_empresa_id}`}</p>
                  <p className="text-foreground/60">Origen ID: {selectedItem.origen_empresa_id}</p>
                  <p className="text-foreground/60">
                    Vinculo actual: {selectedItem.empresa_local_nombre || 'Sin empresa local'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-foreground/60">Nombre empresa en ADEMY</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-white text-foreground"
                      placeholder={`Empresa ADEMY #${selectedItem.origen_empresa_id}`}
                      value={nombreOrigenInput}
                      onChange={(event) => setNombreOrigenInput(event.target.value)}
                    />
                    <button
                      className="px-3 py-2 border border-border rounded-lg text-xs inline-flex items-center gap-1 disabled:opacity-50"
                      type="button"
                      onClick={handleGuardarNombreOrigen}
                      disabled={saving}
                    >
                      <Save className="w-3.5 h-3.5" />
                      Guardar nombre
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-foreground/60">Buscar empresa local</label>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60">
                    <Search className="w-4 h-4" />
                    <input
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="Nombre, RUC o email"
                      value={empresaQuery}
                      onChange={(event) => setEmpresaQuery(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 border border-border rounded-lg text-xs"
                      type="button"
                      onClick={() => loadEmpresasLocales(empresaQuery)}
                      disabled={empresasLoading}
                    >
                      {empresasLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                    <button
                      className="px-3 py-2 border border-border rounded-lg text-xs"
                      type="button"
                      onClick={() => {
                        setEmpresaQuery(selectedItem.nombre_origen || '')
                        loadEmpresasLocales(selectedItem.nombre_origen || '')
                      }}
                      disabled={empresasLoading}
                    >
                      Sugerir por nombre origen
                    </button>
                  </div>
                </div>

                <div className="border border-border rounded-xl p-3 max-h-72 overflow-auto space-y-2">
                  {!empresasLocales.length ? (
                    <p className="text-xs text-foreground/60">No hay coincidencias para mostrar.</p>
                  ) : null}
                  {empresasLocales.map((empresa) => (
                    <button
                      key={empresa.id}
                      type="button"
                      className={`w-full text-left border rounded-lg p-3 ${
                        String(selectedEmpresaId) === String(empresa.id) ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setSelectedEmpresaId(String(empresa.id))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> {empresa.nombre}
                          </p>
                          <p className="text-xs text-foreground/60 mt-1">
                            RUC: {empresa.ruc || 'N/D'} | Email: {empresa.email || 'N/D'}
                          </p>
                        </div>
                        <span className="text-xs text-foreground/50">#{empresa.id}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                    type="button"
                    onClick={handleVincular}
                    disabled={saving || !selectedEmpresaId}
                  >
                    <Link2 className="w-4 h-4" />
                    Vincular
                  </button>
                  <button
                    className="px-4 py-2 border border-rose-300 text-rose-700 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                    type="button"
                    onClick={handleDescartar}
                    disabled={saving}
                  >
                    <Link2Off className="w-4 h-4" />
                    Descartar
                  </button>
                </div>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}
