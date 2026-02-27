import { Check } from 'lucide-react'

const VERIFIED_STATES = new Set(['aprobada', 'verificada', 'verified', 'approved'])

function toBoolean(value) {
  if (value === true || value === 1) return true
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'si'
}

function isApprovedState(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return false
  return VERIFIED_STATES.has(normalized)
}

export function isEntityVerified(entity) {
  if (!entity || typeof entity !== 'object') return false

  if (
    toBoolean(entity.verificada)
    || toBoolean(entity.verificado)
    || toBoolean(entity.verified)
    || toBoolean(entity.is_verified)
    || toBoolean(entity.empresa_verificada)
    || toBoolean(entity.candidato_verificado)
    || toBoolean(entity.contratante_verificado)
  ) {
    return true
  }

  if (
    isApprovedState(entity.verificacion_cuenta_estado)
    || isApprovedState(entity.verificacion_estado)
    || isApprovedState(entity.verification_status)
    || isApprovedState(entity.empresa_verificacion_estado)
    || isApprovedState(entity.candidato_verificacion_estado)
    || isApprovedState(entity.contratante_verificacion_estado)
    || isApprovedState(entity?.verificacion?.estado)
    || isApprovedState(entity?.verification?.estado)
  ) {
    return true
  }

  // Soporta objetos de verificacion completos (por ejemplo: { cuenta_tipo, estado, ... }).
  if ((entity.cuenta_tipo || entity.fecha_solicitud || entity.nivel) && isApprovedState(entity.estado)) {
    return true
  }

  return false
}

export default function VerifiedBadge({ entity, verified, size = 14, className = '', title = 'Perfil verificado' }) {
  const isVisible = typeof verified === 'boolean' ? verified : isEntityVerified(entity)
  if (!isVisible) return null

  const iconSize = Math.max(Math.round(size * 0.72), 10)

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-emerald-500 text-white align-middle ${className}`.trim()}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={title}
      aria-label={title}
    >
      <Check size={iconSize} strokeWidth={3} />
    </span>
  )
}
