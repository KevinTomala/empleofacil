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
