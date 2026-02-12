import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('auth_user')
    const storedToken = sessionStorage.getItem('auth_token')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        sessionStorage.removeItem('auth_user')
      }
    }
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      const payload = await apiRequest(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password })
        },
        false
      )

      const nextUser = payload?.user || null
      const nextToken = payload?.token || ''

      if (!nextUser || !nextToken) {
        return { ok: false, message: 'Respuesta invalida del servidor.' }
      }

      setUser(nextUser)
      setToken(nextToken)
      sessionStorage.setItem('auth_user', JSON.stringify(nextUser))
      sessionStorage.setItem('auth_token', nextToken)
      return { ok: true, user: nextUser }
    } catch (error) {
      return { ok: false, message: error.message || 'No se pudo iniciar sesion.' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken('')
    sessionStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
  }

  const value = useMemo(
    () => ({ user, token, login, logout, loading }),
    [user, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
