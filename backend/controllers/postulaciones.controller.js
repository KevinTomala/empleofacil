const { resolveEmpresaIdForUser } = require('../services/companyPerfil.service');
const {
  toPositiveIntOrNull,
  findCandidatoIdByUserId,
  findVacanteForApply,
  existsPostulacion,
  createPostulacion,
  listPostulacionesByCandidato,
  listPostulacionesByEmpresa
} = require('../services/postulaciones.service');

async function resolveEmpresaScope(req, { allowAdminParam = false } = {}) {
  const rol = req.user?.rol;
  const userId = req.user?.id;

  if (rol === 'empresa') {
    if (req.companyContext?.empresaId) return req.companyContext.empresaId;
    return resolveEmpresaIdForUser(userId, { autoCreate: true });
  }

  if ((rol === 'administrador' || rol === 'superadmin') && allowAdminParam) {
    return toPositiveIntOrNull(req.query?.empresa_id || req.body?.empresa_id || req.params?.empresaId);
  }

  return null;
}

async function createPostulacionHandler(req, res) {
  const vacanteId = toPositiveIntOrNull(req.body?.vacante_id);
  if (!vacanteId) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const candidatoId = await findCandidatoIdByUserId(req.user?.id);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const vacante = await findVacanteForApply(vacanteId);
    if (!vacante || vacante.deleted_at) return res.status(404).json({ error: 'VACANTE_NOT_FOUND' });
    if (vacante.estado !== 'activa') return res.status(400).json({ error: 'VACANTE_NOT_ACTIVE' });

    const alreadyExists = await existsPostulacion(vacanteId, candidatoId);
    if (alreadyExists) return res.status(409).json({ error: 'POSTULACION_DUPLICADA' });

    const created = await createPostulacion({
      vacanteId,
      candidatoId,
      empresaId: vacante.empresa_id
    });
    return res.status(201).json({ ok: true, id: created.id });
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACION_CREATE_FAILED', details: String(error.message || error) });
  }
}

async function listMyPostulacionesHandler(req, res) {
  try {
    const candidatoId = await findCandidatoIdByUserId(req.user?.id);
    if (!candidatoId) return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });

    const result = await listPostulacionesByCandidato({
      candidatoId,
      page: req.query.page,
      pageSize: req.query.page_size
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'POSTULACIONES_FETCH_FAILED', details: String(error.message || error) });
  }
}

async function listEmpresaPostulacionesHandler(req, res) {
  try {
    const empresaId = await resolveEmpresaScope(req, { allowAdminParam: true });
    if (!empresaId) return res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' });

    const result = await listPostulacionesByEmpresa({
      empresaId,
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
  listEmpresaPostulacionesHandler
};
