import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import LandingPage from './modules/Landing/LandingPage'
import Login from './modules/auth/Login'
import Register from './modules/auth/Register'
import RequestPassword from './modules/auth/RequestPassword'
import CandidateVacantes from './modules/candidate/CandidateVacantes'
import CandidatePostulaciones from './modules/candidate/CandidatePostulaciones'
import CandidateProfile from './modules/candidate/CandidateProfile'
import ProfileDatosBasicos from './modules/candidate/ProfileDatosBasicos'
import ProfilePreferencias from './modules/candidate/ProfilePreferencias'
import ProfileExperiencia from './modules/candidate/ProfileExperiencia'
import ProfileFormacion from './modules/candidate/ProfileFormacion'
import ProfileIdiomas from './modules/candidate/ProfileIdiomas'
import ProfileDocumentos from './modules/candidate/ProfileDocumentos'
import ProfileDatosPersonales from './modules/candidate/ProfileDatosPersonales'
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
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/request-password" element={<RequestPassword />} />
          <Route path="/app/candidate/vacantes" element={<CandidateVacantes />} />
          <Route path="/app/candidate/postulaciones" element={<CandidatePostulaciones />} />
          <Route path="/app/candidate/perfil" element={<CandidateProfile />} />
          <Route path="/perfil/datos-basicos" element={<ProfileDatosBasicos />} />
          <Route path="/perfil/preferencias" element={<ProfilePreferencias />} />
          <Route path="/perfil/experiencia" element={<ProfileExperiencia />} />
          <Route path="/perfil/formacion" element={<ProfileFormacion />} />
          <Route path="/perfil/idiomas" element={<ProfileIdiomas />} />
          <Route path="/perfil/documentos" element={<ProfileDocumentos />} />
          <Route path="/perfil/datos-personales" element={<ProfileDatosPersonales />} />
          <Route path="/app/company" element={<CompanyHome />} />
          <Route path="/app/company/vacantes" element={<CompanyVacantes />} />
          <Route path="/app/company/candidatos" element={<CompanyCandidatos />} />
          <Route path="/app/company/mensajes" element={<CompanyMensajes />} />
          <Route path="/app/company/empresa" element={<CompanyPerfil />} />
          <Route path="/app/admin" element={<AdminHome />} />
          <Route path="/app/admin/roles" element={<AdminRolesPermisos />} />
          <Route path="/app/admin/cuentas" element={<AdminCuentas />} />
          <Route path="/app/admin/auditoria" element={<AdminAuditoria />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
