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
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    throw error
  }

  return data
}
