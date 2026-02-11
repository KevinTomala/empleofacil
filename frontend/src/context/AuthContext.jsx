import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const MOCK_USERS = [
  {
    email: 'candidato@gmail.com',
    password: 'candidato',
    role: 'candidate',
    name: 'Candidato',
  },
  {
    email: 'empresa@gmail.com',
    password: 'empresa',
    role: 'company',
    name: 'Empresa',
  },
  {
    email: 'root@gmail.com',
    password: 'root',
    role: 'root',
    name: 'Root Admin',
  },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('auth_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        sessionStorage.removeItem('auth_user')
      }
    }
  }, [])

  const login = (email, password) => {
    const match = MOCK_USERS.find(
      (item) => item.email === email && item.password === password
    )

    if (!match) {
      return { ok: false, message: 'Credenciales invalidas.' }
    }

    setUser(match)
    sessionStorage.setItem('auth_user', JSON.stringify(match))
    return { ok: true, user: match }
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('auth_user')
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
