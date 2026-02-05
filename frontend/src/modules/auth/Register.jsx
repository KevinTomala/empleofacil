import { useState } from 'react'
import { Briefcase, Building2, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import './auth.css'

export default function Register() {
  const [accountType, setAccountType] = useState('candidate')
  const [step, setStep] = useState(1)

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

          {step === 1 ? (
            <>
              <h1 className="auth-hero-title">Crea tu cuenta en minutos.</h1>
              <p className="auth-hero-subtitle">
                Selecciona el tipo de cuenta para personalizar tu experiencia.
              </p>
            </>
          ) : accountType === 'company' ? (
            <>
              <h1 className="auth-hero-title">Encuentra talento verificado hoy.</h1>
              <p className="auth-hero-subtitle">
                Publica vacantes y recibe candidatos alineados a tu perfil de empresa.
              </p>
            </>
          ) : (
            <>
              <h1 className="auth-hero-title">Crea tu perfil y postula hoy mismo.</h1>
              <p className="auth-hero-subtitle">
                Empresas reales, procesos simples, oportunidades verificadas.
              </p>
            </>
          )}
        </section>

        <section className="auth-card" aria-label="Formulario de registro">
          <div className="auth-card-header">
            <h2>Crear cuenta</h2>
            <p>
              {step === 1
                ? 'Esto nos ayuda a personalizar tu experiencia.'
                : 'Crea tu cuenta con lo minimo y completa tu perfil despues.'}
            </p>
          </div>

          {step === 1 && (
            <>
              <div className="auth-type-grid" role="radiogroup" aria-label="Tipo de cuenta">
                <button
                  type="button"
                  className={`auth-type-card ${accountType === 'candidate' ? 'is-active' : ''}`}
                  onClick={() => setAccountType('candidate')}
                  aria-pressed={accountType === 'candidate'}
                >
                  <span className="auth-type-icon">
                    <User size={20} />
                  </span>
                  <span className="auth-type-title">Busco empleo</span>
                  <span className="auth-type-text">Quiero postular a vacantes reales.</span>
                </button>
                <button
                  type="button"
                  className={`auth-type-card ${accountType === 'company' ? 'is-active' : ''}`}
                  onClick={() => setAccountType('company')}
                  aria-pressed={accountType === 'company'}
                >
                  <span className="auth-type-icon">
                    <Building2 size={20} />
                  </span>
                  <span className="auth-type-title">Soy empresa</span>
                  <span className="auth-type-text">Quiero contratar talento verificado.</span>
                </button>
              </div>

              <button className="auth-submit" type="button" onClick={() => setStep(2)}>
                Continuar
              </button>
            </>
          )}

          {step === 2 && (
            <form className="auth-form">
              <div className="auth-step-meta">
                <span className="auth-step-chip">
                  {accountType === 'company' ? 'Cuenta empresa' : 'Cuenta candidato'}
                </span>
                <button
                  type="button"
                  className="auth-step-link"
                  onClick={() => setStep(1)}
                >
                  Cambiar tipo
                </button>
              </div>
              <div className="auth-field">
                <label htmlFor="email">Correo electronico</label>
                <input id="email" name="email" type="email" placeholder="nombre@correo.com" />
              </div>
              <div className="auth-field">
                <label htmlFor="password">Contrasena</label>
                <input id="password" name="password" type="password" placeholder="Crea una contrasena segura" />
              </div>

              <div className="auth-actions">
                <label className="auth-remember">
                  <input type="checkbox" name="terms" />
                  Acepto terminos y condiciones
                </label>
              </div>

              <button className="auth-submit" type="submit">
                Crear cuenta
              </button>
            </form>
          )}

          <p className="auth-footer">
            Ya tienes cuenta? <Link className="auth-link" to="/login">Iniciar sesion</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
