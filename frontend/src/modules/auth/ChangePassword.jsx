import { useMemo, useState } from 'react'
import { Briefcase, Lock, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { useAuth } from '../../context/AuthContext'
import { changeMyPassword, getAuthErrorMessage } from '../../services/auth.api'
import { showToast } from '../../utils/showToast'
import './auth.css'

function getFallbackPathByRole(role, hasCompanyAccess) {
  if (role === 'empresa' || hasCompanyAccess) return '/app/company'
  if (role === 'administrador' || role === 'superadmin') return '/app/admin'
  return '/app/candidate/vacantes'
}

export default function ChangePassword() {
  const navigate = useNavigate()
  const { user, hasCompanyAccess } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fallbackPath = useMemo(
    () => getFallbackPathByRole(user?.rol, hasCompanyAccess),
    [user?.rol, hasCompanyAccess]
  )

  const onCancel = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallbackPath)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const current = String(currentPassword || '')
    const next = String(newPassword || '')
    const confirm = String(confirmPassword || '')

    if (!current || !next || !confirm) {
      const message = 'Debes completar todos los campos requeridos.'
      setError(message)
      showToast({ type: 'warning', message })
      return
    }

    if (next.length < 8) {
      const message = 'La nueva contrasena debe tener al menos 8 caracteres.'
      setError(message)
      showToast({ type: 'warning', message })
      return
    }

    if (next === current) {
      const message = 'La nueva contrasena no puede ser igual a la actual.'
      setError(message)
      showToast({ type: 'warning', message })
      return
    }

    if (confirm !== next) {
      const message = 'La confirmacion de contrasena no coincide.'
      setError(message)
      showToast({ type: 'warning', message })
      return
    }

    try {
      setSaving(true)
      setError('')
      await changeMyPassword({
        current_password: current,
        new_password: next
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast({
        type: 'success',
        message: 'Contrasena actualizada correctamente.'
      })
    } catch (err) {
      const message = getAuthErrorMessage(err, 'No se pudo actualizar la contrasena.')
      setError(message)
      showToast({ type: 'error', message })
    } finally {
      setSaving(false)
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

          <h1 className="auth-hero-title">Actualiza tu contrasena de acceso.</h1>
          <p className="auth-hero-subtitle">
            Protege tu cuenta cambiando tu clave cuando lo necesites.
          </p>

          <div className="auth-hero-cards">
            <article className="auth-hero-card">
              <strong>
                <ShieldCheck size={16} />
                Recomendacion de seguridad
              </strong>
              <span>Usa una clave de minimo 8 caracteres y evita reutilizar contrasenas anteriores.</span>
            </article>
          </div>
        </section>

        <section className="auth-card" aria-label="Formulario para cambiar contrasena">
          <div className="auth-card-header">
            <h2>Cambiar contrasena</h2>
            <p>Confirma tu clave actual y define una nueva contrasena.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="current_password">Contrasena actual</label>
              <div className="auth-input-icon">
                <Lock size={18} />
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Ingresa tu contrasena actual"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="new_password">Nueva contrasena</label>
              <div className="auth-input-icon">
                <Lock size={18} />
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Crea una nueva contrasena"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm_new_password">Confirmar nueva contrasena</label>
              <div className="auth-input-icon">
                <Lock size={18} />
                <input
                  id="confirm_new_password"
                  name="confirm_new_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite tu nueva contrasena"
                />
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Actualizar contrasena'}
            </button>
          </form>

          <div className="auth-actions" style={{ marginTop: '0.75rem' }}>
            <button className="auth-link" type="button" onClick={onCancel}>
              Cancelar
            </button>
            <Link className="auth-link" to={fallbackPath}>
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

