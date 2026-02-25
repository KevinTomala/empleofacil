import { useEffect, useMemo, useState } from 'react'
import FormDropdown from '../../components/FormDropdown'
import './admin.css'
import { Building2, Link2, Link2Off, RefreshCw, Search, Shuffle } from 'lucide-react'
import Header from '../../components/Header'
import { showToast } from '../../utils/showToast'
import {
  desvincularEmpresaOrigen,
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

function isManualSource(item) {
  return String(item?.tipo_origen || item?.origen || '').trim() === 'manual_empleofacil'
}

function getOrigenRef(item) {
  if (item?.origen_ref) return String(item.origen_ref)
  if (item?.origen === 'ademy' && item?.origen_empresa_id) return `ademy:${item.origen_empresa_id}`
  return ''
}

function getOrigenDisplayName(item) {
  if (item?.nombre_origen) return item.nombre_origen
  if (item?.origen === 'ademy' && item?.origen_empresa_id) return `Empresa ADEMY #${item.origen_empresa_id}`
  return 'Empresa sin nombre'
}

function getOrigenMeta(item) {
  if (item?.origen === 'ademy' && item?.origen_empresa_id) return `Origen ID: ${item.origen_empresa_id}`
  if (isManualSource(item)) return 'Origen: EmpleoFacil (manual)'
  return 'Origen: N/D'
}

function hasDetectedNames(item) {
  return !isManualSource(item) && String(item?.nombres_origen_detectados || '').trim() !== ''
}

export default function AdminEmpresasMapeo() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [estado, setEstado] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [selectedOrigenRef, setSelectedOrigenRef] = useState(null)
  const [selectedOrigenRefs, setSelectedOrigenRefs] = useState([])
  const [empresaQuery, setEmpresaQuery] = useState('')
  const [empresasLocales, setEmpresasLocales] = useState([])
  const [empresasLoading, setEmpresasLoading] = useState(false)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selectedItem = useMemo(
    () => items.find((item) => getOrigenRef(item) === selectedOrigenRef) || null,
    [items, selectedOrigenRef]
  )
  const selectedCount = selectedOrigenRefs.length
  const allVisibleRefs = useMemo(() => items.map((item) => getOrigenRef(item)).filter(Boolean), [items])
  const allVisibleSelected = useMemo(
    () => allVisibleRefs.length > 0 && allVisibleRefs.every((ref) => selectedOrigenRefs.includes(ref)),
    [allVisibleRefs, selectedOrigenRefs]
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
      setSelectedOrigenRefs((prev) => {
        const allowed = new Set(nextItems.map((item) => getOrigenRef(item)).filter(Boolean))
        return prev.filter((ref) => allowed.has(ref))
      })
      if (!nextItems.length) {
        setSelectedOrigenRef(null)
      } else if (!nextItems.some((item) => getOrigenRef(item) === selectedOrigenRef)) {
        const first = nextItems[0]
        setSelectedOrigenRef(getOrigenRef(first))
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
      setSelectedEmpresaId('')
      return
    }
    setSelectedEmpresaId(selectedItem?.empresa_id ? String(selectedItem.empresa_id) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.origen_ref, selectedItem?.origen_empresa_id])

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    setPage(1)
    setSearchApplied(searchText.trim())
  }

  const handleSelectItem = (item) => {
    setSelectedOrigenRef(getOrigenRef(item))
    setSelectedEmpresaId(item?.empresa_id ? String(item.empresa_id) : '')
  }

  const toggleItemSelection = (itemRef) => {
    if (!itemRef) return
    setSelectedOrigenRefs((prev) => (
      prev.includes(itemRef)
        ? prev.filter((ref) => ref !== itemRef)
        : [...prev, itemRef]
    ))
  }

  const toggleSelectAllVisible = () => {
    if (!allVisibleRefs.length) return
    if (allVisibleSelected) {
      setSelectedOrigenRefs([])
      return
    }
    setSelectedOrigenRefs(allVisibleRefs)
  }

  const handleVincular = async () => {
    const refs = selectedCount > 0
      ? selectedOrigenRefs
      : (selectedItem ? [getOrigenRef(selectedItem)] : [])
    if (!refs.length || !selectedEmpresaId) {
      showToast({ type: 'warning', message: 'Selecciona una empresa local antes de vincular.' })
      return
    }

    try {
      setSaving(true)
      let ok = 0
      let failed = 0
      let experienciasActualizadas = 0

      for (const ref of refs) {
        const item = items.find((row) => getOrigenRef(row) === ref)
        try {
          const response = await vincularEmpresaOrigen(ref, {
            empresa_id: Number(selectedEmpresaId),
            nombre_origen: item?.nombre_origen || null,
          })
          ok += 1
          experienciasActualizadas += Number(response?.experiencias_actualizadas || 0)
        } catch {
          failed += 1
        }
      }

      if (failed > 0 && ok > 0) {
        showToast({
          type: 'warning',
          message: `Vinculadas ${ok} empresas. Fallaron ${failed}. Experiencias actualizadas: ${experienciasActualizadas}.`,
        })
      } else if (failed > 0) {
        showToast({
          type: 'error',
          message: `No se pudo vincular ninguna empresa (${failed} errores).`,
        })
      } else {
        showToast({
          type: 'success',
          message: `Vinculadas ${ok} empresas. Experiencias actualizadas: ${experienciasActualizadas}.`,
        })
      }

      setSelectedOrigenRefs([])
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
    if (isManualSource(selectedItem)) {
      showToast({ type: 'warning', message: 'Los origenes manuales no se pueden descartar; usa vincular o renombrar.' })
      return
    }

    try {
      setSaving(true)
      const response = await descartarEmpresaOrigen(getOrigenRef(selectedItem), {
        nombre_origen: selectedItem.nombre_origen || null,
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

  const handleDesvincular = async () => {
    if (!selectedItem) return
    if (isManualSource(selectedItem)) {
      showToast({ type: 'warning', message: 'Los origenes manuales no soportan desvinculacion desde este mapeo.' })
      return
    }

    try {
      setSaving(true)
      const response = await desvincularEmpresaOrigen(getOrigenRef(selectedItem))
      showToast({
        type: 'success',
        message: `Desvinculada. Experiencias actualizadas: ${response?.experiencias_actualizadas ?? 0}.`,
      })
      await loadMapeo()
    } catch (error) {
      showToast({
        type: 'error',
        message: getIntegracionEmpresasErrorMessage(error, 'No se pudo desvincular la empresa.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const closeConfirmModal = () => {
    if (saving) return
    setConfirmAction(null)
  }

  const confirmConfig = useMemo(() => {
    if (!confirmAction || !selectedItem) return null
    if (confirmAction === 'desvincular') {
      return {
        title: 'Desvincular empresa',
        message: 'Se eliminara el vinculo local y el origen volvera a estado pendiente para reasignarlo. Continuar?',
        confirmLabel: 'Desvincular',
      }
    }
    if (confirmAction === 'descartar') {
      return {
        title: 'Descartar empresa origen',
        message: 'Se marcara como descartada y se quitara la vinculacion local de las experiencias asociadas. Continuar?',
        confirmLabel: 'Descartar',
      }
    }
    return null
  }, [confirmAction, selectedItem])

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    if (confirmAction === 'desvincular') {
      await handleDesvincular()
    } else if (confirmAction === 'descartar') {
      await handleDescartar()
    }
    setConfirmAction(null)
  }

  return (
    <div className="admin-scope min-h-screen bg-secondary">
      <Header />
      <main className="page-container pt-10 pb-16 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Shuffle className="w-4 h-4" /> Integracion de origenes
              </span>
              <h1 className="admin-title font-heading text-2xl sm:text-3xl font-bold">
                Mapeo de empresas de experiencia
              </h1>
              <p className="text-sm text-foreground/70 max-w-2xl">
                Vincula empresas origen (ADEMY o registradas manualmente por candidatos) con empresas locales de EmpleoFacil.
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
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Buscar por nombre origen, empresa local o ID origen"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <button type="submit" className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 text-foreground/70" aria-label="Buscar">
                <Search className="w-4 h-4" />
              </button>
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
            <div className="flex items-center justify-between gap-2 text-xs text-foreground/70">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                />
                Seleccionar todos (pagina)
              </label>
              <span>{selectedCount} seleccionados</span>
            </div>
            {loading ? <p className="text-sm text-foreground/70">Cargando mapeos...</p> : null}
            {!loading && !items.length ? (
              <p className="text-sm text-foreground/70">No hay registros para el filtro seleccionado.</p>
            ) : null}
            <div className="admin-list space-y-3">
              {items.map((item) => (
                <button
                  key={getOrigenRef(item) || item.id}
                  className={`w-full text-left border rounded-xl p-4 ${
                    getOrigenRef(selectedItem) === getOrigenRef(item) ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleSelectItem(item)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 accent-primary"
                        checked={selectedOrigenRefs.includes(getOrigenRef(item))}
                        onChange={(event) => {
                          event.stopPropagation()
                          toggleItemSelection(getOrigenRef(item))
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <div>
                        <p className="font-semibold text-sm">{getOrigenDisplayName(item)}</p>
                        <p className="text-xs text-foreground/60 mt-1">{getOrigenMeta(item)}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[item.estado] || STATUS_STYLES.pendiente}`}>
                      {formatStatus(item.estado)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-foreground/60">
                    <p>Experiencias: {Number(item.experiencias_total || 0)}</p>
                    <p>Sin vinculo local: {Number(item.experiencias_sin_vinculo || 0)}</p>
                    {hasDetectedNames(item) ? (
                      <p className="truncate">Detectado en experiencias: {item.nombres_origen_detectados}</p>
                    ) : null}
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
                <div className="space-y-2">
                  <label className="text-xs text-foreground/60">Buscar empresa local</label>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground/60">
                    <input
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="Nombre, RUC o email"
                      value={empresaQuery}
                      onChange={(event) => setEmpresaQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          loadEmpresasLocales(empresaQuery)
                        }
                      }}
                    />
                    <button
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 text-foreground/70"
                      type="button"
                      onClick={() => loadEmpresasLocales(empresaQuery)}
                      disabled={empresasLoading}
                      aria-label="Buscar empresa local"
                    >
                      <Search className="w-4 h-4" />
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
                      className={`w-full text-left border rounded-lg p-3 ${String(selectedEmpresaId) === String(empresa.id) ? 'border-primary bg-primary/5' : 'border-border'
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
                    {selectedCount > 0 ? `Vincular seleccionados (${selectedCount})` : 'Vincular'}
                  </button>
                  {!isManualSource(selectedItem) && String(selectedItem.estado || '') === 'vinculada' ? (
                    <button
                      className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                      type="button"
                      onClick={() => setConfirmAction('desvincular')}
                      disabled={saving}
                    >
                      <Link2Off className="w-4 h-4" />
                      Desvincular
                    </button>
                  ) : null}
                  {!isManualSource(selectedItem) ? (
                    <button
                      className="px-4 py-2 border border-rose-300 text-rose-700 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                      type="button"
                      onClick={() => setConfirmAction('descartar')}
                      disabled={saving || String(selectedItem.estado || '') === 'descartada'}
                    >
                      <Link2Off className="w-4 h-4" />
                      Descartar
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </aside>
        </section>
      </main>
      {confirmConfig ? (
        <div className="fixed inset-0 z-50 bg-black/45 px-4 py-6 flex items-center justify-center" role="presentation" onClick={closeConfirmModal}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 space-y-4 shadow-xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-semibold">{confirmConfig.title}</h3>
              <p className="text-sm text-foreground/70">{confirmConfig.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-border rounded-lg text-sm text-foreground/70 disabled:opacity-50"
                onClick={closeConfirmModal}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white disabled:opacity-50"
                onClick={handleConfirmAction}
                disabled={saving}
              >
                {saving ? 'Procesando...' : confirmConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
