import { useEffect, useRef, useState } from 'react'
import { UserPlus, FileText, Search, Handshake } from 'lucide-react'

const pasosAgentes = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Crea tu cuenta',
    description: 'Registrate con tu informacion basica y datos de contacto.'
  },
  {
    step: '02',
    icon: FileText,
    title: 'Completa tu perfil',
    description: 'Agrega tu experiencia, habilidades, certificaciones y referencias.'
  },
  {
    step: '03',
    icon: Search,
    title: 'Explora vacantes',
    description: 'Busca oportunidades que se ajusten a tu perfil y ubicacion.'
  },
  {
    step: '04',
    icon: Handshake,
    title: 'Conecta con empresas',
    description: 'Postula y las empresas interesadas te contactaran directamente.'
  }
]

const pasosEmpresas = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Registra tu empresa',
    description: 'Crea una cuenta empresarial con los datos de tu organizacion.'
  },
  {
    step: '02',
    icon: FileText,
    title: 'Publica vacantes',
    description: 'Describe el puesto, requisitos y tipo de contratacion.'
  },
  {
    step: '03',
    icon: Search,
    title: 'Revisa candidatos',
    description: 'Explora perfiles de candidatos verificados y calificados.'
  },
  {
    step: '04',
    icon: Handshake,
    title: 'Contrata al mejor',
    description: 'Contacta directamente y cierra el proceso de contratacion.'
  }
]

export default function ComoFunciona() {
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
    <section ref={sectionRef} id="como-funciona" className={`py-20 bg-primary text-white como-diagonal-reveal ${isRevealVisible ? 'is-visible' : ''}`}>
      <div className="page-container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-4">
            Como Funciona
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 text-balance">
            Simple, rapido y efectivo
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-lg">
            Ya sea que busques empleo o necesites contratar, el proceso es sencillo.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Para Candidatos */}
          <div>
            <h3 className="font-heading text-xl font-semibold mb-8 text-center lg:text-left">
              Para Candidatos
            </h3>
            <div className="space-y-6">
              {pasosAgentes.map((paso, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <paso.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-accent font-mono text-sm">{paso.step}</span>
                      <h4 className="font-semibold">{paso.title}</h4>
                    </div>
                    <p className="text-white/70 text-sm">{paso.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Para Empresas */}
          <div>
            <h3 className="font-heading text-xl font-semibold mb-8 text-center lg:text-left">
              Para Empresas
            </h3>
            <div className="space-y-6">
              {pasosEmpresas.map((paso, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
                    <paso.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-accent font-mono text-sm">{paso.step}</span>
                      <h4 className="font-semibold">{paso.title}</h4>
                    </div>
                    <p className="text-white/70 text-sm">{paso.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
