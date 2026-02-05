import { ArrowRight, CheckCircle, Users, Building2 } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'

export default function Hero() {
  const handleSvgLoad = useCallback((event) => {
    const svgDoc = event.currentTarget?.contentDocument
    if (!svgDoc) return

    const paths = svgDoc.querySelectorAll('#features path')
    paths.forEach((path) => {
      const hasTitle = path.querySelector('title')
      if (hasTitle) return

      const name = path.getAttribute('name') || path.getAttribute('id')
      if (!name) return

      const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = name
      path.prepend(title)
    })
  }, [])

  return (
    <section className="bg-background">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-accent">
                Plataforma lider en Ecuador
              </span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Conectamos talento con empresas de todo tipo
            </h1>

            <p className="text-lg text-foreground/70 leading-relaxed max-w-xl">
              La plataforma de empleo para publicar vacantes y encontrar candidatos verificados. 
              Personas con experiencia y empresas que buscan talento calificado.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register?type=candidate"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Soy Candidato
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/register?type=company"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground font-medium rounded-lg hover:bg-muted transition-colors border border-border"
              >
                Soy Empresa
                <Building2 className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Perfiles verificados</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Validaciones de experiencia</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>100% gratuito</span>
              </div>
            </div>
          </div>

          {/* Right Content - Interactive Map */}
          <div className="relative">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
              <div className="hero-map-frame mx-auto">
                <object
                  data="/ec.svg"
                  type="image/svg+xml"
                  aria-label="Mapa interactivo de Ecuador"
                  className="hero-map-svg"
                  onLoad={handleSvgLoad}
                />
              </div>
            </div>
            <p className="text-xs text-foreground/60 mt-2 text-center">
              Pasa el cursor por una provincia para resaltarla
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
