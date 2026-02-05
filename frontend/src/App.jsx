import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import LandingPage from './modules/Landing/LandingPage'
import Login from './modules/auth/Login'
import Register from './modules/auth/Register'
import RequestPassword from './modules/auth/RequestPassword'
import CandidateVacantes from './modules/candidate/CandidateVacantes'
import CandidatePostulaciones from './modules/candidate/CandidatePostulaciones'
import CandidateProfile from './modules/candidate/CandidateProfile'
import CompanyHome from './modules/company/CompanyHome'
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
          <Route path="/app/company" element={<CompanyHome />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
