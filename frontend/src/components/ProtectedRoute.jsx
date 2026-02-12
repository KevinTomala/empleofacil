import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles = [], children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles.length && !roles.includes(user.rol)) {
    return <Navigate to="/login" replace />
  }

  return children
}
