import { Briefcase, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import './auth.css'

export default function RequestPassword() {
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

          <h1 className="auth-hero-title">Recupera el acceso en minutos.</h1>
          <p className="auth-hero-subtitle">
            Enviaremos un enlace seguro a tu correo para restablecer tu contraseña.
          </p>
        </section>

        <section className="auth-card" aria-label="Solicitud de recuperacion de contrasena">
          <div className="auth-card-header">
            <h2>Recuperar contraseña</h2>
            <p>Ingresa tu correo electronico y te enviaremos el enlace.</p>
          </div>

          <form className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Correo electronico</label>
              <div className="auth-input-icon">
                <Mail size={18} />
                <input id="email" name="email" type="email" placeholder="nombre@correo.com" />
              </div>
            </div>

            <button className="auth-submit" type="submit">
              Enviar enlace
            </button>
          </form>

          <p className="auth-footer">
            Volver a <Link className="auth-link" to="/login">Iniciar sesion</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
