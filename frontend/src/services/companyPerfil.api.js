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
  if (code === 'FILE_REQUIRED') return 'Selecciona un archivo de logo.'
  if (code === 'INVALID_FILE_TYPE') return 'El logo debe ser JPG, PNG o WEBP.'
  if (code === 'FILE_TOO_LARGE') return 'El logo supera el limite permitido de 5 MB.'
  if (code === 'INTERNAL_ERROR') return 'Error interno del servidor al procesar el logo. Intenta nuevamente.'
  if (code === 'FORBIDDEN') return 'No tienes permisos para editar el perfil de empresa.'
  if (code === 'COMPANY_ACCESS_REQUIRED') return 'Tu usuario no tiene una membresia activa en empresa.'
  if (code === 'COMPANY_ROLE_FORBIDDEN') return 'Tu rol en la empresa no tiene permisos para esta accion.'
  if (code === 'SUPERADMIN_REQUIRED') return 'Esta accion requiere un superadmin.'
  if (code === 'EMPRESA_NOT_FOUND') return 'No se encontro una empresa asociada a tu cuenta.'
  if (code === 'PROFILE_FETCH_FAILED') return 'No se pudo cargar el perfil de empresa.'
  if (code === 'PROFILE_UPDATE_FAILED') return 'No se pudo guardar el perfil de empresa.'
  if (code === 'VERIFICATION_FETCH_FAILED') return 'No se pudo cargar la verificacion.'
  if (code === 'VERIFICATION_UPDATE_FAILED') return 'No se pudo actualizar la verificacion.'
  if (code === 'USER_NOT_FOUND') return 'No existe un usuario con ese correo.'
  if (code === 'USER_ALREADY_LINKED') return 'Ese usuario ya esta vinculado a la empresa.'
  if (code === 'LINK_NOT_FOUND') return 'No se encontro el vinculo de usuario solicitado.'
  if (code === 'LAST_ADMIN_REQUIRED') return 'Debe existir al menos un admin activo en la empresa.'
  if (code === 'INVALID_EMPRESA_USUARIO_ID') return 'El identificador del usuario de empresa es invalido.'
  if (code === 'PROFILE_DELETE_FAILED') return 'No se pudo desactivar la empresa.'

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

export async function uploadMyCompanyLogo(formData) {
  return apiRequest('/api/company/perfil/me/logo', {
    method: 'POST',
    body: formData
  })
}

export async function getMyCompanyVerification() {
  return apiRequest('/api/company/perfil/me/verificacion')
}

export async function requestMyCompanyVerification(payload = {}) {
  return apiRequest('/api/company/perfil/me/verificacion/solicitar', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyCompanyLogo() {
  const attempts = [
    () => apiRequest('/api/company/perfil/me/logo/delete', { method: 'POST' }),
    () => apiRequest('/api/company/perfil/me/logo?action=delete', { method: 'POST' }),
    () => apiRequest('/api/company/perfil/me/logo', { method: 'DELETE' }),
  ]

  let lastError = null

  for (const run of attempts) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      const code = error?.payload?.error || error?.code || error?.message || ''
      const recoverableStatus = error?.status === 404 || error?.status === 405
      const recoverableCode = code === 'FILE_REQUIRED'
      if (recoverableStatus || recoverableCode) {
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('PROFILE_UPDATE_FAILED')
}

export async function listMyCompanyUsers() {
  return apiRequest('/api/company/perfil/me/usuarios')
}

export async function createMyCompanyUser(payload) {
  return apiRequest('/api/company/perfil/me/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMyCompanyUser(empresaUsuarioId, payload) {
  return apiRequest(`/api/company/perfil/me/usuarios/${empresaUsuarioId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyCompanyUser(empresaUsuarioId) {
  return apiRequest(`/api/company/perfil/me/usuarios/${empresaUsuarioId}`, {
    method: 'DELETE'
  })
}

export async function getMyCompanyPreferences() {
  return apiRequest('/api/company/perfil/me/preferencias')
}

export async function updateMyCompanyPreferences(payload) {
  return apiRequest('/api/company/perfil/me/preferencias', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyCompanyProfile() {
  return apiRequest('/api/company/perfil/me', {
    method: 'DELETE'
  })
}
