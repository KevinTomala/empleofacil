import { getAuthToken } from './api'

function parseFileNameFromDisposition(contentDisposition, fallback = 'curriculum.pdf') {
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

export function getPostulacionesErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  const code = error?.payload?.error || error?.code || error?.message || ''

  if (code === 'FORBIDDEN' || code === 'COMPANY_ROLE_FORBIDDEN') {
    return 'No tienes permisos para descargar CV (solo admin/reclutador).'
  }
  if (code === 'POSTULACION_NOT_FOUND' || code === 'ESTUDIANTE_NOT_FOUND') {
    return 'No se encontro la postulacion o el CV.'
  }
  if (code === 'INVALID_PAYLOAD') return 'La postulacion seleccionada no es valida.'
  if (code === 'AUTH_REQUIRED' || code === 'INVALID_TOKEN') return 'Tu sesion expiro. Inicia sesion nuevamente.'
  if (code === 'COMPANY_ACCESS_REQUIRED') return 'Tu usuario no tiene acceso activo a empresa.'

  return error?.message || fallbackMessage
}

export async function downloadPostulacionCurriculumPdf({ postulacionId, defaultFileName = '' }) {
  const id = Number(postulacionId)
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('INVALID_PAYLOAD')
    error.code = 'INVALID_PAYLOAD'
    throw error
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const token = getAuthToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${apiBase}/api/postulaciones/empresa/${id}/curriculum/pdf`, {
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
  const fallbackName = String(defaultFileName || '').trim() || `curriculum_postulacion_${id}.pdf`

  return {
    blob,
    fileName: parseFileNameFromDisposition(response.headers.get('Content-Disposition'), fallbackName)
  }
}
