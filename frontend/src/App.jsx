import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './modules/Landing/LandingPage'
import Login from './modules/auth/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
