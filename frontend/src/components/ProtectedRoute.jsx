import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles = [], children }) {
  const { user, ready, hasCompanyAccess, companyAccessReady } = useAuth()
  const location = useLocation()
  const requireCompanyAccess = Boolean(location.pathname.startsWith('/app/company'))

  if (!ready) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireCompanyAccess && !companyAccessReady) {
    return null
  }

  if (requireCompanyAccess && !hasCompanyAccess) {
    return <Navigate to="/login" replace />
  }

  if (roles.length && !roles.includes(user.rol)) {
    return <Navigate to="/login" replace />
  }

  return children
}
