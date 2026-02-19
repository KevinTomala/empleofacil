import { apiRequest } from './api'

function parseCompanyPerfilError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.code || error?.message || ''
  const normalized = String(code).toLowerCase()

  if (code === 'NETWORK_ERROR' || normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'No se pudo conectar con el servidor. Verifica que el backend este activo e intenta nuevamente.'
  }

  if (code === 'INVALID_JSON_RESPONSE') {
    return 'El backend respondio con un formato invalido. Revisa que la ruta API exista y que el servidor este actualizado.'
  }

  if (code === 'INVALID_PAYLOAD') return 'Revisa los datos ingresados. Hay campos invalidos.'
  if (code === 'FORBIDDEN') return 'No tienes permisos para editar el perfil de empresa.'
  if (code === 'EMPRESA_NOT_FOUND') return 'No se encontro una empresa asociada a tu cuenta.'
  if (code === 'PROFILE_FETCH_FAILED') return 'No se pudo cargar el perfil de empresa.'
  if (code === 'PROFILE_UPDATE_FAILED') return 'No se pudo guardar el perfil de empresa.'

  return error?.message || fallbackMessage
}

export function getCompanyPerfilErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  return parseCompanyPerfilError(error, fallbackMessage)
}

export async function getMyCompanyPerfil() {
  return apiRequest('/api/company/perfil/me')
}

export async function updateMyCompanyDatosGenerales(payload) {
  return apiRequest('/api/company/perfil/me/datos-generales', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}
