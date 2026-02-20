import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [hasCompanyAccess, setHasCompanyAccess] = useState(false)
  const [companyAccessReady, setCompanyAccessReady] = useState(false)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('auth_user')
    const storedToken = sessionStorage.getItem('auth_token')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        const normalized = {
          ...parsed,
          rol: parsed.rol || parsed.role || null,
          nombre_completo: parsed.nombre_completo || parsed.name || null
        }
        setUser(normalized)
        sessionStorage.setItem('auth_user', JSON.stringify(normalized))
      } catch {
        sessionStorage.removeItem('auth_user')
      }
    }
    if (storedToken) {
      setToken(storedToken)
    }
    setReady(true)
  }, [])

  const refreshCompanyAccess = async () => {
    if (!user || !token) {
      setHasCompanyAccess(false)
      setCompanyAccessReady(true)
      return false
    }

    setCompanyAccessReady(false)
    try {
      await apiRequest('/api/company/perfil/me')
      setHasCompanyAccess(true)
      setCompanyAccessReady(true)
      return true
    } catch (error) {
      if (error?.status === 403 || error?.status === 404) {
        setHasCompanyAccess(false)
        setCompanyAccessReady(true)
        return false
      }
      setHasCompanyAccess(false)
      setCompanyAccessReady(true)
      return false
    }
  }

  useEffect(() => {
    if (!ready) return
    refreshCompanyAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, user?.id])

  const login = async (identifier, password) => {
    try {
      setLoading(true)
      const payload = await apiRequest(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ identifier, email: identifier, password })
        },
        false
      )

      const nextUser = payload?.user || null
      const nextToken = payload?.token || ''

      if (!nextUser || !nextToken) {
        return { ok: false, message: 'Respuesta invalida del servidor.' }
      }

      const normalizedUser = {
        ...nextUser,
        rol: nextUser.rol || nextUser.role || null,
        nombre_completo: nextUser.nombre_completo || nextUser.name || null,
        must_change_password: Boolean(nextUser.must_change_password)
      }
      setUser(normalizedUser)
      setToken(nextToken)
      sessionStorage.setItem('auth_user', JSON.stringify(normalizedUser))
      sessionStorage.setItem('auth_token', nextToken)
      return { ok: true, user: normalizedUser }
    } catch (error) {
      return {
        ok: false,
        message: error.message || 'No se pudo iniciar sesion.',
        status: error.status || null,
        code: error.code || null,
        toastType: error.toastType || 'danger'
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken('')
    setHasCompanyAccess(false)
    setCompanyAccessReady(true)
    sessionStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
  }

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      loading,
      ready,
      hasCompanyAccess,
      companyAccessReady
    }),
    [user, token, loading, ready, hasCompanyAccess, companyAccessReady]
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
