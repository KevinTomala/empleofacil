const fs = require('fs');
const path = require('path');
const {
  VALID_ROLES_EMPRESA,
  VALID_ESTADOS_EMPRESA_USUARIO,
  VALID_MOTIVOS_DESACTIVACION_EMPRESA,
  VALID_MOTIVOS_REACTIVACION_EMPRESA,
  VALID_MODALIDADES,
  VALID_NIVELES_EXPERIENCIA,
  resolveEmpresaIdForUser,
  resolveEmpresaIdForUserAnyState,
  getPerfilByEmpresaId,
  updateEmpresa,
  upsertPerfilEmpresa,
  saveResumenPerfil,
  getEmpresaPreferenciasById,
  upsertEmpresaPreferenciasById,
  listEmpresaUsuariosByEmpresaId,
  createEmpresaUsuarioByEmail,
  updateEmpresaUsuarioById,
  deactivateEmpresaUsuarioById,
  softDeleteEmpresaById,
  createEmpresaReactivacionByEmpresaId,
  getLatestEmpresaReactivacionByEmpresaId,
  getLatestEmpresaDesactivacionByEmpresaId
} = require('../services/companyPerfil.service');
const { ensureVerificacionByScope } = require('../services/verificaciones.service');

const URL_RE = /^https?:\/\/.+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_UPLOAD_PREFIX = '/uploads/empresas/logos/';

async function getCompanyVerificationOrNull(empresaId) {
  try {
    return await ensureVerificacionByScope({ tipo: 'empresa', empresaId });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE' || Number(error?.errno) === 1146) {
      return null;
    }
    throw error;
  }
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeNullableString(value) {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parsePositiveInt(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return null;
  return number;
}

function parseOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function normalizeStringArray(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
}

function validateAndNormalizePayload(payload) {
  const allowed = [
    'nombre',
    'ruc',
    'email',
    'telefono',
    'industria',
    'ubicacion_principal',
    'tamano_empleados',
    'descripcion',
    'sitio_web',
    'linkedin_url',
    'instagram_url',
    'facebook_url'
  ];

  if (!isPlainObject(payload)) return null;

  const keys = Object.keys(payload);
  if (!keys.length) return null;
  if (!keys.every((key) => allowed.includes(key))) return null;

  const normalized = {};

  for (const [key, raw] of Object.entries(payload)) {
    if (key === 'tamano_empleados') {
      if (raw === null || raw === '') {
        normalized.tamano_empleados = null;
        continue;
      }

      const numberValue = Number(raw);
      if (!Number.isInteger(numberValue) || numberValue < 0) {
        return null;
      }

      normalized.tamano_empleados = numberValue;
      continue;
    }

    const value = normalizeNullableString(raw);
    if (!(value === null || typeof value === 'string')) {
      return null;
    }

    if (key === 'nombre') {
      if (typeof value !== 'string' || !value.length) return null;
      normalized.nombre = value;
      continue;
    }

    if (key === 'email' && value && !EMAIL_RE.test(value)) {
      return null;
    }

    if (['sitio_web', 'linkedin_url', 'instagram_url', 'facebook_url'].includes(key) && value) {
      if (!URL_RE.test(value)) return null;
    }

    normalized[key] = value;
  }

  return normalized;
}

function splitPatch(normalizedPatch) {
  const empresaPatch = {};
  const perfilPatch = {};

  const empresaKeys = ['nombre', 'ruc', 'email', 'telefono'];

  for (const [key, value] of Object.entries(normalizedPatch)) {
    if (empresaKeys.includes(key)) {
      empresaPatch[key] = value;
    } else {
      perfilPatch[key] = value;
    }
  }

  return { empresaPatch, perfilPatch };
}

async function resolveMyEmpresa(req) {
  if (req.companyContext?.empresaId) {
    return req.companyContext.empresaId;
  }
  const userId = req.user?.id;
  const rol = req.user?.rol;
  if (!userId) return null;

  return resolveEmpresaIdForUser(userId, { autoCreate: rol === 'empresa' });
}

function mapServiceErrorToHttp(error, defaultStatus = 500) {
  const code = String(error?.code || '');

  if (code === 'EMPRESA_NOT_FOUND') return { status: 404, error: code };
  if (code === 'USER_NOT_FOUND') return { status: 404, error: code };
  if (code === 'LINK_NOT_FOUND') return { status: 404, error: code };
  if (code === 'USER_ALREADY_LINKED') return { status: 409, error: code };
  if (code === 'LAST_ADMIN_REQUIRED') return { status: 400, error: code };
  if (code === 'INVALID_DEACTIVATION_REASON') return { status: 400, error: code };
  if (code === 'INVALID_REACTIVATION_REASON') return { status: 400, error: code };
  if (code === 'MOTIVO_OTRO_REQUIRED') return { status: 400, error: code };
  if (code === 'REACTIVATION_ALREADY_PENDING') return { status: 409, error: code };
  if (code === 'DEACTIVATION_SURVEY_ALREADY_SUBMITTED') return { status: 409, error: code };
  if (code === 'REACTIVATION_SURVEY_ALREADY_SUBMITTED') return { status: 409, error: code };
  if (code === 'COMPANY_ALREADY_ACTIVE') return { status: 409, error: code };
  if (code === 'COMPANY_ACCESS_REQUIRED') return { status: 403, error: code };
  if (code === 'COMPANY_ROLE_FORBIDDEN') return { status: 403, error: code };

  return {
    status: defaultStatus,
    error: defaultStatus >= 500 ? 'PROFILE_UPDATE_FAILED' : code || 'UNKNOWN_ERROR'
  };
}

async function getMyCompanyPerfil(req, res) {
  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) {
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }

    const perfil = await getPerfilByEmpresaId(empresaId);
    if (!perfil) {
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }
    const verificacion = await getCompanyVerificationOrNull(empresaId);

    await saveResumenPerfil(empresaId, perfil.resumen);

    return res.json({
      empresa: perfil.empresa,
      perfil: perfil.perfil,
      resumen: perfil.resumen,
      verificacion
    });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function updateMyCompanyDatosGenerales(req, res) {
  const patch = validateAndNormalizePayload(req.body || {});
  if (!patch) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) {
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }

    const { empresaPatch, perfilPatch } = splitPatch(patch);

    if (Object.keys(empresaPatch).length) {
      await updateEmpresa(empresaId, empresaPatch);
    }

    if (Object.keys(perfilPatch).length) {
      await upsertPerfilEmpresa(empresaId, perfilPatch);
    }

    const perfilActualizado = await getPerfilByEmpresaId(empresaId);
    if (!perfilActualizado) {
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }
    const verificacion = await getCompanyVerificationOrNull(empresaId);

    await saveResumenPerfil(empresaId, perfilActualizado.resumen);

    return res.json({
      ok: true,
      empresa: perfilActualizado.empresa,
      perfil: perfilActualizado.perfil,
      resumen: perfilActualizado.resumen,
      verificacion
    });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

function removeLocalLogoIfManaged(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return;
  if (!logoUrl.startsWith(LOGO_UPLOAD_PREFIX)) return;

  const relativePath = logoUrl
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean);

  const localPath = path.join(__dirname, '..', ...relativePath);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
}

function safeRemoveFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_error) {
    // Evita que un error de limpieza de archivo rompa la respuesta principal.
  }
}

async function clearCompanyLogoByEmpresaId(empresaId) {
  const perfilPrevio = await getPerfilByEmpresaId(empresaId);
  if (!perfilPrevio) return null;

  const oldLogoUrl = perfilPrevio?.perfil?.logo_url || null;
  await upsertPerfilEmpresa(empresaId, { logo_url: null });

  const perfilActualizado = await getPerfilByEmpresaId(empresaId);
  if (!perfilActualizado) return null;

  await saveResumenPerfil(empresaId, perfilActualizado.resumen);

  if (oldLogoUrl) {
    try {
      removeLocalLogoIfManaged(oldLogoUrl);
    } catch (_error) {
      // Ignora fallo de limpieza para no afectar la respuesta al usuario.
    }
  }

  return perfilActualizado;
}

async function uploadMyCompanyLogo(req, res) {
  const action = String(req.query?.action || '').trim().toLowerCase();
  if (action === 'delete') {
    return deleteMyCompanyLogo(req, res);
  }

  if (!req.file) {
    return res.status(400).json({ error: 'FILE_REQUIRED' });
  }

  let oldLogoUrl = null;

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) {
      safeRemoveFile(req.file.path);
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }

    const perfilPrevio = await getPerfilByEmpresaId(empresaId);
    oldLogoUrl = perfilPrevio?.perfil?.logo_url || null;

    const nextLogoUrl = `${LOGO_UPLOAD_PREFIX}${req.file.filename}`;
    await upsertPerfilEmpresa(empresaId, { logo_url: nextLogoUrl });

    const perfilActualizado = await getPerfilByEmpresaId(empresaId);
    if (!perfilActualizado) {
      safeRemoveFile(req.file.path);
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }
    const verificacion = await getCompanyVerificationOrNull(empresaId);

    await saveResumenPerfil(empresaId, perfilActualizado.resumen);

    if (oldLogoUrl && oldLogoUrl !== nextLogoUrl) {
      try {
        removeLocalLogoIfManaged(oldLogoUrl);
      } catch (_error) {
        // Ignora fallo de limpieza para no afectar la respuesta al usuario.
      }
    }

    return res.json({
      ok: true,
      logo_url: nextLogoUrl,
      empresa: perfilActualizado.empresa,
      perfil: perfilActualizado.perfil,
      resumen: perfilActualizado.resumen,
      verificacion
    });
  } catch (error) {
    safeRemoveFile(req.file?.path);
    return res.status(500).json({
      error: 'PROFILE_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function deleteMyCompanyLogo(req, res) {
  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) {
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }

    const perfilActualizado = await clearCompanyLogoByEmpresaId(empresaId);
    if (!perfilActualizado) {
      return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });
    }
    const verificacion = await getCompanyVerificationOrNull(empresaId);

    return res.json({
      ok: true,
      logo_url: null,
      empresa: perfilActualizado.empresa,
      perfil: perfilActualizado.perfil,
      resumen: perfilActualizado.resumen,
      verificacion
    });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function listMyCompanyUsuarios(req, res) {
  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const items = await listEmpresaUsuariosByEmpresaId(empresaId);
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

function validateCreateCompanyUserPayload(payload) {
  if (!isPlainObject(payload)) return null;
  const email = normalizeNullableString(payload.email);
  if (!email || !EMAIL_RE.test(email)) return null;

  const rolEmpresa = payload.rol_empresa ? String(payload.rol_empresa).trim() : 'reclutador';
  if (!VALID_ROLES_EMPRESA.includes(rolEmpresa)) return null;

  const principal = parseOptionalBoolean(payload.principal);
  if (principal === null) return null;

  return {
    email,
    rol_empresa: rolEmpresa,
    principal: principal === undefined ? false : principal
  };
}

async function createMyCompanyUsuario(req, res) {
  const payload = validateCreateCompanyUserPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const items = await createEmpresaUsuarioByEmail(empresaId, {
      email: payload.email,
      rolEmpresa: payload.rol_empresa,
      principal: payload.principal
    });
    return res.status(201).json({ ok: true, items });
  } catch (error) {
    const mapped = mapServiceErrorToHttp(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

function validateUpdateCompanyUserPayload(payload) {
  if (!isPlainObject(payload)) return null;
  const keys = Object.keys(payload);
  if (!keys.length) return null;

  const patch = {};

  if ('rol_empresa' in payload) {
    const rolEmpresa = String(payload.rol_empresa || '').trim();
    if (!VALID_ROLES_EMPRESA.includes(rolEmpresa)) return null;
    patch.rol_empresa = rolEmpresa;
  }

  if ('estado' in payload) {
    const estado = String(payload.estado || '').trim();
    if (!VALID_ESTADOS_EMPRESA_USUARIO.includes(estado)) return null;
    patch.estado = estado;
  }

  if ('principal' in payload) {
    const principal = parseOptionalBoolean(payload.principal);
    if (principal === null || principal === undefined) return null;
    patch.principal = principal;
  }

  if (!Object.keys(patch).length) return null;
  return patch;
}

async function updateMyCompanyUsuario(req, res) {
  const empresaUsuarioId = parsePositiveInt(req.params.empresaUsuarioId);
  if (!empresaUsuarioId) return res.status(400).json({ error: 'INVALID_EMPRESA_USUARIO_ID' });

  const patch = validateUpdateCompanyUserPayload(req.body || {});
  if (!patch) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const items = await updateEmpresaUsuarioById(empresaId, empresaUsuarioId, patch);
    return res.json({ ok: true, items });
  } catch (error) {
    const mapped = mapServiceErrorToHttp(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function deleteMyCompanyUsuario(req, res) {
  const empresaUsuarioId = parsePositiveInt(req.params.empresaUsuarioId);
  if (!empresaUsuarioId) return res.status(400).json({ error: 'INVALID_EMPRESA_USUARIO_ID' });

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const items = await deactivateEmpresaUsuarioById(empresaId, empresaUsuarioId);
    return res.json({ ok: true, items });
  } catch (error) {
    const mapped = mapServiceErrorToHttp(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function getMyCompanyPreferencias(req, res) {
  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const preferencias = await getEmpresaPreferenciasById(empresaId);
    return res.json({ preferencias });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

function validatePreferenciasPayload(payload) {
  if (!isPlainObject(payload)) return null;
  const keys = Object.keys(payload);
  if (!keys.length) return null;

  const allowed = ['modalidades_permitidas', 'niveles_experiencia', 'observaciones'];
  if (!keys.every((key) => allowed.includes(key))) return null;

  const modalidadesRaw = payload.modalidades_permitidas;
  const nivelesRaw = payload.niveles_experiencia;
  const observacionesRaw = payload.observaciones;

  if (!Array.isArray(modalidadesRaw) || !Array.isArray(nivelesRaw)) return null;

  const modalidades = Array.from(
    new Set(modalidadesRaw.map((item) => String(item || '').trim()).filter((item) => VALID_MODALIDADES.includes(item)))
  );
  const niveles = Array.from(
    new Set(nivelesRaw.map((item) => String(item || '').trim()).filter((item) => VALID_NIVELES_EXPERIENCIA.includes(item)))
  );

  if (modalidades.length !== modalidadesRaw.length) return null;
  if (niveles.length !== nivelesRaw.length) return null;

  const observaciones = normalizeNullableString(observacionesRaw);
  if (!(observaciones === null || typeof observaciones === 'string')) return null;

  return {
    modalidades_permitidas: modalidades,
    niveles_experiencia: niveles,
    observaciones
  };
}

function validateDeactivateCompanyPayload(payload) {
  if (!isPlainObject(payload)) return null;

  const motivosCodigos = normalizeStringArray(payload.motivos_codigos);
  if (!motivosCodigos.length) return null;
  if (!motivosCodigos.every((item) => VALID_MOTIVOS_DESACTIVACION_EMPRESA.includes(item))) return null;

  const motivoDetalleRaw = normalizeNullableString(payload.motivo_detalle);
  if (!(motivoDetalleRaw === null || typeof motivoDetalleRaw === 'string')) return null;
  const motivoDetalle = typeof motivoDetalleRaw === 'string' ? motivoDetalleRaw.slice(0, 1000) : null;

  if (motivosCodigos.includes('otro') && !motivoDetalle) return null;

  const requiereSoporte = parseOptionalBoolean(payload.requiere_soporte);
  if (requiereSoporte === null) return null;

  return {
    motivos_codigos: motivosCodigos,
    motivo_detalle: motivoDetalle,
    requiere_soporte: requiereSoporte === undefined ? false : requiereSoporte
  };
}

function validateRequestReactivationPayload(payload) {
  if (!isPlainObject(payload)) return null;

  const motivosCodigos = normalizeStringArray(payload.motivos_codigos);
  if (!motivosCodigos.length) return null;
  if (!motivosCodigos.every((item) => VALID_MOTIVOS_REACTIVACION_EMPRESA.includes(item))) return null;

  const motivoDetalleRaw = normalizeNullableString(payload.motivo_detalle);
  if (!(motivoDetalleRaw === null || typeof motivoDetalleRaw === 'string')) return null;
  const motivoDetalle = typeof motivoDetalleRaw === 'string' ? motivoDetalleRaw.slice(0, 1000) : null;
  if (motivosCodigos.includes('otro') && !motivoDetalle) return null;

  const accionesRaw = payload.acciones_realizadas === undefined
    ? null
    : normalizeNullableString(payload.acciones_realizadas);
  if (!(accionesRaw === null || typeof accionesRaw === 'string')) return null;

  const requiereSoporte = parseOptionalBoolean(payload.requiere_soporte);
  if (requiereSoporte === null) return null;

  return {
    motivos_codigos: motivosCodigos,
    motivo_detalle: motivoDetalle,
    acciones_realizadas: typeof accionesRaw === 'string' ? accionesRaw.slice(0, 2000) : null,
    requiere_soporte: requiereSoporte === undefined ? false : requiereSoporte
  };
}

async function upsertMyCompanyPreferencias(req, res) {
  const payload = validatePreferenciasPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const preferencias = await upsertEmpresaPreferenciasById(empresaId, payload);
    return res.json({ ok: true, preferencias });
  } catch (error) {
    const mapped = mapServiceErrorToHttp(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function getMyCompanyReactivationRequest(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'AUTH_REQUIRED' });

    const empresaId = await resolveEmpresaIdForUserAnyState(userId);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const solicitud = await getLatestEmpresaReactivacionByEmpresaId(empresaId);
    const desactivacion = await getLatestEmpresaDesactivacionByEmpresaId(empresaId);
    return res.json({ solicitud, desactivacion });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function requestMyCompanyReactivation(req, res) {
  const payload = validateRequestReactivationPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'AUTH_REQUIRED' });

    const empresaId = await resolveEmpresaIdForUserAnyState(userId);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    const solicitud = await createEmpresaReactivacionByEmpresaId(empresaId, {
      usuarioId: userId,
      motivosCodigos: payload.motivos_codigos,
      motivoDetalle: payload.motivo_detalle,
      accionesRealizadas: payload.acciones_realizadas,
      requiereSoporte: payload.requiere_soporte
    });

    return res.status(201).json({ ok: true, solicitud });
  } catch (error) {
    const mapped = mapServiceErrorToHttp(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function deleteMyCompanyPerfil(req, res) {
  const payload = validateDeactivateCompanyPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  try {
    const empresaId = await resolveMyEmpresa(req);
    if (!empresaId) return res.status(404).json({ error: 'EMPRESA_NOT_FOUND' });

    await softDeleteEmpresaById(empresaId, {
      actorUsuarioId: req.user?.id || null,
      motivosCodigos: payload.motivos_codigos,
      motivoDetalle: payload.motivo_detalle,
      requiereSoporte: payload.requiere_soporte
    });
    return res.json({ ok: true });
  } catch (error) {
    const mapped = mapServiceErrorToHttp(error);
    return res.status(mapped.status).json({
      error: mapped.status >= 500 ? 'PROFILE_DELETE_FAILED' : mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

module.exports = {
  getMyCompanyPerfil,
  updateMyCompanyDatosGenerales,
  uploadMyCompanyLogo,
  deleteMyCompanyLogo,
  listMyCompanyUsuarios,
  createMyCompanyUsuario,
  updateMyCompanyUsuario,
  deleteMyCompanyUsuario,
  getMyCompanyPreferencias,
  upsertMyCompanyPreferencias,
  getMyCompanyReactivationRequest,
  requestMyCompanyReactivation,
  deleteMyCompanyPerfil
};
