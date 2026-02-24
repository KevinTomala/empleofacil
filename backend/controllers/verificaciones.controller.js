const {
  resolveEmpresaIdForUser,
  VALID_ESTADOS_REACTIVACION_EMPRESA,
  listEmpresaReactivaciones,
  reviewEmpresaReactivacionById
} = require('../services/companyPerfil.service');
const {
  findCandidatoIdByUserId,
  hasCandidateVerificationSupportDocuments
} = require('../services/perfilCandidato.service');
const {
  VALID_VERIFICACION_ESTADOS,
  VALID_VERIFICACION_NIVELES,
  ensureVerificacionByScope,
  requestVerificacionByScope,
  listVerificaciones,
  getVerificacionById,
  listVerificacionEventos,
  reviewVerificacionById
} = require('../services/verificaciones.service');

function parsePositiveInt(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return null;
  return number;
}

function parseNullableDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseNullableString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseBooleanFlag(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'si', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  return null;
}

async function getMyCompanyVerification(req, res) {
  try {
    const userId = req.user?.id;
    const empresaId = req.companyContext?.empresaId
      || await resolveEmpresaIdForUser(userId, { autoCreate: req.user?.rol === 'empresa' });
    if (!empresaId) {
      return req.companyContext
        ? res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' })
        : res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }

    const verificacion = await ensureVerificacionByScope({ tipo: 'empresa', empresaId });
    return res.json({ verificacion });
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function requestMyCompanyVerification(req, res) {
  try {
    const userId = req.user?.id;
    const empresaId = req.companyContext?.empresaId
      || await resolveEmpresaIdForUser(userId, { autoCreate: req.user?.rol === 'empresa' });
    if (!empresaId) {
      return req.companyContext
        ? res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' })
        : res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }

    const verificacion = await requestVerificacionByScope({
      tipo: 'empresa',
      empresaId,
      actorUsuarioId: userId,
      actorRol: req.user?.rol || 'empresa',
      comentario: parseNullableString(req.body?.comentario)
    });

    return res.json({ ok: true, verificacion });
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function getMyCandidateVerification(req, res) {
  try {
    const userId = req.user?.id;
    const candidatoId = await findCandidatoIdByUserId(userId);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const verificacion = await ensureVerificacionByScope({ tipo: 'candidato', candidatoId });
    return res.json({ verificacion });
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function requestMyCandidateVerification(req, res) {
  try {
    const userId = req.user?.id;
    const candidatoId = await findCandidatoIdByUserId(userId);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const docs = await hasCandidateVerificationSupportDocuments(candidatoId);
    if (!docs?.is_eligible) {
      return res.status(422).json({
        error: 'CANDIDATE_VERIFICATION_DOCUMENTS_REQUIRED',
        details: 'Debes subir cedula por ambos lados o licencia de conducir para solicitar verificacion.',
        evidencia: docs
      });
    }

    const verificacion = await requestVerificacionByScope({
      tipo: 'candidato',
      candidatoId,
      actorUsuarioId: userId,
      actorRol: req.user?.rol || 'candidato',
      comentario: parseNullableString(req.body?.comentario)
    });

    return res.json({ ok: true, verificacion });
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function listVerificacionesAdmin(req, res) {
  try {
    const estado = parseNullableString(req.query.estado);
    const tipo = parseNullableString(req.query.tipo);
    const hasSolicitud = parseBooleanFlag(req.query.has_solicitud);
    const q = parseNullableString(req.query.q) || '';
    const page = parsePositiveInt(req.query.page) || 1;
    const pageSize = parsePositiveInt(req.query.page_size) || 20;

    const result = await listVerificaciones({
      estado,
      tipo,
      hasSolicitud,
      q,
      page,
      pageSize
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function getVerificacionByIdAdmin(req, res) {
  const verificacionId = parsePositiveInt(req.params.verificacionId);
  if (!verificacionId) return res.status(400).json({ error: 'INVALID_VERIFICACION_ID' });

  try {
    const verificacion = await getVerificacionById(verificacionId);
    if (!verificacion) return res.status(404).json({ error: 'VERIFICACION_NOT_FOUND' });

    const eventos = await listVerificacionEventos(verificacionId, {
      limit: parsePositiveInt(req.query.limit) || 20
    });

    return res.json({ verificacion, eventos });
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function reviewVerificacionAdmin(req, res) {
  const verificacionId = parsePositiveInt(req.params.verificacionId);
  if (!verificacionId) return res.status(400).json({ error: 'INVALID_VERIFICACION_ID' });

  const payload = req.body || {};
  const estado = parseNullableString(payload.estado);
  const nivel = parseNullableString(payload.nivel);
  const motivoRechazo = parseNullableString(payload.motivo_rechazo);
  const notasAdmin = parseNullableString(payload.notas_admin);
  const comentario = parseNullableString(payload.comentario);
  const expiresAt = parseNullableDateTime(payload.expires_at);

  if (!estado || !VALID_VERIFICACION_ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'INVALID_ESTADO' });
  }
  if (nivel && !VALID_VERIFICACION_NIVELES.includes(nivel)) {
    return res.status(400).json({ error: 'INVALID_NIVEL' });
  }
  if (estado === 'rechazada' && !motivoRechazo) {
    return res.status(400).json({ error: 'MOTIVO_RECHAZO_REQUIRED' });
  }
  if (payload.expires_at !== undefined && payload.expires_at !== null && payload.expires_at !== '' && !expiresAt) {
    return res.status(400).json({ error: 'INVALID_EXPIRES_AT' });
  }
  if (req.user?.rol === 'administrador' && estado === 'suspendida') {
    return res.status(403).json({ error: 'SUPERADMIN_REQUIRED' });
  }

  try {
    const existing = await getVerificacionById(verificacionId);
    if (!existing) return res.status(404).json({ error: 'VERIFICACION_NOT_FOUND' });

    if (estado === 'aprobada' && existing.cuenta_tipo === 'candidato') {
      const docs = await hasCandidateVerificationSupportDocuments(existing.candidato_id);
      if (!docs?.is_eligible) {
        return res.status(422).json({
          error: 'CANDIDATE_VERIFICATION_DOCUMENTS_REQUIRED',
          details: 'No se puede validar candidato sin cedula por ambos lados o licencia de conducir.',
          evidencia: docs
        });
      }
    }

    const verificacion = await reviewVerificacionById({
      verificacionId,
      estado,
      nivel,
      motivoRechazo,
      notasAdmin,
      expiresAt,
      actorUsuarioId: req.user?.id || null,
      actorRol: req.user?.rol || 'administrador',
      comentario
    });

    return res.json({ ok: true, verificacion });
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function listReactivacionesEmpresaAdmin(req, res) {
  try {
    const estado = parseNullableString(req.query.estado);
    if (estado && !VALID_ESTADOS_REACTIVACION_EMPRESA.includes(estado)) {
      return res.status(400).json({ error: 'INVALID_REACTIVATION_STATUS' });
    }

    const q = parseNullableString(req.query.q) || '';
    const page = parsePositiveInt(req.query.page) || 1;
    const pageSize = parsePositiveInt(req.query.page_size) || 20;

    const result = await listEmpresaReactivaciones({
      estado,
      q,
      page,
      pageSize
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'VERIFICATION_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function reviewReactivacionEmpresaAdmin(req, res) {
  const reactivacionId = parsePositiveInt(req.params.reactivacionId);
  if (!reactivacionId) return res.status(400).json({ error: 'INVALID_REACTIVATION_ID' });

  const payload = req.body || {};
  const estado = parseNullableString(payload.estado);
  const comentario = parseNullableString(payload.comentario_admin || payload.comentario);

  if (!estado || !['en_revision', 'aprobada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'INVALID_REACTIVATION_STATUS' });
  }

  try {
    const solicitud = await reviewEmpresaReactivacionById({
      reactivacionId,
      estado,
      comentarioAdmin: comentario,
      actorUsuarioId: req.user?.id || null
    });

    return res.json({ ok: true, solicitud });
  } catch (error) {
    const code = String(error?.code || '');
    if (code === 'REACTIVATION_NOT_FOUND') {
      return res.status(404).json({ error: 'REACTIVATION_NOT_FOUND' });
    }
    if (code === 'INVALID_REACTIVATION_ID') {
      return res.status(400).json({ error: 'INVALID_REACTIVATION_ID' });
    }
    if (code === 'INVALID_REACTIVATION_STATUS') {
      return res.status(400).json({ error: 'INVALID_REACTIVATION_STATUS' });
    }

    return res.status(500).json({
      error: 'VERIFICATION_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

module.exports = {
  getMyCompanyVerification,
  requestMyCompanyVerification,
  getMyCandidateVerification,
  requestMyCandidateVerification,
  listVerificacionesAdmin,
  getVerificacionByIdAdmin,
  reviewVerificacionAdmin,
  listReactivacionesEmpresaAdmin,
  reviewReactivacionEmpresaAdmin
};
