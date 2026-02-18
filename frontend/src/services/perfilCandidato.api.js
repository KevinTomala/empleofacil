import { apiRequest } from './api'

function parsePerfilError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.message || ''

  if (code === 'INVALID_PAYLOAD') return 'Revisa los datos ingresados e intenta nuevamente.'
  if (code === 'INVALID_CANDIDATO_ID') return 'El candidato seleccionado no es valido.'
  if (code === 'CANDIDATO_NOT_FOUND') return 'No se encontro informacion de perfil para este candidato.'
  if (code === 'FORBIDDEN') return 'No tienes permisos para realizar esta accion.'
  if (code === 'PROFILE_FETCH_FAILED') return 'No se pudo cargar el perfil en este momento.'
  if (code === 'PROFILE_UPDATE_FAILED') return 'No se pudo guardar la informacion en este momento.'
  if (code === 'INVALID_IDIOMA_ID') return 'El idioma seleccionado no es valido.'
  if (code === 'IDIOMA_NOT_FOUND') return 'No se encontro el idioma seleccionado.'
  if (code === 'INVALID_EXPERIENCIA_ID') return 'La experiencia seleccionada no es valida.'
  if (code === 'EXPERIENCIA_NOT_FOUND') return 'No se encontro la experiencia seleccionada.'
  if (code === 'INVALID_DOCUMENTO_ID') return 'El documento seleccionado no es valido.'
  if (code === 'DOCUMENTO_NOT_FOUND') return 'No se encontro el documento seleccionado.'
  if (code === 'INVALID_TIPO_DOCUMENTO') return 'Tipo de documento invalido.'
  if (code === 'INVALID_FILE_TYPE') return 'Tipo de archivo no permitido. Usa PDF o imagen.'
  if (code === 'FILE_TOO_LARGE') return 'El archivo supera el limite permitido.'
  if (code === 'FILE_REQUIRED') return 'Debes seleccionar un archivo.'

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

export async function getMyIdiomas() {
  return apiRequest('/api/perfil/me/idiomas')
}

export async function createMyIdioma(payload) {
  return apiRequest('/api/perfil/me/idiomas', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMyIdioma(idiomaId, payload) {
  return apiRequest(`/api/perfil/me/idiomas/${idiomaId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyIdioma(idiomaId) {
  return apiRequest(`/api/perfil/me/idiomas/${idiomaId}`, {
    method: 'DELETE'
  })
}

export async function getIdiomasByCandidatoId(candidatoId) {
  return apiRequest(`/api/perfil/${candidatoId}/idiomas`)
}

export async function getMyExperiencia() {
  return apiRequest('/api/perfil/me/experiencia')
}

export async function createMyExperiencia(payload) {
  return apiRequest('/api/perfil/me/experiencia', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMyExperiencia(experienciaId, payload) {
  return apiRequest(`/api/perfil/me/experiencia/${experienciaId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyExperiencia(experienciaId) {
  return apiRequest(`/api/perfil/me/experiencia/${experienciaId}`, {
    method: 'DELETE'
  })
}

export async function getExperienciaByCandidatoId(candidatoId) {
  return apiRequest(`/api/perfil/${candidatoId}/experiencia`)
}

export async function getMyDocumentos() {
  return apiRequest('/api/perfil/me/documentos')
}

export async function createMyDocumento(formData) {
  return apiRequest('/api/perfil/me/documentos', {
    method: 'POST',
    body: formData
  })
}

export async function updateMyDocumento(documentoId, payload) {
  return apiRequest(`/api/perfil/me/documentos/${documentoId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyDocumento(documentoId) {
  return apiRequest(`/api/perfil/me/documentos/${documentoId}`, {
    method: 'DELETE'
  })
}

export async function getDocumentosByCandidatoId(candidatoId) {
  return apiRequest(`/api/perfil/${candidatoId}/documentos`)
}
