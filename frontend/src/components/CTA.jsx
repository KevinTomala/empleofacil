import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const AVATAR_FALLBACK_SRC = '/branding/logo.png'
const WATERMARK_LOGO_SRC = '/branding/empleofacil.png'
const TEAM_MEMBERS = [
  {
    name: 'Ing. Bryan Idrovo',
    role: 'Inversionista y Relacionista Empresarial',
    photo: '/branding/team/bryan.jpg',
  },
  {
    name: 'Ing. Kevin Tomalá',
    role: 'Director de proyectos y Desarrollador Full Stack',
    photo: '/branding/team/kevin.jpeg',
  },
  {
    name: 'Ing. Samuel Vera',
    role: 'Desarrollador Full Stack y Soporte Técnico',
    photo: '/branding/team/samuel.png',
  },
]

export default function CTA() {
  const [isRevealVisible, setIsRevealVisible] = useState(false)
  const sectionRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsRevealVisible(true)
      return undefined
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      setIsRevealVisible(true)
      return undefined
    }

    const node = sectionRef.current
    if (!node || !('IntersectionObserver' in window)) {
      setIsRevealVisible(true)
      return undefined
    }

    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsRevealVisible(true)
          observer.disconnect()
        }
      })
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="nosotros"
      ref={sectionRef}
      aria-labelledby="nosotros-title"
      className={`py-16 bg-background company-vertical-reveal scroll-mt-24 ${isRevealVisible ? 'is-visible' : ''}`}
    >
      <div className="page-container">
        <div className="relative bg-linear-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-10 lg:p-12 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
              <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white/10 rounded-full" />
            </div>
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2">
              <div className="w-72 h-72 sm:w-80 sm:h-80 bg-white/10 rounded-full" />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-8 lg:px-14 pointer-events-none">
            <img
              src={WATERMARK_LOGO_SRC}
              alt=""
              aria-hidden="true"
              className="cta-watermark-pulse w-30 sm:w-38 lg:w-48 object-contain"
            />
            <img
              src={WATERMARK_LOGO_SRC}
              alt=""
              aria-hidden="true"
              className="cta-watermark-pulse cta-watermark-pulse-delayed w-22 sm:w-28 lg:w-38 object-contain"
            />
          </div>

          <div className="relative z-10 text-center">
            <span className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-white/15 text-white text-sm font-semibold tracking-wide mb-5">
              Nosotros
            </span>

            <h2
              id="nosotros-title"
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance"
            >
              El equipo detrás de EmpleoFácil
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-7">
              Somos un equipo dedicado a conectar talento con empresas en Ecuador.
              Te acompañamos en cada etapa para que encuentres oportunidades reales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
              {TEAM_MEMBERS.map((member) => (
                <article key={member.name} className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-full p-[3px] bg-white/30">
                    <img
                      src={member.photo}
                      alt={`${member.name} - ${member.role}`}
                      className="w-full h-full rounded-full object-cover bg-white/20"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = AVATAR_FALLBACK_SRC
                      }}
                    />
                  </div>
                  <h3 className="mt-3 text-white font-semibold">{member.name}</h3>
                  <p className="text-white/75 text-sm">{member.role}</p>
                </article>
              ))}
            </div>

            <div className="flex justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                Crear Cuenta
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <p className="text-white/60 text-sm mt-6">
              Registrate y elige si te postulas como candidato o empresa.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
