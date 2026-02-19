const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function getAuthToken() {
  return sessionStorage.getItem('auth_token') || ''
}

export async function apiRequest(path, options = {}, withAuth = true) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  }

  if (withAuth) {
    const token = getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  const text = await response.text()
  let data = null
  let parseError = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      parseError = error
      data = { raw: text }
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    throw error
  }

  if (parseError) {
    const error = new Error('INVALID_JSON_RESPONSE')
    error.status = response.status
    error.payload = { error: 'INVALID_JSON_RESPONSE', raw: text }
    throw error
  }

  return data
}
