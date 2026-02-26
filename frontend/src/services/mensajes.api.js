import { apiRequest } from './api'

export async function getMensajesResumen() {
  return apiRequest('/api/mensajes/resumen')
}

export async function listMensajesConversaciones({ page = 1, page_size = 20, q = '', tipo = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(page_size))
  if (q) params.set('q', String(q).trim())
  if (tipo) params.set('tipo', String(tipo).trim())
  return apiRequest(`/api/mensajes/conversaciones?${params.toString()}`)
}

export async function getMensajesConversacion(conversacionId) {
  return apiRequest(`/api/mensajes/conversaciones/${conversacionId}`)
}

export async function listMensajesConversacionItems(conversacionId, { page = 1, page_size = 50 } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(page_size))
  return apiRequest(`/api/mensajes/conversaciones/${conversacionId}/mensajes?${params.toString()}`)
}

export async function createMensajesVacanteConversation({ vacante_id, candidato_id }) {
  return apiRequest('/api/mensajes/conversaciones', {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'vacante',
      vacante_id,
      candidato_id
    })
  })
}

export async function createMensajesDirectConversation({ usuario_objetivo_id }) {
  return apiRequest('/api/mensajes/conversaciones', {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'directa',
      usuario_objetivo_id
    })
  })
}

export async function sendMensajeToConversacion(conversacionId, cuerpo) {
  return apiRequest(`/api/mensajes/conversaciones/${conversacionId}/mensajes`, {
    method: 'POST',
    body: JSON.stringify({ cuerpo })
  })
}

export async function markConversacionRead(conversacionId, mensajeId = null) {
  return apiRequest(`/api/mensajes/conversaciones/${conversacionId}/leer`, {
    method: 'POST',
    body: JSON.stringify({
      mensaje_id: mensajeId
    })
  })
}

export function getMensajesErrorMessage(error, fallback = 'No se pudo completar la accion.') {
  return error?.payload?.error || error?.message || fallback
}
