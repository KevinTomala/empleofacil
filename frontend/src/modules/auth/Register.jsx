import { useEffect, useState } from 'react'
import { Briefcase, Building2, User } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import { getAuthErrorMessage, registerAccount } from '../../services/auth.api'
import { showToast } from '../../utils/showToast'
import './auth.css'

export default function Register() {
  const navigate = useNavigate()
  const { login, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const [accountType, setAccountType] = useState('candidate')
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    terms: false
  })

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'company' || type === 'candidate') {
      setAccountType(type)
    }
  }, [searchParams])

  const accountTypeLabel = accountType === 'company' ? 'Cuenta empresa' : 'Cuenta candidato'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || loading) return

    const nombreCompleto = String(form.nombre_completo || '').trim()
    const email = String(form.email || '').trim().toLowerCase()
    const password = String(form.password || '')

    if (!nombreCompleto || !email || !password) {
      const message = 'Debes completar todos los campos requeridos.'
      setError(message)
      showToast({ type: 'warning', message })
      return
    }

    if (!form.terms) {
      const message = 'Debes aceptar terminos y condiciones para continuar.'
      setError(message)
      showToast({ type: 'warning', message })
      return
    }

    try {
      setSubmitting(true)
      await registerAccount({
        nombre_completo: nombreCompleto,
        email,
        password,
        account_type: accountType
      })

      const loginResult = await login(email, password)
      if (!loginResult.ok) {
        const message = loginResult.message || 'Cuenta creada, pero no se pudo iniciar sesion automaticamente.'
        setError(message)
        showToast({ type: loginResult.toastType || 'warning', message })
        navigate('/login', { replace: true })
        return
      }

      setError('')
      showToast({ type: 'success', message: 'Cuenta creada correctamente.' })

      const role = loginResult.user?.rol
      const nextPath =
        role === 'empresa'
          ? '/app/company'
          : role === 'administrador' || role === 'superadmin'
            ? '/app/admin'
            : '/app/candidate/vacantes'
      navigate(nextPath, { replace: true })
    } catch (requestError) {
      const message = getAuthErrorMessage(requestError, 'No se pudo crear la cuenta.')
      setError(message)
      showToast({ type: 'error', message })
    } finally {
      setSubmitting(false)
    }
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
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-step-meta">
                <span className="auth-step-chip">
                  {accountTypeLabel}
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
                <label htmlFor="nombre_completo">
                  {accountType === 'company' ? 'Nombre de la empresa' : 'Nombre completo'}
                </label>
                <input
                  id="nombre_completo"
                  name="nombre_completo"
                  type="text"
                  placeholder={accountType === 'company' ? 'Empresa S.A.' : 'Nombres y apellidos'}
                  value={form.nombre_completo}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre_completo: event.target.value }))}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="email">Correo electronico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nombre@correo.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="password">Contrasena</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Crea una contrasena segura"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>

              <div className="auth-actions">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={form.terms}
                    onChange={(event) => setForm((prev) => ({ ...prev, terms: event.target.checked }))}
                  />
                  Acepto terminos y condiciones
                </label>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button className="auth-submit" type="submit" disabled={submitting || loading}>
                {submitting || loading ? 'Creando cuenta...' : 'Crear cuenta'}
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
