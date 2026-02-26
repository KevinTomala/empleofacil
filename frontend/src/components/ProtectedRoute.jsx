import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles = [], children, requireCompanyAccess = null }) {
  const { user, ready, hasCompanyAccess, companyAccessReady } = useAuth()
  const location = useLocation()
  const routeNeedsCompanyAccess = Boolean(location.pathname.startsWith('/app/company'))
  const shouldRequireCompanyAccess =
    typeof requireCompanyAccess === 'boolean' ? requireCompanyAccess : routeNeedsCompanyAccess

  if (!ready) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search || ''}` }} />
  }

  if (shouldRequireCompanyAccess && !companyAccessReady) {
    return null
  }

  if (shouldRequireCompanyAccess && !hasCompanyAccess) {
    if (user.rol === 'empresa') {
      return <Navigate to="/app/company/inactiva" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (roles.length && !roles.includes(user.rol)) {
    return <Navigate to="/login" replace />
  }

  return children
}
