'use client';

import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const homeLink = useMemo(() => {
    if (user?.role === 'company') return '/app/company'
    if (user?.role === 'candidate') return '/app/candidate/vacantes'
    return '/'
  }, [user])

  const navLinks = useMemo(() => {
    if (user?.role === 'company') {
      return [
        { href: '/app/company/vacantes', label: 'Vacantes' },
        { href: '/app/company/candidatos', label: 'Candidatos' },
        { href: '/app/company/mensajes', label: 'Mensajes' },
        { href: '/app/company/empresa', label: 'Empresa' },
      ]
    }

    if (user?.role === 'candidate') {
      return [
        { href: '/app/candidate/vacantes', label: 'Vacantes' },
        { href: '/app/candidate/postulaciones', label: 'Postulaciones' },
        { href: '/app/candidate/perfil', label: 'Perfil' },
      ]
    }

    return [
      { href: '/#beneficios-empresas', label: 'Para Empresas' },
      { href: '/#beneficios-candidatos', label: 'Para Candidatos' },
      { href: '/#como-funciona', label: 'Como Funciona' },
      { href: '/#contacto', label: 'Contacto' },
    ]
  }, [user])

  const handleLogout = () => {
    logout()
    setIsProfileOpen(false)
    if (location.pathname.startsWith('/app')) {
      navigate('/')
    }
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'US'

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
              <a
                key={link.href}
                href={link.href}
                className="text-foreground/70 hover:text-foreground transition-colors font-medium text-sm"
              >
                {link.label}
              </a>
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
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      {initials}
                    </span>
                    <span className="text-sm font-medium text-foreground">{user.name}</span>
                  </button>
                  {isProfileOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-background shadow-lg p-1"
                    >
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
                <a
                  key={link.href}
                  href={link.href}
                  className="text-foreground/70 hover:text-foreground transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60">
                      <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {initials}
                      </span>
                      <span className="text-sm font-medium text-foreground">{user.name}</span>
                    </div>
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
