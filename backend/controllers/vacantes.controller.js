const {
  toPositiveIntOrNull,
  normalizeEstado,
  normalizeModalidad,
  normalizeTipoContrato,
  normalizePosted,
  listVacantes,
  createVacante,
  findVacanteById,
  updateVacante
} = require('../services/vacantes.service');
const { resolveEmpresaIdForUser } = require('../services/companyPerfil.service');

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

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

function validateCreateVacantePayload(payload) {
  if (!isPlainObject(payload)) return null;
  const titulo = String(payload.titulo || '').trim();
  if (!titulo) return null;

  const estado = payload.estado ? normalizeEstado(payload.estado) : 'borrador';
  if (!estado) return null;
  const modalidad = payload.modalidad ? normalizeModalidad(payload.modalidad) : 'presencial';
  if (!modalidad) return null;
  const tipoContrato = payload.tipo_contrato ? normalizeTipoContrato(payload.tipo_contrato) : 'tiempo_completo';
  if (!tipoContrato) return null;

  const fechaCierre = payload.fecha_cierre ? String(payload.fecha_cierre).trim() : null;
  if (fechaCierre && !/^\d{4}-\d{2}-\d{2}$/.test(fechaCierre)) return null;

  return {
    titulo,
    area: payload.area ? String(payload.area).trim() : null,
    provincia: payload.provincia ? String(payload.provincia).trim() : null,
    ciudad: payload.ciudad ? String(payload.ciudad).trim() : null,
    modalidad,
    tipo_contrato: tipoContrato,
    descripcion: payload.descripcion ? String(payload.descripcion).trim() : null,
    requisitos: payload.requisitos ? String(payload.requisitos).trim() : null,
    estado,
    fecha_cierre: fechaCierre
  };
}

function validateUpdateVacantePayload(payload) {
  if (!isPlainObject(payload)) return null;
  const allowed = ['titulo', 'area', 'provincia', 'ciudad', 'modalidad', 'tipo_contrato', 'descripcion', 'requisitos', 'fecha_cierre'];
  const keys = Object.keys(payload);
  if (!keys.length) return null;
  if (!keys.every((key) => allowed.includes(key))) return null;

  const patch = {};
  if ('titulo' in payload) {
    const titulo = String(payload.titulo || '').trim();
    if (!titulo) return null;
    patch.titulo = titulo;
  }
  if ('modalidad' in payload) {
    const modalidad = normalizeModalidad(payload.modalidad);
    if (!modalidad) return null;
    patch.modalidad = modalidad;
  }
  if ('tipo_contrato' in payload) {
    const tipoContrato = normalizeTipoContrato(payload.tipo_contrato);
    if (!tipoContrato) return null;
    patch.tipo_contrato = tipoContrato;
  }
  if ('fecha_cierre' in payload) {
    const fechaCierre = payload.fecha_cierre ? String(payload.fecha_cierre).trim() : null;
    if (fechaCierre && !/^\d{4}-\d{2}-\d{2}$/.test(fechaCierre)) return null;
    patch.fecha_cierre = fechaCierre;
  }
  ['area', 'provincia', 'ciudad', 'descripcion', 'requisitos'].forEach((key) => {
    if (key in payload) patch[key] = payload[key] ? String(payload[key]).trim() : null;
  });
  return patch;
}

async function listVacantesPublic(req, res) {
  const postedParam = req.query.posted != null ? String(req.query.posted).trim() : '';
  if (postedParam && !normalizePosted(postedParam)) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'posted' });
  }

  try {
    const result = await listVacantes({
      page: req.query.page,
      pageSize: req.query.page_size,
      q: req.query.q,
      provincia: req.query.provincia,
      ciudad: req.query.ciudad,
      area: req.query.area,
      modalidad: req.query.modalidad,
      tipoContrato: req.query.tipo_contrato,
      posted: req.query.posted
    }, { onlyActive: true });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'VACANTES_FETCH_FAILED', details: String(error.message || error) });
  }
}

async function listMyVacantes(req, res) {
  const postedParam = req.query.posted != null ? String(req.query.posted).trim() : '';
  if (postedParam && !normalizePosted(postedParam)) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: 'posted' });
  }

  try {
    const empresaId = await resolveEmpresaScope(req, { allowAdminParam: true });
    if (!empresaId) return res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' });

    const result = await listVacantes({
      page: req.query.page,
      pageSize: req.query.page_size,
      q: req.query.q,
      provincia: req.query.provincia,
      ciudad: req.query.ciudad,
      area: req.query.area,
      modalidad: req.query.modalidad,
      tipoContrato: req.query.tipo_contrato,
      estado: req.query.estado,
      posted: req.query.posted
    }, { ownEmpresaId: empresaId });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'VACANTES_FETCH_FAILED', details: String(error.message || error) });
  }
}

async function createVacanteHandler(req, res) {
  const payload = validateCreateVacantePayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveEmpresaScope(req, { allowAdminParam: true });
    if (!empresaId) return res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' });

    const created = await createVacante(empresaId, req.user?.id || null, payload);
    return res.status(201).json({ ok: true, id: created.id });
  } catch (error) {
    return res.status(500).json({ error: 'VACANTE_UPDATE_FAILED', details: String(error.message || error) });
  }
}

async function updateVacanteHandler(req, res) {
  const vacanteId = toPositiveIntOrNull(req.params.vacanteId);
  if (!vacanteId) return res.status(400).json({ error: 'INVALID_VACANTE_ID' });

  const patch = validateUpdateVacantePayload(req.body || {});
  if (!patch) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveEmpresaScope(req, { allowAdminParam: true });
    if (!empresaId) return res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' });

    const vacante = await findVacanteById(vacanteId);
    if (!vacante || vacante.deleted_at) return res.status(404).json({ error: 'VACANTE_NOT_FOUND' });
    if (vacante.empresa_id !== empresaId) return res.status(403).json({ error: 'FORBIDDEN' });

    const affected = await updateVacante(vacanteId, patch);
    if (!affected) return res.status(404).json({ error: 'VACANTE_NOT_FOUND' });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'VACANTE_UPDATE_FAILED', details: String(error.message || error) });
  }
}

async function updateVacanteEstadoHandler(req, res) {
  const vacanteId = toPositiveIntOrNull(req.params.vacanteId);
  if (!vacanteId) return res.status(400).json({ error: 'INVALID_VACANTE_ID' });
  const estado = normalizeEstado(req.body?.estado);
  if (!estado) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveEmpresaScope(req, { allowAdminParam: true });
    if (!empresaId) return res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' });

    const vacante = await findVacanteById(vacanteId);
    if (!vacante || vacante.deleted_at) return res.status(404).json({ error: 'VACANTE_NOT_FOUND' });
    if (vacante.empresa_id !== empresaId) return res.status(403).json({ error: 'FORBIDDEN' });

    const patch = { estado };
    if (estado === 'cerrada' && !vacante.fecha_cierre) {
      patch.fecha_cierre = new Date().toISOString().slice(0, 10);
    }
    const affected = await updateVacante(vacanteId, patch);
    if (!affected) return res.status(404).json({ error: 'VACANTE_NOT_FOUND' });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'VACANTE_UPDATE_FAILED', details: String(error.message || error) });
  }
}

module.exports = {
  listVacantesPublic,
  listMyVacantes,
  createVacanteHandler,
  updateVacanteHandler,
  updateVacanteEstadoHandler
};
