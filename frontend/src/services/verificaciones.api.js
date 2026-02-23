import { apiRequest } from './api'

function parseVerificationError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.code || error?.message || ''
  const normalized = String(code).toLowerCase()

  if (code === 'NETWORK_ERROR' || normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'No se pudo conectar con el servidor.'
  }
  if (code === 'FORBIDDEN') return 'No tienes permisos para esta accion.'
  if (code === 'SUPERADMIN_REQUIRED') return 'Esta accion requiere superadmin.'
  if (code === 'INVALID_VERIFICACION_ID') return 'La verificacion seleccionada no es valida.'
  if (code === 'VERIFICACION_NOT_FOUND') return 'No se encontro la verificacion.'
  if (code === 'INVALID_REACTIVATION_ID') return 'La solicitud de reactivacion no es valida.'
  if (code === 'REACTIVATION_NOT_FOUND') return 'No se encontro la solicitud de reactivacion.'
  if (code === 'INVALID_REACTIVATION_STATUS') return 'El estado de reactivacion indicado no es valido.'
  if (code === 'REACTIVATION_ENDPOINT_NOT_FOUND') {
    return 'Tu backend no tiene habilitadas las rutas de reactivacion de empresas. Reinicia/actualiza el backend.'
  }
  if (code === 'INVALID_ESTADO') return 'El estado indicado no es valido.'
  if (code === 'INVALID_NIVEL') return 'El nivel indicado no es valido.'
  if (code === 'MOTIVO_RECHAZO_REQUIRED') return 'Debes indicar un motivo de rechazo.'
  if (code === 'INVALID_EXPIRES_AT') return 'La fecha de vencimiento no es valida.'
  if (code === 'VERIFICATION_FETCH_FAILED') return 'No se pudo cargar verificaciones.'
  if (code === 'VERIFICATION_UPDATE_FAILED') return 'No se pudo actualizar la verificacion.'

  return error?.message || fallbackMessage
}

export function getVerificationErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  return parseVerificationError(error, fallbackMessage)
}

export async function listVerificationAccounts(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.append(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/api/verificaciones/cuentas${suffix}`)
}

export async function getVerificationAccountById(verificacionId, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.append(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/api/verificaciones/cuentas/${verificacionId}${suffix}`)
}

export async function updateVerificationStatus(verificacionId, payload) {
  return apiRequest(`/api/verificaciones/cuentas/${verificacionId}/estado`, {
    method: 'PUT',
    body: JSON.stringify(payload || {})
  })
}

export async function listCompanyReactivationRequests(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.append(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  try {
    return await apiRequest(`/api/verificaciones/reactivaciones/empresas${suffix}`)
  } catch (error) {
    const isNotFound = Number(error?.status) === 404
    const backendCode = String(error?.payload?.error || '').trim()
    if (isNotFound && !backendCode) {
      const wrapped = new Error('REACTIVATION_ENDPOINT_NOT_FOUND')
      wrapped.status = 404
      wrapped.payload = { ...(error?.payload || {}), error: 'REACTIVATION_ENDPOINT_NOT_FOUND' }
      throw wrapped
    }
    throw error
  }
}

export async function updateCompanyReactivationStatus(reactivacionId, payload) {
  try {
    return await apiRequest(`/api/verificaciones/reactivaciones/empresas/${reactivacionId}/estado`, {
      method: 'PUT',
      body: JSON.stringify(payload || {})
    })
  } catch (error) {
    const isNotFound = Number(error?.status) === 404
    const backendCode = String(error?.payload?.error || '').trim()
    if (isNotFound && !backendCode) {
      const wrapped = new Error('REACTIVATION_ENDPOINT_NOT_FOUND')
      wrapped.status = 404
      wrapped.payload = { ...(error?.payload || {}), error: 'REACTIVATION_ENDPOINT_NOT_FOUND' }
      throw wrapped
    }
    throw error
  }
}
