import { ArrowRight, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

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
    <section ref={sectionRef} className={`py-20 bg-background company-vertical-reveal ${isRevealVisible ? 'is-visible' : ''}`}>
      <div className="page-container">
        <div className="relative bg-linear-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
              Empieza hoy mismo
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              Unete a la plataforma de empleo que conecta talento y empresas en todo Ecuador. 
              Accede a oportunidades reales y seguimiento claro de tus postulaciones.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register?type=candidate"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                Soy Candidato
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/register?type=company"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
              >
                Soy Empresa
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <p className="text-white/60 text-sm mt-6">
              Condiciones claras para candidatos y empresas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
