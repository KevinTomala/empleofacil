import { apiRequest } from './api'

function parseIntegracionEmpresasError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.message || ''
  const normalized = String(code).toLowerCase()

  if (code === 'FORBIDDEN') return 'No tienes permisos para esta accion.'
  if (code === 'MAPPING_TABLE_NOT_FOUND') return 'Falta ejecutar la migracion de mapeo de empresas ADEMY.'
  if (code === 'MAPPING_SCHEMA_OUTDATED') return 'La base de datos no tiene las columnas nuevas de mapeo.'
  if (code === 'INVALID_ORIGEN_EMPRESA_ID') return 'El identificador de empresa origen no es valido.'
  if (code === 'NOMBRE_ORIGEN_REQUIRED') return 'Debes ingresar el nombre de empresa en ADEMY.'
  if (code === 'EMPRESA_ID_REQUIRED') return 'Debes seleccionar una empresa local.'
  if (code === 'EMPRESA_NOT_FOUND') return 'La empresa local no existe o no esta activa.'
  if (code === 'MAPPING_LIST_FAILED') return 'No se pudo cargar el listado de mapeos.'
  if (code === 'MAPPING_NAME_UPDATE_FAILED') return 'No se pudo guardar el nombre de empresa origen.'
  if (code === 'MAPPING_UPDATE_FAILED') return 'No se pudo vincular la empresa.'
  if (code === 'MAPPING_DISCARD_FAILED') return 'No se pudo descartar la empresa origen.'
  if (code === 'EMPRESAS_SEARCH_FAILED') return 'No se pudo buscar empresas locales.'
  if (normalized.includes('failed to fetch')) return 'No se pudo conectar con el servidor.'

  return error?.message || fallbackMessage
}

export function getIntegracionEmpresasErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  return parseIntegracionEmpresasError(error, fallbackMessage)
}

export async function listEmpresasMapeo(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.append(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/api/integraciones/ademy/empresas-mapeo${suffix}`)
}

export async function searchEmpresasLocales(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.append(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/api/integraciones/ademy/empresas-locales${suffix}`)
}

export async function vincularEmpresaOrigen(origenEmpresaId, payload = {}) {
  return apiRequest(`/api/integraciones/ademy/empresas-mapeo/${origenEmpresaId}/vincular`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function actualizarNombreEmpresaOrigen(origenEmpresaId, payload = {}) {
  return apiRequest(`/api/integraciones/ademy/empresas-mapeo/${origenEmpresaId}/nombre`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function descartarEmpresaOrigen(origenEmpresaId, payload = {}) {
  return apiRequest(`/api/integraciones/ademy/empresas-mapeo/${origenEmpresaId}/descartar`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
