const {
  resolveEmpresaIdForUser,
  getPerfilByEmpresaId,
  updateEmpresa,
  upsertPerfilEmpresa,
  saveResumenPerfil
} = require('../services/companyPerfil.service');

const URL_RE = /^https?:\/\/.+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeNullableString(value) {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
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
  const userId = req.user?.id;
  const rol = req.user?.rol;
  if (!userId) return null;

  return resolveEmpresaIdForUser(userId, { autoCreate: rol === 'empresa' });
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

    await saveResumenPerfil(empresaId, perfil.resumen);

    return res.json({
      empresa: perfil.empresa,
      perfil: perfil.perfil,
      resumen: perfil.resumen
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

    await saveResumenPerfil(empresaId, perfilActualizado.resumen);

    return res.json({
      ok: true,
      empresa: perfilActualizado.empresa,
      perfil: perfilActualizado.perfil,
      resumen: perfilActualizado.resumen
    });
  } catch (error) {
    return res.status(500).json({
      error: 'PROFILE_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

module.exports = {
  getMyCompanyPerfil,
  updateMyCompanyDatosGenerales
};
