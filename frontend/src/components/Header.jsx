'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMyPerfil } from '../services/perfilCandidato.api'
import { getMyCompanyPerfil } from '../services/companyPerfil.api'

function toAssetUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const normalized = raw.replace(/\\/g, '/')
  const uploadsIdx = normalized.toLowerCase().indexOf('/uploads/')
  const uploadsPath = uploadsIdx >= 0
    ? normalized.slice(uploadsIdx)
    : normalized.toLowerCase().startsWith('uploads/')
      ? `/${normalized}`
      : normalized
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return uploadsPath.startsWith('/') ? `${apiBase}${uploadsPath}` : `${apiBase}/${uploadsPath}`
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
  const [photoError, setPhotoError] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasCompanyAccess } = useAuth()
  const role = user?.rol
  const userId = Number(user?.id || 0)
  const photoCacheKey = useMemo(
    () => (userId > 0 && role ? `auth_profile_photo_url:${role}:${userId}` : ''),
    [role, userId]
  )

  useEffect(() => {
    if (!photoCacheKey) {
      setProfilePhotoUrl('')
      setPhotoError(false)
      return
    }

    const cached = String(sessionStorage.getItem(photoCacheKey) || '').trim()
    setProfilePhotoUrl(cached)
    setPhotoError(false)
  }, [photoCacheKey])

  useEffect(() => {
    let active = true

    async function loadPhoto() {
      try {
        let nextPhotoUrl = ''

        if (role === 'candidato') {
          const perfil = await getMyPerfil()
          if (!active) return
          const documentos = Array.isArray(perfil?.documentos) ? perfil.documentos : []
          const foto = documentos.find((doc) => doc?.tipo_documento === 'foto' && doc?.ruta_archivo)
          nextPhotoUrl = foto?.ruta_archivo ? toAssetUrl(foto.ruta_archivo) : ''
        } else if (role === 'empresa') {
          const perfilEmpresa = await getMyCompanyPerfil()
          if (!active) return
          const logo = String(perfilEmpresa?.perfil?.logo_url || '').trim()
          nextPhotoUrl = logo ? toAssetUrl(logo) : ''
        } else {
          if (!active) return
          nextPhotoUrl = ''
        }

        if (!active) return

        setProfilePhotoUrl(nextPhotoUrl)
        setPhotoError(false)

        if (photoCacheKey) {
          if (nextPhotoUrl) sessionStorage.setItem(photoCacheKey, nextPhotoUrl)
          else sessionStorage.removeItem(photoCacheKey)
        }
      } catch {
        if (!active) return
        // Conserva foto cacheada si existe para evitar parpadeo/fallback al navegar.
        const cached = photoCacheKey ? String(sessionStorage.getItem(photoCacheKey) || '').trim() : ''
        if (cached) setProfilePhotoUrl(cached)
        setPhotoError(false)
      }
    }

    loadPhoto()

    return () => {
      active = false
    }
  }, [role, userId, photoCacheKey])

  const homeLink = useMemo(() => {
    if (role === 'superadmin' || role === 'administrador') return '/app/admin'
    if (role === 'candidato') return '/app/candidate/vacantes'
    if (role === 'empresa') return hasCompanyAccess ? '/app/company' : '/app/company/inactiva'
    if (hasCompanyAccess) return '/app/company'
    return '/'
  }, [role, hasCompanyAccess])

  const navLinks = useMemo(() => {
    if (role === 'superadmin' || role === 'administrador') {
      return [
        { href: '/app/admin', label: 'Resumen' },
        { href: '/app/admin/mensajes', label: 'Mensajes' },
        { href: '/app/admin/roles', label: 'Roles' },
        { href: '/app/admin/cuentas', label: 'Cuentas' },
        { href: '/app/admin/solicitudes', label: 'Solicitudes' },
        { href: '/app/admin/mapeo-empresas', label: 'Mapeo empresas' },
        { href: '/app/admin/importaciones', label: 'Importaciones' },
        { href: '/app/admin/auditoria', label: 'Auditoría' },
      ]
    }

    if (role === 'empresa') {
      if (!hasCompanyAccess) {
        return [{ href: '/app/company/inactiva', label: 'Reactivacion' }]
      }

      return [
        { href: '/app/company/vacantes', label: 'Vacantes' },
        { href: '/app/company/candidatos', label: 'Candidatos' },
        { href: '/app/company/mensajes', label: 'Mensajes' },
        { href: '/app/company/empresa', label: 'Empresa' },
      ]
    }

    if (role === 'candidato') {
      const links = [
        { href: '/app/candidate/empresas', label: 'Empresas' },
        { href: '/app/candidate/personas', label: 'Personas' },
        { href: '/app/candidate/vacantes', label: 'Vacantes' },
        { href: '/app/candidate/publicaciones', label: 'Publicar' },
        { href: '/app/candidate/postulaciones', label: 'Postulaciones' },
        { href: '/app/candidate/mensajes', label: 'Mensajes' },
        { href: '/app/candidate/perfil', label: 'Perfil' },
      ]
      if (hasCompanyAccess) {
        links.push({ href: '/app/company', label: 'Empresa' })
      }
      return links
    }

    return [
      { href: '/#beneficios-candidatos', label: 'Para Candidatos' },
      { href: '/#beneficios-empresas', label: 'Para Empresas' },
      { href: '/#como-funciona', label: 'Como Funciona' },
      { href: '/#contacto', label: 'Contacto' },
    ]
  }, [role, hasCompanyAccess])

  const handleLogout = () => {
    if (photoCacheKey) sessionStorage.removeItem(photoCacheKey)
    logout()
    setProfilePhotoUrl('')
    setPhotoError(false)
    setIsProfileOpen(false)
    if (location.pathname.startsWith('/app')) {
      navigate('/')
    }
  }

  const goToChangePassword = () => {
    setIsProfileOpen(false)
    setIsMenuOpen(false)
    navigate('/app/change-password')
  }

  const initials = user?.nombre_completo
    ? user.nombre_completo
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'US'

  const showPhoto = Boolean(profilePhotoUrl) && !photoError

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={homeLink} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">
              EmpleoFácil
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith('/app') || link.href.startsWith('/perfil') ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-foreground/70 hover:text-foreground transition-colors font-medium text-sm"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-foreground/70 hover:text-foreground transition-colors font-medium text-sm"
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                    onClick={() => setIsProfileOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={isProfileOpen}
                  >
                    {showPhoto ? (
                      <img
                        src={profilePhotoUrl}
                        alt={`Foto de ${user?.nombre_completo || 'Usuario'}`}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                        onError={() => setPhotoError(true)}
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {initials}
                      </span>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {user?.nombre_completo || 'Usuario'}
                    </span>
                  </button>
                  {isProfileOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-background shadow-lg p-1"
                    >
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                        onClick={goToChangePassword}
                      >
                        Cambiar contrasena
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                        onClick={handleLogout}
                      >
                        Salir
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Iniciar Sesion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                link.href.startsWith('/app') || link.href.startsWith('/perfil') ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-foreground/70 hover:text-foreground transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-foreground/70 hover:text-foreground transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60">
                      {showPhoto ? (
                        <img
                          src={profilePhotoUrl}
                          alt={`Foto de ${user?.nombre_completo || 'Usuario'}`}
                          className="w-8 h-8 rounded-full object-cover border border-border"
                          onError={() => setPhotoError(true)}
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                          {initials}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {user?.nombre_completo || 'Usuario'}
                      </span>
                    </div>
                    <button
                      className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors text-left"
                      onClick={goToChangePassword}
                    >
                      Cambiar contrasena
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-left"
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                    >
                      Salir
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Iniciar Sesion
                    </Link>
                    <Link
                      to="/register"
                      className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Crear Cuenta
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
