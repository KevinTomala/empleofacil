import { apiRequest } from './api'

function parsePerfilError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.message || ''

  if (code === 'INVALID_PAYLOAD') return 'Revisa los datos ingresados e intenta nuevamente.'
  if (code === 'INVALID_CANDIDATO_ID') return 'El candidato seleccionado no es valido.'
  if (code === 'CANDIDATO_NOT_FOUND') return 'No se encontro informacion de perfil para este candidato.'
  if (code === 'FORBIDDEN') return 'No tienes permisos para realizar esta accion.'
  if (code === 'PROFILE_FETCH_FAILED') return 'No se pudo cargar el perfil en este momento.'
  if (code === 'PROFILE_UPDATE_FAILED') return 'No se pudo guardar la informacion en este momento.'

  return error?.message || fallbackMessage
}

export function getPerfilErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  return parsePerfilError(error, fallbackMessage)
}

export async function getMyPerfil() {
  return apiRequest('/api/perfil/me')
}

export async function updateMyDatosBasicos(payload) {
  return apiRequest('/api/perfil/me/datos-basicos', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function updateMyContacto(payload) {
  return apiRequest('/api/perfil/me/contacto', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function updateMyDomicilio(payload) {
  return apiRequest('/api/perfil/me/domicilio', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function updateMySalud(payload) {
  return apiRequest('/api/perfil/me/salud', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function updateMyLogistica(payload) {
  return apiRequest('/api/perfil/me/logistica', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function updateMyEducacion(payload) {
  return apiRequest('/api/perfil/me/educacion', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function getPerfilById(candidatoId) {
  return apiRequest(`/api/perfil/${candidatoId}`)
}
