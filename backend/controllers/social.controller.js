const { findCandidatoIdByUserId } = require('../services/perfilCandidato.service');
const {
  toPositiveIntOrNull,
  toTinyBool,
  listEmpresasPublic,
  getEmpresaPublicProfile,
  followEmpresa,
  unfollowEmpresa,
  getCandidateSocialConfig,
  updateCandidateSocialConfig,
  listPublicCandidates,
  followCandidate,
  unfollowCandidate
} = require('../services/social.service');

async function resolveCandidateIdFromReq(req) {
  const userId = req.user?.id;
  if (!userId) return null;
  return findCandidatoIdByUserId(userId);
}

async function listEmpresasPublicHandler(req, res) {
  try {
    const rol = String(req.user?.rol || '');
    const candidatoId = rol === 'candidato' ? await resolveCandidateIdFromReq(req) : null;

    const result = await listEmpresasPublic({
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.page_size,
      candidatoId,
      soloSeguidas: toTinyBool(req.query.solo_seguidas)
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_COMPANIES_LIST_FAILED',
      details: String(error.message || error)
    });
  }
}

async function getEmpresaPublicProfileHandler(req, res) {
  const empresaId = toPositiveIntOrNull(req.params.empresaId);
  if (!empresaId) return res.status(400).json({ error: 'INVALID_EMPRESA_ID' });

  try {
    const rol = String(req.user?.rol || '');
    const candidatoId = rol === 'candidato' ? await resolveCandidateIdFromReq(req) : null;
    const empresa = await getEmpresaPublicProfile(empresaId, candidatoId);
    if (!empresa) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    return res.json({ empresa });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_COMPANY_PROFILE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function followEmpresaHandler(req, res) {
  const empresaId = toPositiveIntOrNull(req.params.empresaId);
  if (!empresaId) return res.status(400).json({ error: 'INVALID_EMPRESA_ID' });

  try {
    const candidatoId = await resolveCandidateIdFromReq(req);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const ok = await followEmpresa(candidatoId, empresaId);
    if (!ok) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const empresa = await getEmpresaPublicProfile(empresaId, candidatoId);
    return res.json({ ok: true, empresa });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_COMPANY_FOLLOW_FAILED',
      details: String(error.message || error)
    });
  }
}

async function unfollowEmpresaHandler(req, res) {
  const empresaId = toPositiveIntOrNull(req.params.empresaId);
  if (!empresaId) return res.status(400).json({ error: 'INVALID_EMPRESA_ID' });

  try {
    const candidatoId = await resolveCandidateIdFromReq(req);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    await unfollowEmpresa(candidatoId, empresaId);
    const empresa = await getEmpresaPublicProfile(empresaId, candidatoId);
    return res.json({ ok: true, empresa });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_COMPANY_UNFOLLOW_FAILED',
      details: String(error.message || error)
    });
  }
}

async function getMyCandidateSocialConfigHandler(req, res) {
  try {
    const candidatoId = await resolveCandidateIdFromReq(req);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const config = await getCandidateSocialConfig(candidatoId);
    return res.json({ config });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_CANDIDATE_CONFIG_FAILED',
      details: String(error.message || error)
    });
  }
}

async function updateMyCandidateSocialConfigHandler(req, res) {
  const hasPerfilPublico = Object.prototype.hasOwnProperty.call(req.body || {}, 'perfil_publico');
  const hasAliasPublico = Object.prototype.hasOwnProperty.call(req.body || {}, 'alias_publico');
  const hasTitularPublico = Object.prototype.hasOwnProperty.call(req.body || {}, 'titular_publico');
  if (!hasPerfilPublico && !hasAliasPublico && !hasTitularPublico) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  try {
    const candidatoId = await resolveCandidateIdFromReq(req);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const patch = {};
    if (hasPerfilPublico) {
      patch.perfil_publico = toTinyBool(req.body.perfil_publico);
    }
    if (hasAliasPublico) {
      const alias = req.body?.alias_publico === null || req.body?.alias_publico === undefined
        ? null
        : String(req.body.alias_publico).trim();
      if (alias && alias.length > 120) {
        return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'alias_publico max 120 chars' });
      }
      patch.alias_publico = alias || null;
    }
    if (hasTitularPublico) {
      const titular = req.body?.titular_publico === null || req.body?.titular_publico === undefined
        ? null
        : String(req.body.titular_publico).trim();
      if (titular && titular.length > 300) {
        return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'titular_publico max 300 chars' });
      }
      patch.titular_publico = titular || null;
    }

    const config = await updateCandidateSocialConfig(candidatoId, patch);
    return res.json({ ok: true, config });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_CANDIDATE_CONFIG_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function listPublicCandidatesHandler(req, res) {
  try {
    const rol = String(req.user?.rol || '');
    const candidatoId = rol === 'candidato' ? await resolveCandidateIdFromReq(req) : null;

    const result = await listPublicCandidates({
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.page_size,
      excludeCandidatoId: toTinyBool(req.query.exclude_me) ? candidatoId : null,
      viewerCandidatoId: candidatoId
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_CANDIDATES_LIST_FAILED',
      details: String(error.message || error)
    });
  }
}

async function followCandidateHandler(req, res) {
  const targetCandidatoId = toPositiveIntOrNull(req.params.candidatoId);
  if (!targetCandidatoId) return res.status(400).json({ error: 'INVALID_CANDIDATO_ID' });

  try {
    const candidatoId = await resolveCandidateIdFromReq(req);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const result = await followCandidate(candidatoId, targetCandidatoId);
    if (result === -1) return res.status(400).json({ error: 'CANNOT_FOLLOW_SELF' });
    if (result === 0) return res.status(404).json({ error: 'CANDIDATO_PROFILE_NOT_PUBLIC' });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_CANDIDATE_FOLLOW_FAILED',
      details: String(error.message || error)
    });
  }
}

async function unfollowCandidateHandler(req, res) {
  const targetCandidatoId = toPositiveIntOrNull(req.params.candidatoId);
  if (!targetCandidatoId) return res.status(400).json({ error: 'INVALID_CANDIDATO_ID' });

  try {
    const candidatoId = await resolveCandidateIdFromReq(req);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    await unfollowCandidate(candidatoId, targetCandidatoId);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'SOCIAL_CANDIDATE_UNFOLLOW_FAILED',
      details: String(error.message || error)
    });
  }
}

module.exports = {
  listEmpresasPublicHandler,
  getEmpresaPublicProfileHandler,
  followEmpresaHandler,
  unfollowEmpresaHandler,
  getMyCandidateSocialConfigHandler,
  updateMyCandidateSocialConfigHandler,
  listPublicCandidatesHandler,
  followCandidateHandler,
  unfollowCandidateHandler
};
