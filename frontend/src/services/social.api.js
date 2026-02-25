import { apiRequest } from './api'

function parseSocialError(error, fallbackMessage) {
  const code = error?.payload?.error || error?.message || ''
  const normalized = String(code).toLowerCase()

  if (code === 'FORBIDDEN') return 'No tienes permisos para esta accion.'
  if (code === 'AUTH_REQUIRED') return 'Debes iniciar sesion.'
  if (code === 'CANDIDATO_NOT_FOUND') return 'No se encontro tu perfil de candidato.'
  if (code === 'INVALID_EMPRESA_ID') return 'El identificador de empresa no es valido.'
  if (code === 'EMPRESA_NOT_FOUND') return 'La empresa no existe o no esta activa.'
  if (code === 'SOCIAL_COMPANIES_LIST_FAILED') return 'No se pudieron cargar las empresas.'
  if (code === 'SOCIAL_COMPANY_PROFILE_FAILED') return 'No se pudo cargar el perfil de empresa.'
  if (code === 'SOCIAL_COMPANY_FOLLOW_FAILED') return 'No se pudo seguir la empresa.'
  if (code === 'SOCIAL_COMPANY_UNFOLLOW_FAILED') return 'No se pudo dejar de seguir la empresa.'
  if (normalized.includes('failed to fetch')) return 'No se pudo conectar con el servidor.'

  return error?.message || fallbackMessage
}

export function getSocialErrorMessage(error, fallbackMessage = 'Ocurrio un error.') {
  return parseSocialError(error, fallbackMessage)
}

export async function listSocialCompanies(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.append(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/api/social/empresas${suffix}`)
}

export async function getSocialCompanyProfile(empresaId) {
  return apiRequest(`/api/social/empresas/${Number(empresaId)}/perfil`)
}

export async function followSocialCompany(empresaId) {
  return apiRequest(`/api/social/empresas/${Number(empresaId)}/seguir`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function unfollowSocialCompany(empresaId) {
  return apiRequest(`/api/social/empresas/${Number(empresaId)}/seguir`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })
}
