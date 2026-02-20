import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import LandingPage from './modules/Landing/LandingPage'
import Login from './modules/auth/Login'
import Register from './modules/auth/Register'
import RequestPassword from './modules/auth/RequestPassword'
import CandidateVacantes from './modules/candidate/CandidateVacantes'
import CandidatePostulaciones from './modules/candidate/CandidatePostulaciones'
import CandidateProfile from './modules/candidate/CandidateProfile'
import ProfilePerfil from './modules/candidate/ProfilePerfil'
import ProfileDomicilio from './modules/candidate/ProfileDomicilio'
import ProfilePreferencias from './modules/candidate/ProfilePreferencias'
import ProfileExperiencia from './modules/candidate/ProfileExperiencia'
import ProfileFormacion from './modules/candidate/ProfileFormacion'
import ProfileIdiomas from './modules/candidate/ProfileIdiomas'
import ProfileDocumentos from './modules/candidate/ProfileDocumentos'
import ProfileSalud from './modules/candidate/ProfileSalud'
import CompanyHome from './modules/company/CompanyHome'
import CompanyVacantes from './modules/company/CompanyVacantes'
import CompanyCandidatos from './modules/company/CompanyCandidatos'
import CompanyMensajes from './modules/company/CompanyMensajes'
import CompanyPerfil from './modules/company/CompanyPerfil'
import AdminHome from './modules/admin/AdminHome'
import AdminRolesPermisos from './modules/admin/AdminRolesPermisos'
import AdminCuentas from './modules/admin/AdminCuentas'
import AdminAuditoria from './modules/admin/AdminAuditoria'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function ScrollToHash() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToHash />
        <Toaster />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/request-password" element={<RequestPassword />} />
          <Route
            path="/app/candidate/vacantes"
            element={
              <ProtectedRoute roles={['candidato', 'superadmin']}>
                <CandidateVacantes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/candidate/postulaciones"
            element={
              <ProtectedRoute roles={['candidato', 'superadmin']}>
                <CandidatePostulaciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/candidate/perfil"
            element={
              <ProtectedRoute roles={['candidato']}>
                <CandidateProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/perfil"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfilePerfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/domicilio"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfileDomicilio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/movilidad"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfilePreferencias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/salud"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfileSalud />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/idiomas"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfileIdiomas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/experiencia"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfileExperiencia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/formacion"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfileFormacion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/documentos"
            element={
              <ProtectedRoute roles={['candidato']}>
                <ProfileDocumentos />
              </ProtectedRoute>
            }
          />
          <Route path="/perfil/datos-basicos" element={<Navigate to="/perfil/perfil" replace />} />
          <Route path="/perfil/datos-personales" element={<Navigate to="/perfil/perfil" replace />} />
          <Route path="/perfil/preferencias" element={<Navigate to="/perfil/movilidad" replace />} />
          <Route
            path="/app/company"
            element={
              <ProtectedRoute>
                <CompanyHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/company/vacantes"
            element={
              <ProtectedRoute>
                <CompanyVacantes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/company/candidatos"
            element={
              <ProtectedRoute>
                <CompanyCandidatos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/company/mensajes"
            element={
              <ProtectedRoute>
                <CompanyMensajes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/company/empresa"
            element={
              <ProtectedRoute>
                <CompanyPerfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/admin"
            element={
              <ProtectedRoute roles={['administrador', 'superadmin']}>
                <AdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/admin/roles"
            element={
              <ProtectedRoute roles={['administrador', 'superadmin']}>
                <AdminRolesPermisos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/admin/cuentas"
            element={
              <ProtectedRoute roles={['administrador', 'superadmin']}>
                <AdminCuentas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/admin/auditoria"
            element={
              <ProtectedRoute roles={['administrador', 'superadmin']}>
                <AdminAuditoria />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/admin/candidatos"
            element={
              <ProtectedRoute roles={['administrador', 'superadmin']}>
                <CompanyCandidatos />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
