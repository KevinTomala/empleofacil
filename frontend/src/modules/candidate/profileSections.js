import {
  Briefcase,
  FileText,
  GraduationCap,
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
    id: 'datos-basicos',
    title: 'Informacion basica',
    summary: 'Documento, nombres y estado academico',
    route: '/perfil/datos-basicos',
    level: 'obligatorio',
    phase: 'fase1',
    icon: User
  },
  {
    id: 'datos-personales',
    title: 'Datos personales',
    summary: 'Contacto y domicilio para ser ubicado',
    route: '/perfil/datos-personales',
    level: 'obligatorio',
    phase: 'fase1',
    icon: MapPin
  },
  {
    id: 'preferencias',
    title: 'Preferencias laborales',
    summary: 'Movilidad y disponibilidad',
    route: '/perfil/preferencias',
    level: 'recomendado',
    phase: 'fase1',
    icon: Settings
  },
  {
    id: 'formacion',
    title: 'Formacion',
    summary: 'Nivel de estudio e institucion',
    route: '/perfil/formacion',
    level: 'recomendado',
    phase: 'fase1',
    icon: GraduationCap
  },
  {
    id: 'idiomas',
    title: 'Idiomas',
    summary: 'Pendiente de integracion (fase 2)',
    route: '/perfil/idiomas',
    level: 'fase 2',
    phase: 'fase2',
    icon: Languages
  },
  {
    id: 'experiencia',
    title: 'Experiencia',
    summary: 'Pendiente de integracion (fase 2)',
    route: '/perfil/experiencia',
    level: 'fase 2',
    phase: 'fase2',
    icon: Briefcase
  },
  {
    id: 'documentos',
    title: 'Documentos',
    summary: 'Pendiente de integracion (fase 2)',
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
  const logistica = perfil?.logistica || {}
  const educacion = perfil?.educacion || {}

  if (id === 'datos-basicos') {
    const complete =
      hasText(datosBasicos.nombres) &&
      hasText(datosBasicos.apellidos) &&
      hasText(datosBasicos.documento_identidad)
    return sectionStatus(complete)
  }

  if (id === 'datos-personales') {
    const complete =
      (hasText(contacto.email) || hasText(contacto.telefono_celular)) &&
      (hasText(domicilio.provincia) || hasText(domicilio.direccion))
    return sectionStatus(complete)
  }

  if (id === 'preferencias') {
    const complete =
      isTruthyNumber(logistica.movilizacion) ||
      hasText(logistica.tipo_vehiculo) ||
      isTruthyNumber(logistica.disp_viajar) ||
      isTruthyNumber(logistica.disp_turnos) ||
      isTruthyNumber(logistica.disp_fines_semana)
    return sectionStatus(complete)
  }

  if (id === 'formacion') {
    const complete =
      hasText(educacion.nivel_estudio) || hasText(educacion.institucion) || hasText(educacion.titulo_obtenido)
    return sectionStatus(complete)
  }

  return 'pending_phase2'
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
  const requiredSections = fase1Sections.filter((section) => section.level === 'obligatorio')
  const recommendedSections = fase1Sections.filter((section) => section.level === 'recomendado')
  const phase2Sections = sections.filter((section) => section.phase === 'fase2')

  const completedFase1 = fase1Sections.filter((section) => section.status === 'complete').length
  const completedRequired = requiredSections.filter((section) => section.status === 'complete').length
  const completedRecommended = recommendedSections.filter((section) => section.status === 'complete').length

  const progressFase1 = fase1Sections.length ? Math.round((completedFase1 / fase1Sections.length) * 100) : 0

  return {
    fase1Sections,
    requiredSections,
    recommendedSections,
    phase2Sections,
    completedFase1,
    completedRequired,
    completedRecommended,
    pendingRequired: requiredSections.length - completedRequired,
    pendingRecommended: recommendedSections.length - completedRecommended,
    progressFase1
  }
}

export function getProfileVerificationMetrics(perfil) {
  return {
    hasDocument: hasText(perfil?.datos_basicos?.documento_identidad),
    hasEmail: hasText(perfil?.contacto?.email),
    hasPhone: hasText(perfil?.contacto?.telefono_celular)
  }
}
