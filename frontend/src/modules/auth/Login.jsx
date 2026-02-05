import { Briefcase, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import './auth.css'

export default function Login() {
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

          <form className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Correo electronico</label>
              <input id="email" name="email" type="email" placeholder="nombre@correo.com" />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Contrasena</label>
              <input id="password" name="password" type="password" placeholder="Tu contrasena segura" />
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

            <button className="auth-submit" type="submit">
              Iniciar sesion
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
