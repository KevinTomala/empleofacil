import { ArrowRight, CheckCircle, Building2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'

const HERO_TITLE = 'Conectamos talento con empresas de todo tipo.'
const HERO_SUBTITLE = 'La plataforma de empleo para publicar vacantes y encontrar candidatos verificados. Personas con experiencia y empresas que buscan talento calificado.'
const HERO_CHECK_ITEMS = [
  'Perfiles verificados',
  'Validaciones de experiencia',
  'Vacantes verificadas',
]

function normalizeProvinceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Hero() {
  const navigate = useNavigate()
  const [provinceCountRows, setProvinceCountRows] = useState([])
  const [isMapInteracting, setIsMapInteracting] = useState(false)
  const [animatedSubtitle, setAnimatedSubtitle] = useState('')
  const [isSubtitleTypingDone, setIsSubtitleTypingDone] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [isIntroDone, setIsIntroDone] = useState(false)
  const [isTitleVisible, setIsTitleVisible] = useState(true)
  const [isSubtitleTypingEnabled, setIsSubtitleTypingEnabled] = useState(false)
  const [areActionsVisible, setAreActionsVisible] = useState(false)
  const [areChecksInView, setAreChecksInView] = useState(false)
  const svgDocRef = useRef(null)
  const svgBoundDocsRef = useRef(new WeakSet())
  const checksRef = useRef(null)

  const countByProvince = useMemo(() => {
    const map = new Map()
    provinceCountRows.forEach((item) => {
      const normalized = normalizeProvinceText(item?.provincia)
      if (!normalized) return
      map.set(normalized, Number(item?.total || 0))
    })
    return map
  }, [provinceCountRows])

  const formatTooltip = useCallback((provinceName, count) => {
    const name = String(provinceName || '').trim()
    if (!name) return ''
    if (!Number.isInteger(count) || count < 1) return name
    return `${name} \u00B7 ${count} vacante${count === 1 ? '' : 's'}`
  }, [])

  const syncMapMetadata = useCallback((svgDoc) => {
    if (!svgDoc) return

    const paths = svgDoc.querySelectorAll('#features path[name]')
    paths.forEach((path) => {
      const provinceName = String(path.getAttribute('name') || path.getAttribute('id') || '').trim()
      if (!provinceName) return

      const normalized = normalizeProvinceText(provinceName)
      const count = Number(countByProvince.get(normalized) || 0)
      const tooltip = formatTooltip(provinceName, count)

      const existingTitle = path.querySelector('title')
      if (existingTitle) existingTitle.remove()
      const title = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = tooltip
      path.prepend(title)

      path.style.cursor = 'pointer'
    })
  }, [countByProvince, formatTooltip])

  const handleSvgLoad = useCallback((event) => {
    const svgDoc = event.currentTarget?.contentDocument
    if (!svgDoc) return

    syncMapMetadata(svgDoc)
    svgDocRef.current = svgDoc

    if (svgBoundDocsRef.current.has(svgDoc)) return
    const paths = svgDoc.querySelectorAll('#features path[name]')
    paths.forEach((path) => {
      const provinceName = String(path.getAttribute('name') || '').trim()
      if (!provinceName) return
      path.addEventListener('click', () => {
        navigate(`/app/candidate/vacantes?provincia=${encodeURIComponent(provinceName)}`)
      })
    })
    svgBoundDocsRef.current.add(svgDoc)
  }, [navigate, syncMapMetadata])

  useEffect(() => {
    let active = true

    async function fetchProvinceCounts() {
      try {
        const data = await apiRequest('/api/vacantes/public/provincias-count', {}, false)
        if (!active) return
        setProvinceCountRows(Array.isArray(data?.items) ? data.items : [])
      } catch {
        if (!active) return
        setProvinceCountRows([])
      }
    }

    fetchProvinceCounts()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!svgDocRef.current) return
    syncMapMetadata(svgDocRef.current)
  }, [syncMapMetadata])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsReducedMotion(true)
      setIsIntroDone(true)
      setIsTitleVisible(true)
      setIsSubtitleTypingEnabled(true)
      setAnimatedSubtitle(HERO_SUBTITLE)
      setIsSubtitleTypingDone(true)
      setAreActionsVisible(true)
      return undefined
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduced = media.matches
    setIsReducedMotion(reduced)

    if (reduced) {
      setIsIntroDone(true)
      setIsTitleVisible(true)
      setIsSubtitleTypingEnabled(true)
      setAnimatedSubtitle(HERO_SUBTITLE)
      setIsSubtitleTypingDone(true)
      setAreActionsVisible(true)
      return undefined
    }

    setIsIntroDone(false)
    setIsTitleVisible(true)
    setIsSubtitleTypingEnabled(true)
    setAreActionsVisible(false)
    setAnimatedSubtitle('')
    setIsSubtitleTypingDone(false)

    const introTimer = window.setTimeout(() => {
      setIsIntroDone(true)
    }, 1250)

    return () => {
      window.clearTimeout(introTimer)
    }
  }, [])

  useEffect(() => {
    if (!isSubtitleTypingEnabled) return undefined

    if (isReducedMotion) {
      setAnimatedSubtitle(HERO_SUBTITLE)
      setIsSubtitleTypingDone(true)
      return undefined
    }

    setAnimatedSubtitle('')
    setIsSubtitleTypingDone(false)
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setAnimatedSubtitle(HERO_SUBTITLE.slice(0, index))
      if (index >= HERO_SUBTITLE.length) {
        setIsSubtitleTypingDone(true)
        window.clearInterval(timer)
      }
    }, 16)

    return () => window.clearInterval(timer)
  }, [isReducedMotion, isSubtitleTypingEnabled])

  useEffect(() => {
    if (!isSubtitleTypingDone) return undefined
    const timer = window.setTimeout(() => {
      setAreActionsVisible(true)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [isSubtitleTypingDone])

  useEffect(() => {
    if (isReducedMotion) {
      setAreChecksInView(true)
      return undefined
    }

    const node = checksRef.current
    if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setAreChecksInView(true)
      return undefined
    }

    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setAreChecksInView(true)
          observer.disconnect()
        }
      })
    }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [isReducedMotion])

  return (
    <section className="bg-background pb-10 lg:pb-14">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-accent">
                Plataforma lider en Ecuador
              </span>
            </div>

            <h1 className={`font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance ${isTitleVisible ? 'hero-reveal-left' : 'hero-title-hidden'}`}>
              {HERO_TITLE}
            </h1>

            <p className="text-lg text-foreground/70 leading-relaxed max-w-xl" aria-label={HERO_SUBTITLE}>
              <span>{animatedSubtitle}</span>
              {!isSubtitleTypingDone ? <span className="hero-typewriter-caret" aria-hidden="true">|</span> : null}
            </p>

            <div className={`hero-stage flex flex-col sm:flex-row gap-4 ${areActionsVisible ? 'is-visible' : ''}`}>
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

          </div>

          {/* Right Content - Interactive Map */}
          <div className="relative flex h-full flex-col pt-4 lg:pt-12">
            <div
              className={`hero-map-card bg-white border border-border rounded-2xl p-6 shadow-sm ${!isIntroDone ? 'is-intro' : (isMapInteracting ? '' : 'is-idle')}`}
              onMouseEnter={() => setIsMapInteracting(true)}
              onMouseLeave={() => setIsMapInteracting(false)}
              onFocus={() => setIsMapInteracting(true)}
              onBlur={() => setIsMapInteracting(false)}
              tabIndex={0}
            >
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
              Pasa el cursor para ver vacantes por provincia o haz clic para filtrar.
            </p>
            <div className="mt-auto pt-3">
              <div
                ref={checksRef}
                className={`hero-stage hero-checks-row mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 ${areActionsVisible ? 'is-visible' : ''}`}
              >
                {HERO_CHECK_ITEMS.map((item, index) => {
                  const isCheckVisible = areActionsVisible && areChecksInView
                  return (
                    <div
                      key={item}
                      className={`hero-check-item flex items-center gap-2 text-sm text-foreground/70 ${isCheckVisible ? 'is-visible' : ''}`}
                      style={{ '--check-delay': isCheckVisible ? `${index * 170}ms` : '0ms' }}
                    >
                      <CheckCircle className={`hero-check-icon w-5 h-5 text-accent ${isCheckVisible ? 'is-visible' : ''}`} />
                      <span className="hero-check-label">{item}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
