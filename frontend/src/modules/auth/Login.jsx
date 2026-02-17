import { useState } from 'react'
import { Briefcase, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../utils/showToast'
import './auth.css'

export default function Login() {
  const navigate = useNavigate()
  const { login, loading } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = await login(identifier.trim(), password)
    if (!result.ok) {
      setError(result.message)
      showToast({
        type: result.toastType || 'error',
        message: result.message || 'No se pudo iniciar sesion.',
      })
      return
    }

    setError('')
    showToast({
      type: 'success',
      message: 'Inicio de sesion exitoso.',
    })
    if (result.user?.must_change_password) {
      showToast({
        type: 'warning',
        message: 'Tu clave es temporal. Cambiala de inmediato desde tu perfil o soporte.',
      })
    }
    const role = result.user?.rol
    const nextPath =
      role === 'empresa'
        ? '/app/company'
        : role === 'administrador' || role === 'superadmin'
        ? '/app/admin'
        : '/app/candidate/vacantes'
    navigate(nextPath)
  }

  return (
    <div className="auth-page">
      <Header />
      <div className="auth-shell">
        <section className="auth-hero">
          <div className="auth-logo">
            <span className="auth-logo-badge">
              <Briefcase size={22} />
            </span>
            EmpleoFacil
          </div>

          <h1 className="auth-hero-title">Tu proximo empleo empieza aqui.</h1>
          <p className="auth-hero-subtitle">
            Postula en minutos y conecta con empresas verificadas que estan contratando hoy.
          </p>
        </section>

        <section className="auth-card" aria-label="Formulario de inicio de sesion">
          <div className="auth-card-header">
            <h2>Bienvenido de vuelta</h2>
            <p>Inicia sesion para revisar tus postulaciones y mensajes.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="identifier">Correo electronico o cedula</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="nombre@correo.com o 1234567890"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Contrasena</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Tu contrasena segura"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="auth-actions">
              <label className="auth-remember">
                <input type="checkbox" name="remember" />
                Recordarme
              </label>
              <Link className="auth-link" to="/request-password">
                Olvidaste tu contrasena?
              </Link>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesion'}
            </button>
          </form>

          <p className="auth-footer">
            No tienes cuenta? <Link className="auth-link" to="/register">Crear cuenta</Link>
          </p>

          <ul className="auth-trust-list">
            <li className="auth-trust-item">
              <ShieldCheck size={16} />
              Tus datos estan protegidos y solo se comparten con empresas verificadas.
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
