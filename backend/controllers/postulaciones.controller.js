const { resolveEmpresaIdForUser } = require('../services/companyPerfil.service');
const {
  toPositiveIntOrNull,
  normalizeEstadoProceso,
  normalizePosted,
  findCandidatoIdByUserId,
  getCandidateApplyProfileReadiness,
  findVacanteForApply,
  existsPostulacion,
  createPostulacion,
  listPostulacionesByCandidato,
  getPostulacionesResumenByCandidato,
  getPostulacionDetailByCandidato,
  listPostulacionesByContratante
} = require('../services/postulaciones.service');
const { ensureConversationForVacanteCandidate } = require('../services/mensajes.service');

function resolveAdminOwnerType(req) {
  const raw = String(req.query?.contratante_tipo || req.body?.contratante_tipo || '').trim().toLowerCase();
  if (raw === 'empresa' || raw === 'persona') return raw;
  const candidatoId = toPositiveIntOrNull(req.query?.candidato_id || req.body?.candidato_id || req.params?.candidatoId);
  return candidatoId ? 'persona' : 'empresa';
}

async function resolveOwnerScope(req, { allowAdminParam = false } = {}) {
  const rol = req.user?.rol;
  const userId = req.user?.id;

  if (rol === 'empresa') {
    if (req.companyContext?.empresaId) return { type: 'empresa', empresaId: req.companyContext.empresaId };
    const empresaId = await resolveEmpresaIdForUser(userId, { autoCreate: true });
    return empresaId ? { type: 'empresa', empresaId } : null;
  }

  if (rol === 'candidato') {
    const candidatoId = await findCandidatoIdByUserId(userId);
    return candidatoId ? { type: 'persona', candidatoId } : null;
  }

  if ((rol === 'administrador' || rol === 'superadmin') && allowAdminParam) {
    const ownerType = resolveAdminOwnerType(req);
    if (ownerType === 'persona') {
      const candidatoId = toPositiveIntOrNull(req.query?.candidato_id || req.body?.candidato_id || req.params?.candidatoId);
      return candidatoId ? { type: 'persona', candidatoId } : null;
    }

    const empresaId = toPositiveIntOrNull(req.query?.empresa_id || req.body?.empresa_id || req.params?.empresaId);
    return empresaId ? { type: 'empresa', empresaId } : null;
  }

  return null;
}

async function createPostulacionHandler(req, res) {
  const vacanteId = toPositiveIntOrNull(req.body?.vacante_id);
  if (!vacanteId) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const candidatoId = await findCandidatoIdByUserId(req.user?.id);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const profileReadiness = await getCandidateApplyProfileReadiness(candidatoId);
    if (!profileReadiness?.is_ready) {
      return res.status(422).json({
        error: 'CANDIDATE_PROFILE_INCOMPLETE',
        details: 'Completa tu perfil (Fase 1 y Fase 2) antes de postular.',
        evidencia: profileReadiness
      });
    }

    const vacante = await findVacanteForApply(vacanteId);
    if (!vacante || vacante.deleted_at) return res.status(404).json({ error: 'VACANTE_NOT_FOUND' });
    if (vacante.estado !== 'activa') return res.status(400).json({ error: 'VACANTE_NOT_ACTIVE' });

    const contratanteTipo = String(vacante.contratante_tipo || (vacante.empresa_id ? 'empresa' : 'persona'));
    if (contratanteTipo === 'persona' && Number(vacante.contratante_candidato_id) === Number(candidatoId)) {
      return res.status(400).json({ error: 'CANNOT_APPLY_OWN_VACANTE' });
    }

    const alreadyExists = await existsPostulacion(vacanteId, candidatoId);
    if (alreadyExists) return res.status(409).json({ error: 'POSTULACION_DUPLICADA' });

    const created = await createPostulacion({
      vacanteId,
      candidatoId,
      empresaId: vacante.empresa_id || null,
      contratanteTipo,
      contratanteCandidatoId: vacante.contratante_candidato_id || null
    });
    try {
      await ensureConversationForVacanteCandidate({
        vacanteId,
        candidatoId,
        actorUserId: req.user?.id || null
      });
    } catch (_error) {
      // La postulacion no debe fallar por un problema secundario de mensajeria.
    }
    return res.status(201).json({ ok: true, id: created.id });
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACION_CREATE_FAILED', details: String(error.message || error) });
  }
}

async function listMyPostulacionesHandler(req, res) {
  const estado = req.query.estado != null ? normalizeEstadoProceso(req.query.estado) : null;
  if (req.query.estado != null && !estado) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'estado' });
  }

  const posted = req.query.posted != null ? normalizePosted(req.query.posted) : null;
  if (req.query.posted != null && !posted) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'posted' });
  }

  try {
    const candidatoId = await findCandidatoIdByUserId(req.user?.id);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const result = await listPostulacionesByCandidato({
      candidatoId,
      page: req.query.page,
      pageSize: req.query.page_size,
      q: req.query.q,
      estado,
      posted
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACIONES_FETCH_FAILED', details: String(error.message || error) });
  }
}

async function getMyPostulacionesResumenHandler(req, res) {
  const posted = req.query.posted != null ? normalizePosted(req.query.posted) : null;
  if (req.query.posted != null && !posted) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'posted' });
  }

  try {
    const candidatoId = await findCandidatoIdByUserId(req.user?.id);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const result = await getPostulacionesResumenByCandidato({
      candidatoId,
      q: req.query.q,
      posted
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACIONES_FETCH_FAILED', details: String(error.message || error) });
  }
}

async function getMyPostulacionDetailHandler(req, res) {
  const postulacionId = toPositiveIntOrNull(req.params.postulacionId);
  if (!postulacionId) return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'postulacionId' });

  try {
    const candidatoId = await findCandidatoIdByUserId(req.user?.id);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const detail = await getPostulacionDetailByCandidato({ candidatoId, postulacionId });
    if (!detail) return res.status(404).json({ error: 'POSTULACION_NOT_FOUND' });

    return res.json(detail);
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACIONES_FETCH_FAILED', details: String(error.message || error) });
  }
}

async function listEmpresaPostulacionesHandler(req, res) {
  try {
    const ownerScope = await resolveOwnerScope(req, { allowAdminParam: true });
    if (!ownerScope) return res.status(403).json({ error: 'CONTRATANTE_ACCESS_REQUIRED' });

    const result = await listPostulacionesByContratante({
      ownerScope,
      page: req.query.page,
      pageSize: req.query.page_size,
      vacanteId: req.query.vacante_id,
      q: req.query.q
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACIONES_FETCH_FAILED', details: String(error.message || error) });
  }
}

module.exports = {
  createPostulacionHandler,
  listMyPostulacionesHandler,
  getMyPostulacionesResumenHandler,
  getMyPostulacionDetailHandler,
  listEmpresaPostulacionesHandler
};
