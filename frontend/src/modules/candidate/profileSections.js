import {
  Briefcase,
  FileText,
  GraduationCap,
  HeartPulse,
  Languages,
  MapPin,
  Settings,
  User
} from 'lucide-react'

function hasText(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isTruthyNumber(value) {
  return value === 1 || value === true
}

function sectionStatus(isComplete) {
  return isComplete ? 'complete' : 'pending'
}

export const PROFILE_SECTION_DEFS = [
  {
    id: 'perfil',
    title: 'Perfil',
    summary: 'Datos personales y de contacto',
    route: '/perfil/perfil',
    level: 'obligatorio',
    phase: 'fase1',
    icon: User
  },
  {
    id: 'domicilio',
    title: 'Domicilio',
    summary: 'Ubicacion y direccion actual',
    route: '/perfil/domicilio',
    level: 'obligatorio',
    phase: 'fase1',
    icon: MapPin
  },
  {
    id: 'movilidad',
    title: 'Movilidad',
    summary: 'Movilidad y disponibilidad laboral',
    route: '/perfil/movilidad',
    level: 'recomendado',
    phase: 'fase1',
    icon: Settings
  },
  {
    id: 'salud',
    title: 'Salud',
    summary: 'Datos de salud para el perfil',
    route: '/perfil/salud',
    level: 'recomendado',
    phase: 'fase1',
    icon: HeartPulse
  },
  {
    id: 'formacion',
    title: 'Formacion',
    summary: 'Formacion academica, externa y certificaciones',
    route: '/perfil/formacion',
    level: 'recomendado',
    phase: 'fase1',
    icon: GraduationCap
  },
  {
    id: 'idiomas',
    title: 'Idiomas',
    summary: 'Idiomas y nivel de dominio',
    route: '/perfil/idiomas',
    level: 'fase 2',
    phase: 'fase2',
    icon: Languages
  },
  {
    id: 'experiencia',
    title: 'Experiencia',
    summary: 'Historial laboral y trayectoria',
    route: '/perfil/experiencia',
    level: 'fase 2',
    phase: 'fase2',
    icon: Briefcase
  },
  {
    id: 'documentos',
    title: 'Documentos',
    summary: 'Archivos de soporte del perfil',
    route: '/perfil/documentos',
    level: 'fase 2',
    phase: 'fase2',
    icon: FileText
  }
]

function getSectionStatus(id, perfil) {
  const datosBasicos = perfil?.datos_basicos || {}
  const contacto = perfil?.contacto || {}
  const domicilio = perfil?.domicilio || {}
  const salud = perfil?.salud || {}
  const logistica = perfil?.logistica || {}
  const educacion = perfil?.educacion || {}
  const formacionDetalle = Array.isArray(perfil?.formacion_detalle) ? perfil.formacion_detalle : []
  const idiomas = Array.isArray(perfil?.idiomas) ? perfil.idiomas : []
  const experiencia = Array.isArray(perfil?.experiencia) ? perfil.experiencia : []
  const documentos = Array.isArray(perfil?.documentos) ? perfil.documentos : []

  if (id === 'perfil') {
    const complete =
      hasText(datosBasicos.nombres) &&
      hasText(datosBasicos.apellidos) &&
      hasText(datosBasicos.documento_identidad) &&
      (hasText(contacto.email) || hasText(contacto.telefono_celular))
    return sectionStatus(complete)
  }

  if (id === 'domicilio') {
    const complete = hasText(domicilio.provincia) && hasText(domicilio.canton) && hasText(domicilio.parroquia)
    return sectionStatus(complete)
  }

  if (id === 'movilidad') {
    const complete =
      isTruthyNumber(logistica.movilizacion) ||
      hasText(logistica.tipo_vehiculo) ||
      isTruthyNumber(logistica.disp_viajar) ||
      isTruthyNumber(logistica.disp_turnos) ||
      isTruthyNumber(logistica.disp_fines_semana)
    return sectionStatus(complete)
  }

  if (id === 'salud') {
    const complete =
      hasText(salud.tipo_sangre) ||
      Number.isFinite(Number(salud.estatura)) ||
      Number.isFinite(Number(salud.peso)) ||
      hasText(salud.tatuaje)
    return sectionStatus(complete)
  }

  if (id === 'formacion') {
    const complete =
      formacionDetalle.length > 0 ||
      hasText(educacion.nivel_estudio) ||
      hasText(educacion.institucion) ||
      hasText(educacion.titulo_obtenido)
    return sectionStatus(complete)
  }

  if (id === 'idiomas') return sectionStatus(idiomas.length > 0)
  if (id === 'experiencia') return sectionStatus(experiencia.length > 0)
  if (id === 'documentos') return sectionStatus(documentos.length > 0)

  return 'pending'
}

export function buildProfileSections(perfil) {
  return PROFILE_SECTION_DEFS.map((section) => ({
    ...section,
    status: getSectionStatus(section.id, perfil)
  }))
}

export function isRouteComplete(route, perfil) {
  const section = buildProfileSections(perfil).find((item) => item.route === route)
  if (!section) return false
  return section.status === 'complete'
}

export function getNextPendingRoute(sections, currentRoute) {
  const phase1Sections = sections.filter((section) => section.phase === 'fase1')
  const currentIndex = phase1Sections.findIndex((section) => section.route === currentRoute)
  const ordered = currentIndex >= 0
    ? [...phase1Sections.slice(currentIndex + 1), ...phase1Sections.slice(0, currentIndex + 1)]
    : phase1Sections

  return ordered.find((section) => section.status !== 'complete')?.route || null
}

export function getProfileProgressMetrics(sections) {
  const fase1Sections = sections.filter((section) => section.phase === 'fase1')
  const allSections = sections.filter((section) => section.status !== 'pending_phase2')
  const requiredSections = fase1Sections.filter((section) => section.level === 'obligatorio')
  const recommendedSections = fase1Sections.filter((section) => section.level === 'recomendado')
  const phase2Sections = sections.filter((section) => section.phase === 'fase2')

  const completedFase1 = fase1Sections.filter((section) => section.status === 'complete').length
  const completedAll = allSections.filter((section) => section.status === 'complete').length
  const completedRequired = requiredSections.filter((section) => section.status === 'complete').length
  const completedRecommended = recommendedSections.filter((section) => section.status === 'complete').length

  const progressFase1 = fase1Sections.length ? Math.round((completedFase1 / fase1Sections.length) * 100) : 0
  const progressGeneral = allSections.length ? Math.round((completedAll / allSections.length) * 100) : 0

  return {
    fase1Sections,
    allSections,
    requiredSections,
    recommendedSections,
    phase2Sections,
    completedFase1,
    completedAll,
    completedRequired,
    completedRecommended,
    pendingRequired: requiredSections.length - completedRequired,
    pendingRecommended: recommendedSections.length - completedRecommended,
    progressFase1,
    progressGeneral
  }
}

export function getProfileVerificationMetrics(perfil) {
  return {
    hasDocument: hasText(perfil?.datos_basicos?.documento_identidad),
    hasEmail: hasText(perfil?.contacto?.email),
    hasPhone: hasText(perfil?.contacto?.telefono_celular)
  }
}
