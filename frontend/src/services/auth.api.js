import { apiRequest } from './api'

function parseAuthError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.code || error?.message || ''
  const normalized = String(code).toLowerCase()

  if (code === 'NETWORK_ERROR' || normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'No se pudo conectar con el servidor. Verifica que el backend este activo e intenta nuevamente.'
  }

  if (code === 'MISSING_FIELDS') return 'Debes completar todos los campos requeridos.'
  if (code === 'WEAK_PASSWORD') return 'La nueva contrasena debe tener al menos 8 caracteres.'
  if (code === 'PASSWORD_REUSE_NOT_ALLOWED') return 'La nueva contrasena no puede ser igual a la actual.'
  if (code === 'INVALID_CURRENT_PASSWORD') return 'La contrasena actual no es correcta.'
  if (code === 'USER_INACTIVE') return 'Tu cuenta esta inactiva. Contacta a soporte.'
  if (code === 'AUTH_REQUIRED' || code === 'INVALID_TOKEN') return 'Tu sesion expiro. Inicia sesion nuevamente.'
  if (code === 'USER_NOT_FOUND') return 'No se encontro el usuario.'

  return error?.message || fallbackMessage
}

export function getAuthErrorMessage(error, fallbackMessage = 'No se pudo actualizar la contrasena.') {
  return parseAuthError(error, fallbackMessage)
}

export async function changeMyPassword({ current_password, new_password }) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password })
  })
}

