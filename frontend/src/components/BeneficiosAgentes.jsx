import { useEffect, useRef, useState } from 'react'
import { Briefcase, TrendingUp, Bell, Award, Calendar, Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'

const beneficios = [
  {
    icon: Briefcase,
    title: 'Oportunidades Verificadas',
    description: 'Accede a vacantes reales de empresas establecidas que buscan talento.'
  },
  {
    icon: TrendingUp,
    title: 'Mejora tu Perfil',
    description: 'Destaca tu experiencia, certificaciones y habilidades para ser mas visible ante empleadores.'
  },
  {
    icon: Bell,
    title: 'Alertas de Empleo',
    description: 'Recibe notificaciones cuando se publiquen vacantes que coincidan con tu perfil.'
  },
  {
    icon: Award,
    title: 'Credencial Validada',
    description: 'Tu documentacion y experiencia validada generan confianza ante las empresas.'
  },
  {
    icon: Calendar,
    title: 'Flexibilidad Laboral',
    description: 'Encuentra trabajos temporales, fijos, de medio tiempo o para eventos especiales.'
  },
  {
    icon: MapPin,
    title: 'Cerca de Ti',
    description: 'Filtra oportunidades por ubicacion y encuentra trabajo en tu zona.'
  }
]

function formatModalidadLabel(value) {
  const map = {
    presencial: 'Presencial',
    remoto: 'Remoto',
    hibrido: 'Hibrido'
  }
  return map[String(value || '').toLowerCase()] || 'Modalidad N/D'
}

function formatPagoVacante(monto, periodo) {
  const numeric = Number(monto)
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Pago a convenir'
  const amount = new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(numeric)
  return `$${amount}/${periodo === 'dia' ? 'dia' : 'mes'}`
}

function parseLocalDateTime(value) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value

  const raw = String(value).trim()
  if (!raw) return null

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (match) {
    const year = Number(match[1])
    const monthIndex = Number(match[2]) - 1
    const day = Number(match[3])
    const hour = Number(match[4] || 0)
    const minute = Number(match[5] || 0)
    const second = Number(match[6] || 0)
    const date = new Date(year, monthIndex, day, hour, minute, second)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatFechaPublicacionParts(value) {
  const date = parseLocalDateTime(value)
  if (!date) return { dateLabel: 'Reciente', timeLabel: '--:--' }

  const now = new Date()
  const isToday = (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )

  const timePart = new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)

  if (isToday) return { dateLabel: 'Hoy', timeLabel: timePart }

  const datePart = new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short'
  }).format(date)

  return { dateLabel: datePart, timeLabel: timePart }
}

export default function BeneficiosAgentes() {
  const [vacantes, setVacantes] = useState([])
  const [loadingVacantes, setLoadingVacantes] = useState(true)
  const [isRevealVisible, setIsRevealVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    let active = true

    async function fetchLatestVacantes() {
      try {
        setLoadingVacantes(true)
        const data = await apiRequest('/api/vacantes/public/latest?limit=3', {}, false)
        if (!active) return
        setVacantes(Array.isArray(data?.items) ? data.items : [])
      } catch {
        if (!active) return
        setVacantes([])
      } finally {
        if (!active) return
        setLoadingVacantes(false)
      }
    }

    fetchLatestVacantes()
    return () => {
      active = false
    }
  }, [])

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
      ref={sectionRef}
      id="beneficios-candidatos"
      className={`py-20 bg-white candidate-diagonal-reveal ${isRevealVisible ? 'is-visible' : ''}`}
    >
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <span className="inline-block px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
              Para Candidatos
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
              Tu proxima oportunidad laboral esta aqui
            </h2>
            <p className="text-foreground/70 text-lg mb-8">
              Si estas buscando empleo, EmpleoFácil es tu plataforma para conectar con empresas que valoran tu experiencia.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {beneficios.map((beneficio, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                    <beneficio.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {beneficio.title}
                    </h3>
                    <p className="text-sm text-foreground/70">
                      {beneficio.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                Registrarme como Candidato
              </Link>
            </div>
          </div>

          {/* Right - Visual */}
          <div className="relative">
            <div className="bg-linear-to-br from-primary/5 to-accent/5 rounded-3xl p-8 border border-border">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Ultimas vacantes disponibles</h3>
                <p className="text-xs text-foreground/60 mt-1">Conoce oportunidades recientes y crea tu perfil para aplicar.</p>
              </div>

              <div className="space-y-4">
                {loadingVacantes && [1, 2, 3].map((key) => (
                  <div key={key} className="bg-background p-4 rounded-xl border border-border shadow-sm animate-pulse">
                    <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-2/3 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  </div>
                ))}

                {!loadingVacantes && vacantes.map((vacante) => {
                  const publishedAt = formatFechaPublicacionParts(vacante.fecha_publicacion)
                  return (
                    <article key={vacante.id} className="bg-background p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded mb-2">
                          {formatModalidadLabel(vacante.modalidad)}
                        </span>
                        <h4 className="font-semibold text-foreground leading-tight">{vacante.titulo}</h4>
                        <p className="text-sm text-foreground/70">{vacante.empresa_nombre || 'Empresa'}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">
                        {formatPagoVacante(vacante.pago_monto, vacante.pago_periodo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-foreground/60">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {vacante.ciudad || 'Ciudad N/D'}, {vacante.provincia || 'Provincia N/D'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {publishedAt.dateLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="w-3 h-3" /> {publishedAt.timeLabel}
                      </span>
                    </div>
                  </article>
                  )
                })}

                {!loadingVacantes && vacantes.length === 0 && (
                  <div className="bg-background p-4 rounded-xl border border-border shadow-sm text-sm text-foreground/70">
                    No hay vacantes activas para mostrar en este momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
