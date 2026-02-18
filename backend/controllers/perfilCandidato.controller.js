const {
  findCandidatoIdByUserId,
  existsCandidato,
  getPerfilByCandidatoId,
  updateDatosBasicos,
  upsertByCandidatoIdPk
} = require('../services/perfilCandidato.service');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function toNullIfEmptyString(value) {
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function normalizeString(value) {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeTinyInt(value) {
  if (value === null) return null;
  if (value === true) return 1;
  if (value === false) return 0;
  return value;
}

function isTinyIntLike(value) {
  return value === 0 || value === 1 || value === true || value === false || value === null;
}

function isNullableNumber(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function isNullableDate(value) {
  return value === null || (typeof value === 'string' && DATE_RE.test(value));
}

function isEnum(value, allowed) {
  return value === null || allowed.includes(value);
}

function validatePayloadShape(payload, allowedKeys) {
  if (!isPlainObject(payload)) return false;
  const keys = Object.keys(payload);
  if (!keys.length) return false;
  return keys.every((key) => allowedKeys.includes(key));
}

function validateAndNormalize(section, payload) {
  const normalized = {};

  if (section === 'datos_basicos') {
    const allowed = [
      'centro_id',
      'interesado_id',
      'referente_id',
      'nombres',
      'apellidos',
      'documento_identidad',
      'nacionalidad',
      'fecha_nacimiento',
      'sexo',
      'estado_civil',
      'estado_academico',
      'activo'
    ];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (['centro_id', 'interesado_id', 'referente_id'].includes(key)) {
        if (!(value === null || Number.isInteger(value))) return null;
        normalized[key] = value;
      } else if (['nombres', 'apellidos'].includes(key)) {
        if (typeof value !== 'string' || !value.trim()) return null;
        normalized[key] = value.trim();
      } else if (['documento_identidad', 'nacionalidad'].includes(key)) {
        if (!isNullableString(value)) return null;
        normalized[key] = normalizeString(value);
      } else if (key === 'fecha_nacimiento') {
        if (!isNullableDate(value)) return null;
        normalized[key] = value;
      } else if (key === 'sexo') {
        if (!isEnum(value, ['M', 'F', 'O'])) return null;
        normalized[key] = value;
      } else if (key === 'estado_civil') {
        if (!isEnum(value, ['soltero', 'casado', 'viudo', 'divorciado', 'union_libre'])) return null;
        normalized[key] = value;
      } else if (key === 'estado_academico') {
        if (!isEnum(value, ['preinscrito', 'inscrito', 'matriculado', 'rechazado'])) return null;
        normalized[key] = value;
      } else if (key === 'activo') {
        if (!isTinyIntLike(value)) return null;
        normalized[key] = normalizeTinyInt(value);
      }
    }

    return normalized;
  }

  if (section === 'contacto') {
    const allowed = [
      'email',
      'telefono_fijo',
      'telefono_celular',
      'contacto_emergencia_nombre',
      'contacto_emergencia_telefono'
    ];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (!isNullableString(value)) return null;
      normalized[key] = normalizeString(value);
    }

    return normalized;
  }

  if (section === 'domicilio') {
    const allowed = ['pais', 'provincia', 'canton', 'parroquia', 'direccion', 'codigo_postal'];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (!isNullableString(value)) return null;
      normalized[key] = normalizeString(value);
    }

    return normalized;
  }

  if (section === 'salud') {
    const allowed = ['tipo_sangre', 'estatura', 'peso', 'tatuaje'];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (key === 'tipo_sangre') {
        if (!isEnum(value, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])) return null;
        normalized[key] = value;
      } else if (key === 'tatuaje') {
        if (!isEnum(value, ['no', 'si_visible', 'si_no_visible'])) return null;
        normalized[key] = value;
      } else if (['estatura', 'peso'].includes(key)) {
        if (!isNullableNumber(value)) return null;
        normalized[key] = value;
      }
    }

    return normalized;
  }

  if (section === 'logistica') {
    const allowed = [
      'movilizacion',
      'tipo_vehiculo',
      'licencia',
      'disp_viajar',
      'disp_turnos',
      'disp_fines_semana'
    ];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (['movilizacion', 'disp_viajar', 'disp_turnos', 'disp_fines_semana'].includes(key)) {
        if (!isTinyIntLike(value)) return null;
        normalized[key] = normalizeTinyInt(value);
      } else if (key === 'tipo_vehiculo') {
        if (!isEnum(value, ['automovil', 'bus', 'camion', 'camioneta', 'furgoneta', 'motocicleta', 'trailer', 'tricimoto'])) return null;
        normalized[key] = value;
      } else if (key === 'licencia') {
        if (!isEnum(value, ['A', 'A1', 'B', 'C1', 'C', 'D1', 'D', 'E1', 'E', 'F', 'G'])) return null;
        normalized[key] = value;
      }
    }

    return normalized;
  }

  if (section === 'educacion') {
    const allowed = ['nivel_estudio', 'institucion', 'titulo_obtenido'];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (key === 'nivel_estudio') {
        if (!isEnum(value, ['Educacion Basica', 'Bachillerato', 'Educacion Superior'])) return null;
        normalized[key] = value;
      } else {
        if (!isNullableString(value)) return null;
        normalized[key] = normalizeString(value);
      }
    }

    return normalized;
  }

  return null;
}

function parseCandidatoId(value) {
  const candidateId = Number(value);
  if (!Number.isInteger(candidateId) || candidateId <= 0) return null;
  return candidateId;
}

async function resolveMyCandidatoId(req) {
  const userId = req.user?.id;
  if (!userId) return null;
  return findCandidatoIdByUserId(userId);
}

async function getPerfil(req, res) {
  const perfil = await getPerfilByCandidatoId(req.candidatoId);
  if (!perfil) {
    return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
  }
  return res.json(perfil);
}

async function updateSection(req, res, section) {
  const patch = validateAndNormalize(section, req.body);
  if (!patch) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  if (!(await existsCandidato(req.candidatoId))) {
    return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
  }

  if (section === 'datos_basicos') {
    await updateDatosBasicos(req.candidatoId, patch);
    return res.json({ ok: true });
  }

  const tableBySection = {
    contacto: 'candidatos_contacto',
    domicilio: 'candidatos_domicilio',
    salud: 'candidatos_salud',
    logistica: 'candidatos_logistica',
    educacion: 'candidatos_educacion_general'
  };

  await upsertByCandidatoIdPk(tableBySection[section], req.candidatoId, patch);
  return res.json({ ok: true });
}

async function withMyCandidate(req, res, action) {
  try {
    const candidatoId = await resolveMyCandidatoId(req);
    if (!candidatoId) {
      return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
    }
    req.candidatoId = candidatoId;
    return await action();
  } catch (error) {
    return res.status(500).json({
      error: action.name === 'runGet' ? 'PROFILE_FETCH_FAILED' : 'PROFILE_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function withParamCandidate(req, res, action) {
  try {
    const candidatoId = parseCandidatoId(req.params.candidatoId);
    if (!candidatoId) {
      return res.status(400).json({ error: 'INVALID_CANDIDATO_ID' });
    }
    req.candidatoId = candidatoId;
    return await action();
  } catch (error) {
    return res.status(500).json({
      error: action.name === 'runGet' ? 'PROFILE_FETCH_FAILED' : 'PROFILE_UPDATE_FAILED',
      details: String(error.message || error)
    });
  }
}

async function getMyPerfil(req, res) {
  async function runGet() {
    return getPerfil(req, res);
  }
  return withMyCandidate(req, res, runGet);
}

async function getPerfilById(req, res) {
  async function runGet() {
    return getPerfil(req, res);
  }
  return withParamCandidate(req, res, runGet);
}

function makeMyUpdateHandler(section) {
  return async function handler(req, res) {
    async function runUpdate() {
      return updateSection(req, res, section);
    }
    return withMyCandidate(req, res, runUpdate);
  };
}

function makeIdUpdateHandler(section) {
  return async function handler(req, res) {
    async function runUpdate() {
      return updateSection(req, res, section);
    }
    return withParamCandidate(req, res, runUpdate);
  };
}

module.exports = {
  getMyPerfil,
  getPerfilById,
  updateMyDatosBasicos: makeMyUpdateHandler('datos_basicos'),
  updateMyContacto: makeMyUpdateHandler('contacto'),
  updateMyDomicilio: makeMyUpdateHandler('domicilio'),
  updateMySalud: makeMyUpdateHandler('salud'),
  updateMyLogistica: makeMyUpdateHandler('logistica'),
  updateMyEducacion: makeMyUpdateHandler('educacion'),
  updateDatosBasicosById: makeIdUpdateHandler('datos_basicos'),
  updateContactoById: makeIdUpdateHandler('contacto'),
  updateDomicilioById: makeIdUpdateHandler('domicilio'),
  updateSaludById: makeIdUpdateHandler('salud'),
  updateLogisticaById: makeIdUpdateHandler('logistica'),
  updateEducacionById: makeIdUpdateHandler('educacion')
};
