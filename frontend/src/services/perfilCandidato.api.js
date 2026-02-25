import { apiRequest, getAuthToken } from './api'

function parsePerfilError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.code || error?.message || ''
  const normalized = String(code).toLowerCase()

  if (code === 'NETWORK_ERROR' || normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'No se pudo conectar con el servidor. Verifica que el backend este activo e intenta nuevamente.'
  }

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
  if (code === 'INVALID_FORMACION_ID') return 'La formacion seleccionada no es valida.'
  if (code === 'FORMACION_NOT_FOUND') return 'No se encontro la formacion seleccionada.'
  if (code === 'FORMACION_CERTIFICADO_NOT_ALLOWED') return 'Solo las formaciones externas permiten certificado de curso.'
  if (code === 'FORMACION_INSTITUCION_REQUIRED') return 'Para formacion externa debes indicar institucion o seleccionar un centro.'
  if (code === 'CENTRO_CAPACITACION_NOT_FOUND') return 'El centro de capacitacion seleccionado no existe.'
  if (code === 'INVALID_EDUCACION_GENERAL_ID') return 'El registro de educacion general no es valido.'
  if (code === 'EDUCACION_GENERAL_NOT_FOUND') return 'No se encontro el registro de educacion general.'
  if (code === 'INVALID_CERTIFICADO_ID') return 'El certificado seleccionado no es valido.'
  if (code === 'CERTIFICADO_NOT_FOUND') return 'No se encontro el certificado seleccionado.'
  if (code === 'INVALID_DOCUMENTO_ID') return 'El documento seleccionado no es valido.'
  if (code === 'DOCUMENTO_NOT_FOUND') return 'No se encontro el documento seleccionado.'
  if (code === 'ESTUDIANTE_NOT_FOUND') return 'No se encontro la hoja de vida del candidato.'
  if (code === 'HOJA_VIDA_FETCH_FAILED') return 'No se pudo cargar la hoja de vida para previsualizar.'
  if (code === 'HOJA_VIDA_PDF_FAILED') return 'No se pudo generar la hoja de vida en PDF.'
  if (code === 'INVALID_TIPO_DOCUMENTO') return 'Tipo de documento invalido.'
  if (code === 'DOCUMENTO_IDENTIDAD_SIDE_REQUIRED') return 'Para cedula debes indicar si es anverso o reverso.'
  if (code === 'DOCUMENTO_IDENTIDAD_SIDE_ALREADY_EXISTS') {
    return 'Ya existe una cedula cargada para ese lado. Edita el registro actual o sube el lado faltante.'
  }
  if (code === 'VERIFICATION_FETCH_FAILED') return 'No se pudo cargar el estado de verificacion.'
  if (code === 'VERIFICATION_UPDATE_FAILED') return 'No se pudo enviar la solicitud de verificacion.'
  if (code === 'CANDIDATE_VERIFICATION_DOCUMENTS_REQUIRED') {
    return 'Debes subir cedula por ambos lados o licencia de conducir para solicitar verificacion.'
  }
  if (code === 'INVALID_FILE_TYPE') return 'Tipo de archivo no permitido. Usa PDF o imagen.'
  if (code === 'FILE_PAGE_LIMIT_EXCEEDED') return 'El certificado PDF debe tener maximo 1 pagina.'
  if (code === 'INVALID_FILE_CONTENT') return 'No se pudo leer el archivo. Verifica que el PDF o imagen sea valido.'
  if (code === 'FILE_TOO_LARGE') return 'El archivo supera el limite permitido.'
  if (code === 'FILE_REQUIRED') return 'Debes seleccionar un archivo.'

  return error?.message || fallbackMessage
}

export function getPerfilErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  return parsePerfilError(error, fallbackMessage)
}

export function normalizeFormacionItem(item) {
  return {
    ...item,
    categoria_ui: item?.categoria_formacion || null,
  }
}

export function normalizeFormacionList(items) {
  if (!Array.isArray(items)) return []
  return items.map(normalizeFormacionItem)
}

export async function getMyPerfil() {
  return apiRequest('/api/perfil/me')
}

function parseFileNameFromDisposition(contentDisposition, fallback = 'hoja_vida.pdf') {
  const raw = String(contentDisposition || '')
  if (!raw) return fallback

  const utf8Match = raw.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/^["']|["']$/g, '') || fallback
    } catch (_error) {
      return utf8Match[1].replace(/^["']|["']$/g, '') || fallback
    }
  }

  const standardMatch = raw.match(/filename="?([^"]+)"?/i)
  if (standardMatch?.[1]) return standardMatch[1].trim() || fallback
  return fallback
}

export async function getMyHojaVidaPdf({ candidatoId, defaultFileName = '' }) {
  const id = Number(candidatoId)
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('INVALID_ESTUDIANTE_ID')
    error.code = 'INVALID_ESTUDIANTE_ID'
    throw error
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const token = getAuthToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${apiBase}/api/hoja-vida/${id}/pdf`, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch (_error) {
      payload = null
    }
    const message = payload?.error || payload?.message || `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    error.code = payload?.error || message
    throw error
  }

  const blob = await response.blob()
  const fallbackName = String(defaultFileName || '').trim() || `${id}.pdf`
  return {
    blob,
    fileName: parseFileNameFromDisposition(response.headers.get('Content-Disposition'), fallbackName)
  }
}

export async function getMyHojaVida({ candidatoId }) {
  const id = Number(candidatoId)
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('INVALID_ESTUDIANTE_ID')
    error.code = 'INVALID_ESTUDIANTE_ID'
    throw error
  }

  return apiRequest(`/api/hoja-vida/${id}`)
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

export async function getMyEducacionGeneralItems() {
  return apiRequest('/api/perfil/me/educacion-general')
}

export async function createMyEducacionGeneralItem(payload) {
  return apiRequest('/api/perfil/me/educacion-general', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMyEducacionGeneralItem(educacionGeneralId, payload) {
  return apiRequest(`/api/perfil/me/educacion-general/${educacionGeneralId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyEducacionGeneralItem(educacionGeneralId) {
  return apiRequest(`/api/perfil/me/educacion-general/${educacionGeneralId}`, {
    method: 'DELETE'
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

export async function getEmpresasExperiencia({ search = '', limit = 30 } = {}) {
  const params = new URLSearchParams()
  if (search && String(search).trim()) params.set('search', String(search).trim())
  if (Number.isFinite(Number(limit))) params.set('limit', String(Number(limit)))
  const query = params.toString()
  const response = await apiRequest(`/api/perfil/empresas-experiencia${query ? `?${query}` : ''}`)
  return {
    ...response,
    items: Array.isArray(response?.items) ? response.items : []
  }
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

export async function getMyExperienciaCertificado(experienciaId) {
  return apiRequest(`/api/perfil/me/experiencia/${experienciaId}/certificado`)
}

export async function createMyExperienciaCertificado(experienciaId, formData) {
  return apiRequest(`/api/perfil/me/experiencia/${experienciaId}/certificado`, {
    method: 'POST',
    body: formData
  })
}

export async function updateMyExperienciaCertificado(experienciaId, formData) {
  return apiRequest(`/api/perfil/me/experiencia/${experienciaId}/certificado`, {
    method: 'PUT',
    body: formData
  })
}

export async function deleteMyExperienciaCertificado(experienciaId) {
  return apiRequest(`/api/perfil/me/experiencia/${experienciaId}/certificado`, {
    method: 'DELETE'
  })
}

export async function getMyFormacion() {
  const response = await apiRequest('/api/perfil/me/formacion')
  return {
    ...response,
    items: normalizeFormacionList(response?.items)
  }
}

export async function getCentrosCapacitacion({ search = '', limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (search && String(search).trim()) params.set('search', String(search).trim())
  if (Number.isFinite(Number(limit))) params.set('limit', String(Number(limit)))
  const query = params.toString()
  const response = await apiRequest(`/api/perfil/centros-capacitacion${query ? `?${query}` : ''}`)
  return {
    ...response,
    items: Array.isArray(response?.items) ? response.items : []
  }
}

export async function createMyFormacion(payload) {
  return apiRequest('/api/perfil/me/formacion', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateMyFormacion(formacionId, payload) {
  return apiRequest(`/api/perfil/me/formacion/${formacionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteMyFormacion(formacionId) {
  return apiRequest(`/api/perfil/me/formacion/${formacionId}`, {
    method: 'DELETE'
  })
}

export async function getFormacionByCandidatoId(candidatoId) {
  const response = await apiRequest(`/api/perfil/${candidatoId}/formacion`)
  return {
    ...response,
    items: normalizeFormacionList(response?.items)
  }
}

export async function getMyFormacionCertificado(formacionId) {
  return apiRequest(`/api/perfil/me/formacion/${formacionId}/certificado`)
}

export async function createMyFormacionCertificado(formacionId, formData) {
  return apiRequest(`/api/perfil/me/formacion/${formacionId}/certificado`, {
    method: 'POST',
    body: formData
  })
}

export async function updateMyFormacionCertificado(formacionId, formData) {
  return apiRequest(`/api/perfil/me/formacion/${formacionId}/certificado`, {
    method: 'PUT',
    body: formData
  })
}

export async function deleteMyFormacionCertificado(formacionId) {
  return apiRequest(`/api/perfil/me/formacion/${formacionId}/certificado`, {
    method: 'DELETE'
  })
}

export async function getMyDocumentos() {
  return apiRequest('/api/perfil/me/documentos')
}

export async function getMyCandidateVerification() {
  return apiRequest('/api/perfil/me/verificacion')
}

export async function requestMyCandidateVerification(payload = {}) {
  return apiRequest('/api/perfil/me/verificacion/solicitar', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  })
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
