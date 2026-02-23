const {
  findCandidatoIdByUserId,
  existsCandidato,
  getPerfilByCandidatoId,
  updateDatosBasicos,
  upsertByCandidatoIdPk,
  listEducacionGeneralItems,
  createEducacionGeneralItem,
  updateEducacionGeneralItem,
  deleteEducacionGeneralItem,
  upsertEducacionGeneralSummary,
  listIdiomas,
  createIdioma,
  updateIdioma,
  deleteIdioma,
  listExperiencias,
  createExperiencia,
  updateExperiencia,
  deleteExperiencia,
  getExperienciaCertificado,
  createExperienciaCertificado,
  updateExperienciaCertificado,
  deleteExperienciaCertificado,
  listCentrosCapacitacion,
  listEmpresasExperiencia,
  listFormacion,
  createFormacion,
  updateFormacion,
  deleteFormacion,
  getFormacionCertificado,
  createFormacionCertificado,
  updateFormacionCertificado,
  deleteFormacionCertificado,
  listDocumentos,
  createDocumento,
  updateDocumento,
  deleteDocumento
} = require('../services/perfilCandidato.service');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const IDIOMA_NIVELES = ['Basico', 'Intermedio', 'Avanzado', 'Nativo'];
const CONTRATO_TIPOS = ['temporal', 'indefinido', 'practicante', 'otro'];
const FORMACION_CATEGORIAS = ['externa'];
const FORMACION_SUBTIPOS = {
  externa: ['curso', 'ministerio', 'ministerio_i', 'chofer_profesional']
};
const FORMACION_SUBTIPOS_ALL = [
  ...FORMACION_SUBTIPOS.externa
];
const DOCUMENTO_TIPOS = [
  'documento_identidad',
  'carnet_tipo_sangre',
  'libreta_militar',
  'certificado_antecedentes',
  'certificado_consejo_judicatura',
  'examen_toxicologico',
  'examen_psicologico',
  'registro_biometrico',
  'licencia_conducir',
  'certificado_estudios',
  'foto',
  'carta_compromiso',
  'otro'
];
const DOCUMENTO_ESTADOS = ['pendiente', 'aprobado', 'rechazado', 'vencido'];
const CERTIFICADO_ESTADOS = ['pendiente', 'aprobado', 'rechazado', 'vencido'];

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

function parseNullableNumber(value) {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function parseNullablePositiveInt(value) {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return NaN;
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
      'nombres',
      'apellidos',
      'documento_identidad',
      'nacionalidad',
      'fecha_nacimiento',
      'sexo',
      'estado_civil',
      'activo'
    ];
    if (!validatePayloadShape(payload, allowed)) return null;

    for (const [key, raw] of Object.entries(payload)) {
      const value = toNullIfEmptyString(raw);
      if (['nombres', 'apellidos'].includes(key)) {
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
        const parsed = parseNullableNumber(value);
        if (!isNullableNumber(parsed)) return null;
        normalized[key] = parsed;
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

function validateIdiomaPayload(payload, { partial = false } = {}) {
  const allowed = ['idioma', 'nivel'];
  if (!validatePayloadShape(payload, allowed)) return null;

  const normalized = {};
  for (const [key, raw] of Object.entries(payload)) {
    const value = toNullIfEmptyString(raw);
    if (key === 'idioma') {
      if (typeof value !== 'string' || !value.trim()) return null;
      normalized.idioma = value.trim();
    }
    if (key === 'nivel') {
      if (!isEnum(value, IDIOMA_NIVELES)) return null;
      normalized.nivel = value;
    }
  }

  if (!partial) {
    if (!normalized.idioma || !normalized.nivel) return null;
  }

  return normalized;
}

function validateEducacionGeneralItemPayload(payload, { partial = false } = {}) {
  const allowed = ['nivel_estudio', 'institucion', 'titulo_obtenido'];
  if (!validatePayloadShape(payload, allowed)) return null;

  const normalized = {};
  for (const [key, raw] of Object.entries(payload)) {
    const value = toNullIfEmptyString(raw);
    if (key === 'nivel_estudio') {
      if (!isEnum(value, ['Educacion Basica', 'Bachillerato', 'Educacion Superior'])) return null;
      normalized.nivel_estudio = value;
    } else {
      if (!isNullableString(value)) return null;
      normalized[key] = normalizeString(value);
    }
  }

  if (!partial && !normalized.nivel_estudio) return null;
  return normalized;
}

function validateExperienciaPayload(payload, { partial = false } = {}) {
  const allowed = ['empresa_id', 'empresa_nombre', 'cargo', 'fecha_inicio', 'fecha_fin', 'actualmente_trabaja', 'tipo_contrato', 'descripcion'];
  if (!validatePayloadShape(payload, allowed)) return null;

  const normalized = {};
  for (const [key, raw] of Object.entries(payload)) {
    const value = toNullIfEmptyString(raw);

    if (key === 'empresa_id') {
      if (!(value === null || Number.isInteger(value))) return null;
      normalized.empresa_id = value;
    } else if (key === 'empresa_nombre') {
      if (!isNullableString(value)) return null;
      normalized.empresa_nombre = normalizeString(value);
    } else if (key === 'cargo') {
      if (!isNullableString(value)) return null;
      normalized.cargo = normalizeString(value);
    } else if (key === 'fecha_inicio' || key === 'fecha_fin') {
      if (!isNullableDate(value)) return null;
      normalized[key] = value;
    } else if (key === 'actualmente_trabaja') {
      if (!isTinyIntLike(value)) return null;
      normalized.actualmente_trabaja = normalizeTinyInt(value);
    } else if (key === 'tipo_contrato') {
      if (!isEnum(value, CONTRATO_TIPOS)) return null;
      normalized.tipo_contrato = value;
    } else if (key === 'descripcion') {
      if (!isNullableString(value)) return null;
      normalized.descripcion = normalizeString(value);
    }
  }

  if (!partial) {
    if (!normalized.cargo) return null;
    if (!normalized.empresa_id && !normalized.empresa_nombre) return null;
  }

  return normalized;
}

function validateFormacionPayload(payload, { partial = false } = {}) {
  const allowed = [
    'fecha_aprobacion',
    'activo',
    'categoria_formacion',
    'subtipo_formacion',
    'centro_cliente_id',
    'institucion',
    'nombre_programa',
    'titulo_obtenido',
    'entidad_emisora',
    'numero_registro',
    'fecha_emision',
    'fecha_vencimiento'
  ];

  if (!validatePayloadShape(payload, allowed)) return null;

  const normalized = {};
  for (const [key, raw] of Object.entries(payload)) {
    const value = toNullIfEmptyString(raw);

    if (key === 'activo') {
      if (!isTinyIntLike(value)) return null;
      normalized.activo = normalizeTinyInt(value);
    } else if (['fecha_aprobacion', 'fecha_emision', 'fecha_vencimiento'].includes(key)) {
      if (!isNullableDate(value)) return null;
      normalized[key] = value;
    } else if (key === 'centro_cliente_id') {
      const parsed = parseNullablePositiveInt(value);
      if (Number.isNaN(parsed)) return null;
      normalized.centro_cliente_id = parsed;
    } else if (key === 'categoria_formacion') {
      if (!isEnum(value, FORMACION_CATEGORIAS)) return null;
      normalized.categoria_formacion = value;
    } else if (key === 'subtipo_formacion') {
      if (!isEnum(value, FORMACION_SUBTIPOS_ALL)) return null;
      normalized.subtipo_formacion = value;
    } else {
      if (!isNullableString(value)) return null;
      normalized[key] = normalizeString(value);
    }
  }

  if (!partial) {
    if (!normalized.categoria_formacion || !normalized.subtipo_formacion) return null;
  } else {
    const hasCategoria = Object.prototype.hasOwnProperty.call(normalized, 'categoria_formacion');
    const hasSubtipo = Object.prototype.hasOwnProperty.call(normalized, 'subtipo_formacion');
    if (hasCategoria !== hasSubtipo) return null;
  }

  if (normalized.categoria_formacion && !normalized.subtipo_formacion) return null;
  if (normalized.subtipo_formacion && !normalized.categoria_formacion) return null;

  if (normalized.categoria_formacion && normalized.subtipo_formacion) {
    const allowedSubtypes = FORMACION_SUBTIPOS[normalized.categoria_formacion] || [];
    if (!allowedSubtypes.includes(normalized.subtipo_formacion)) return null;
  }

  return normalized;
}

function validateDocumentoMetaPayload(payload, { allowEstado = false } = {}) {
  const allowed = ['tipo_documento', 'fecha_emision', 'fecha_vencimiento', 'numero_documento', 'descripcion', 'observaciones'];
  if (allowEstado) allowed.push('estado');
  if (!validatePayloadShape(payload, allowed)) return null;

  const normalized = {};
  for (const [key, raw] of Object.entries(payload)) {
    const value = toNullIfEmptyString(raw);
    if (key === 'tipo_documento') {
      if (!isEnum(value, DOCUMENTO_TIPOS)) return null;
      normalized.tipo_documento = value;
    } else if (key === 'estado') {
      if (!isEnum(value, DOCUMENTO_ESTADOS)) return null;
      normalized.estado = value;
    } else if (key === 'fecha_emision' || key === 'fecha_vencimiento') {
      if (!isNullableDate(value)) return null;
      normalized[key] = value;
    } else {
      if (!isNullableString(value)) return null;
      normalized[key] = normalizeString(value);
    }
  }

  return normalized;
}

function validateCertificadoMetaPayload(payload) {
  const allowed = ['fecha_emision', 'descripcion', 'estado'];
  if (!validatePayloadShape(payload, allowed)) return null;

  const normalized = {};
  for (const [key, raw] of Object.entries(payload)) {
    const value = toNullIfEmptyString(raw);
    if (key === 'fecha_emision') {
      if (!isNullableDate(value)) return null;
      normalized.fecha_emision = value;
    } else if (key === 'estado') {
      if (!isEnum(value, CERTIFICADO_ESTADOS)) return null;
      normalized.estado = value;
    } else {
      if (!isNullableString(value)) return null;
      normalized.descripcion = normalizeString(value);
    }
  }

  return normalized;
}

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function handleFormacionServiceError(res, error) {
  const code = String(error?.code || '');
  if (code === 'FORMACION_INSTITUCION_REQUIRED') {
    return res.status(422).json({ error: 'FORMACION_INSTITUCION_REQUIRED' });
  }
  if (code === 'CENTRO_CAPACITACION_NOT_FOUND') {
    return res.status(400).json({ error: 'CENTRO_CAPACITACION_NOT_FOUND' });
  }
  return null;
}

function resolveErrorCodeByAction(action) {
  return action === 'fetch' ? 'PROFILE_FETCH_FAILED' : 'PROFILE_UPDATE_FAILED';
}

async function resolveMyCandidatoId(req) {
  const userId = req.user?.id;
  if (!userId) return null;
  return findCandidatoIdByUserId(userId);
}

async function withResolvedCandidate(req, res, mode, action, callback) {
  try {
    let candidatoId;
    if (mode === 'me') {
      candidatoId = await resolveMyCandidatoId(req);
      if (!candidatoId) {
        return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
      }
    } else {
      candidatoId = parsePositiveInt(req.params.candidatoId);
      if (!candidatoId) {
        return res.status(400).json({ error: 'INVALID_CANDIDATO_ID' });
      }
    }

    req.candidatoId = candidatoId;
    return await callback(candidatoId);
  } catch (error) {
    return res.status(500).json({
      error: resolveErrorCodeByAction(action),
      details: String(error.message || error)
    });
  }
}

async function ensureCandidateExistsOr404(res, candidatoId) {
  const exists = await existsCandidato(candidatoId);
  if (!exists) {
    res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
    return false;
  }
  return true;
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

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;

  if (section === 'datos_basicos') {
    await updateDatosBasicos(req.candidatoId, patch);
    return res.json({ ok: true });
  }

  const tableBySection = {
    contacto: 'candidatos_contacto',
    domicilio: 'candidatos_domicilio',
    salud: 'candidatos_salud',
    logistica: 'candidatos_logistica'
  };

  if (section === 'educacion') {
    await upsertEducacionGeneralSummary(req.candidatoId, patch);
    return res.json({ ok: true });
  }

  await upsertByCandidatoIdPk(tableBySection[section], req.candidatoId, patch);
  return res.json({ ok: true });
}

async function listIdiomasHandler(req, res) {
  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const items = await listIdiomas(req.candidatoId);
  return res.json({ items });
}

async function listEducacionGeneralItemsHandler(req, res) {
  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const items = await listEducacionGeneralItems(req.candidatoId);
  return res.json({ items });
}

async function createEducacionGeneralItemHandler(req, res) {
  const payload = validateEducacionGeneralItemPayload(req.body || {}, { partial: false });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const created = await createEducacionGeneralItem(req.candidatoId, payload);
  return res.status(201).json({ ok: true, id: created.id });
}

async function updateEducacionGeneralItemHandler(req, res) {
  const itemId = parsePositiveInt(req.params.educacionGeneralId);
  if (!itemId) return res.status(400).json({ error: 'INVALID_EDUCACION_GENERAL_ID' });

  const payload = validateEducacionGeneralItemPayload(req.body || {}, { partial: true });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await updateEducacionGeneralItem(req.candidatoId, itemId, payload);
  if (!affected) return res.status(404).json({ error: 'EDUCACION_GENERAL_NOT_FOUND' });
  return res.json({ ok: true });
}

async function deleteEducacionGeneralItemHandler(req, res) {
  const itemId = parsePositiveInt(req.params.educacionGeneralId);
  if (!itemId) return res.status(400).json({ error: 'INVALID_EDUCACION_GENERAL_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteEducacionGeneralItem(req.candidatoId, itemId);
  if (!affected) return res.status(404).json({ error: 'EDUCACION_GENERAL_NOT_FOUND' });
  return res.json({ ok: true });
}

async function createIdiomaHandler(req, res) {
  const payload = validateIdiomaPayload(req.body || {}, { partial: false });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const created = await createIdioma(req.candidatoId, payload);
  return res.status(201).json({ ok: true, id: created.id });
}

async function updateIdiomaHandler(req, res) {
  const idiomaId = parsePositiveInt(req.params.idiomaId);
  if (!idiomaId) return res.status(400).json({ error: 'INVALID_IDIOMA_ID' });

  const payload = validateIdiomaPayload(req.body || {}, { partial: true });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await updateIdioma(req.candidatoId, idiomaId, payload);
  if (!affected) return res.status(404).json({ error: 'IDIOMA_NOT_FOUND' });
  return res.json({ ok: true });
}

async function deleteIdiomaHandler(req, res) {
  const idiomaId = parsePositiveInt(req.params.idiomaId);
  if (!idiomaId) return res.status(400).json({ error: 'INVALID_IDIOMA_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteIdioma(req.candidatoId, idiomaId);
  if (!affected) return res.status(404).json({ error: 'IDIOMA_NOT_FOUND' });
  return res.json({ ok: true });
}

async function listExperienciaHandler(req, res) {
  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const items = await listExperiencias(req.candidatoId);
  return res.json({ items });
}

async function createExperienciaHandler(req, res) {
  const payload = validateExperienciaPayload(req.body || {}, { partial: false });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const created = await createExperiencia(req.candidatoId, payload);
  return res.status(201).json({ ok: true, id: created.id });
}

async function updateExperienciaHandler(req, res) {
  const experienciaId = parsePositiveInt(req.params.experienciaId);
  if (!experienciaId) return res.status(400).json({ error: 'INVALID_EXPERIENCIA_ID' });

  const payload = validateExperienciaPayload(req.body || {}, { partial: true });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await updateExperiencia(req.candidatoId, experienciaId, payload);
  if (!affected) return res.status(404).json({ error: 'EXPERIENCIA_NOT_FOUND' });
  return res.json({ ok: true });
}

async function deleteExperienciaHandler(req, res) {
  const experienciaId = parsePositiveInt(req.params.experienciaId);
  if (!experienciaId) return res.status(400).json({ error: 'INVALID_EXPERIENCIA_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteExperiencia(req.candidatoId, experienciaId);
  if (!affected) return res.status(404).json({ error: 'EXPERIENCIA_NOT_FOUND' });
  return res.json({ ok: true });
}

async function getExperienciaCertificadoHandler(req, res) {
  const experienciaId = parsePositiveInt(req.params.experienciaId);
  if (!experienciaId) return res.status(400).json({ error: 'INVALID_EXPERIENCIA_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const result = await getExperienciaCertificado(req.candidatoId, experienciaId);
  if (!result.exists) return res.status(404).json({ error: 'EXPERIENCIA_NOT_FOUND' });
  return res.json({ item: result.certificado });
}

async function createExperienciaCertificadoHandler(req, res) {
  const experienciaId = parsePositiveInt(req.params.experienciaId);
  if (!experienciaId) return res.status(400).json({ error: 'INVALID_EXPERIENCIA_ID' });
  if (!req.file) return res.status(400).json({ error: 'FILE_REQUIRED' });

  const meta = validateCertificadoMetaPayload(req.body || {});
  if (req.body && Object.keys(req.body).length && !meta) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;

  const certificado = await createExperienciaCertificado(req.candidatoId, experienciaId, {
    nombre_archivo: req.file.filename,
    nombre_original: req.file.originalname,
    ruta_archivo: `/uploads/candidatos/${req.file.filename}`,
    tipo_mime: req.file.mimetype,
    tamanio_kb: Math.max(1, Math.round(req.file.size / 1024)),
    fecha_emision: meta?.fecha_emision ?? null,
    descripcion: meta?.descripcion ?? null,
    estado: meta?.estado ?? 'pendiente'
  });

  if (!certificado) return res.status(404).json({ error: 'EXPERIENCIA_NOT_FOUND' });
  return res.status(201).json({ ok: true, id: certificado.id });
}

async function updateExperienciaCertificadoHandler(req, res) {
  const experienciaId = parsePositiveInt(req.params.experienciaId);
  if (!experienciaId) return res.status(400).json({ error: 'INVALID_EXPERIENCIA_ID' });

  const meta = validateCertificadoMetaPayload(req.body || {});
  if (req.body && Object.keys(req.body).length && !meta) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const patch = { ...(meta || {}) };
  if (req.file) {
    patch.nombre_archivo = req.file.filename;
    patch.nombre_original = req.file.originalname;
    patch.ruta_archivo = `/uploads/candidatos/${req.file.filename}`;
    patch.tipo_mime = req.file.mimetype;
    patch.tamanio_kb = Math.max(1, Math.round(req.file.size / 1024));
  }

  if (!Object.keys(patch).length) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;

  const affected = await updateExperienciaCertificado(req.candidatoId, experienciaId, patch);
  if (affected === -1) return res.status(404).json({ error: 'EXPERIENCIA_NOT_FOUND' });
  if (!affected) return res.status(404).json({ error: 'CERTIFICADO_NOT_FOUND' });
  return res.json({ ok: true });
}

async function deleteExperienciaCertificadoHandler(req, res) {
  const experienciaId = parsePositiveInt(req.params.experienciaId);
  if (!experienciaId) return res.status(400).json({ error: 'INVALID_EXPERIENCIA_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteExperienciaCertificado(req.candidatoId, experienciaId);
  if (affected === -1) return res.status(404).json({ error: 'EXPERIENCIA_NOT_FOUND' });
  if (!affected) return res.status(404).json({ error: 'CERTIFICADO_NOT_FOUND' });
  return res.json({ ok: true });
}

async function listCentrosCapacitacionHandler(req, res) {
  const search = typeof req.query?.search === 'string' ? req.query.search : null;
  const limit = parsePositiveInt(req.query?.limit) || 20;
  const items = await listCentrosCapacitacion({ search, limit });
  return res.json({ items });
}

async function listEmpresasExperienciaHandler(req, res) {
  const search = typeof req.query?.search === 'string' ? req.query.search : null;
  const limit = parsePositiveInt(req.query?.limit) || 30;
  const items = await listEmpresasExperiencia({ search, limit });
  return res.json({ items });
}

async function listFormacionHandler(req, res) {
  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const items = await listFormacion(req.candidatoId);
  return res.json({ items });
}

async function createFormacionHandler(req, res) {
  const payload = validateFormacionPayload(req.body || {}, { partial: false });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  try {
    const created = await createFormacion(req.candidatoId, payload);
    return res.status(201).json({ ok: true, id: created.id });
  } catch (error) {
    const handled = handleFormacionServiceError(res, error);
    if (handled) return handled;
    throw error;
  }
}

async function updateFormacionHandler(req, res) {
  const formacionId = parsePositiveInt(req.params.formacionId);
  if (!formacionId) return res.status(400).json({ error: 'INVALID_FORMACION_ID' });

  const payload = validateFormacionPayload(req.body || {}, { partial: true });
  if (!payload) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  try {
    const affected = await updateFormacion(req.candidatoId, formacionId, payload);
    if (!affected) return res.status(404).json({ error: 'FORMACION_NOT_FOUND' });
    return res.json({ ok: true });
  } catch (error) {
    const handled = handleFormacionServiceError(res, error);
    if (handled) return handled;
    throw error;
  }
}

async function deleteFormacionHandler(req, res) {
  const formacionId = parsePositiveInt(req.params.formacionId);
  if (!formacionId) return res.status(400).json({ error: 'INVALID_FORMACION_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteFormacion(req.candidatoId, formacionId);
  if (!affected) return res.status(404).json({ error: 'FORMACION_NOT_FOUND' });
  return res.json({ ok: true });
}

async function getFormacionCertificadoHandler(req, res) {
  const formacionId = parsePositiveInt(req.params.formacionId);
  if (!formacionId) return res.status(400).json({ error: 'INVALID_FORMACION_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const result = await getFormacionCertificado(req.candidatoId, formacionId);
  if (!result.exists) return res.status(404).json({ error: 'FORMACION_NOT_FOUND' });
  if (!result.allowed) return res.status(400).json({ error: 'FORMACION_CERTIFICADO_NOT_ALLOWED' });
  return res.json({ item: result.certificado });
}

async function createFormacionCertificadoHandler(req, res) {
  const formacionId = parsePositiveInt(req.params.formacionId);
  if (!formacionId) return res.status(400).json({ error: 'INVALID_FORMACION_ID' });
  if (!req.file) return res.status(400).json({ error: 'FILE_REQUIRED' });

  const meta = validateCertificadoMetaPayload(req.body || {});
  if (req.body && Object.keys(req.body).length && !meta) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const cert = await createFormacionCertificado(req.candidatoId, formacionId, {
    nombre_archivo: req.file.filename,
    nombre_original: req.file.originalname,
    ruta_archivo: `/uploads/candidatos/${req.file.filename}`,
    tipo_mime: req.file.mimetype,
    tamanio_kb: Math.max(1, Math.round(req.file.size / 1024)),
    fecha_emision: meta?.fecha_emision ?? null,
    descripcion: meta?.descripcion ?? null,
    estado: meta?.estado ?? 'pendiente'
  });

  if (cert === 0) return res.status(404).json({ error: 'FORMACION_NOT_FOUND' });
  if (cert === -1) return res.status(400).json({ error: 'FORMACION_CERTIFICADO_NOT_ALLOWED' });
  return res.status(201).json({ ok: true, id: cert.id });
}

async function updateFormacionCertificadoHandler(req, res) {
  const formacionId = parsePositiveInt(req.params.formacionId);
  if (!formacionId) return res.status(400).json({ error: 'INVALID_FORMACION_ID' });

  const meta = validateCertificadoMetaPayload(req.body || {});
  if (req.body && Object.keys(req.body).length && !meta) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const patch = { ...(meta || {}) };
  if (req.file) {
    patch.nombre_archivo = req.file.filename;
    patch.nombre_original = req.file.originalname;
    patch.ruta_archivo = `/uploads/candidatos/${req.file.filename}`;
    patch.tipo_mime = req.file.mimetype;
    patch.tamanio_kb = Math.max(1, Math.round(req.file.size / 1024));
  }

  if (!Object.keys(patch).length) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await updateFormacionCertificado(req.candidatoId, formacionId, patch);
  if (affected === -1) return res.status(404).json({ error: 'FORMACION_NOT_FOUND' });
  if (affected === -2) return res.status(400).json({ error: 'FORMACION_CERTIFICADO_NOT_ALLOWED' });
  if (!affected) return res.status(404).json({ error: 'CERTIFICADO_NOT_FOUND' });
  return res.json({ ok: true });
}

async function deleteFormacionCertificadoHandler(req, res) {
  const formacionId = parsePositiveInt(req.params.formacionId);
  if (!formacionId) return res.status(400).json({ error: 'INVALID_FORMACION_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteFormacionCertificado(req.candidatoId, formacionId);
  if (affected === -1) return res.status(404).json({ error: 'FORMACION_NOT_FOUND' });
  if (affected === -2) return res.status(400).json({ error: 'FORMACION_CERTIFICADO_NOT_ALLOWED' });
  if (!affected) return res.status(404).json({ error: 'CERTIFICADO_NOT_FOUND' });
  return res.json({ ok: true });
}

async function listDocumentosHandler(req, res) {
  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const items = await listDocumentos(req.candidatoId);
  return res.json({ items });
}

async function createDocumentoHandler(req, res) {
  const tipoDocumento = req.body?.tipo_documento;
  if (!DOCUMENTO_TIPOS.includes(tipoDocumento)) {
    return res.status(400).json({ error: 'INVALID_TIPO_DOCUMENTO' });
  }
  if (req.body?.fecha_emision && !DATE_RE.test(String(req.body.fecha_emision))) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }
  if (req.body?.fecha_vencimiento && !DATE_RE.test(String(req.body.fecha_vencimiento))) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'FILE_REQUIRED' });
  }

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;

  const payload = {
    tipo_documento: tipoDocumento,
    nombre_archivo: req.file.filename,
    nombre_original: req.file.originalname,
    ruta_archivo: `/uploads/candidatos/${req.file.filename}`,
    tipo_mime: req.file.mimetype,
    tamanio_kb: Math.max(1, Math.round(req.file.size / 1024)),
    fecha_emision: req.body?.fecha_emision || null,
    fecha_vencimiento: req.body?.fecha_vencimiento || null,
    numero_documento: req.body?.numero_documento || null,
    descripcion: req.body?.descripcion || null,
    observaciones: req.body?.observaciones || null,
    subido_por: req.user?.id || null,
    estado: 'pendiente'
  };

  const created = await createDocumento(req.candidatoId, payload);
  return res.status(201).json({ ok: true, id: created.id });
}

async function updateDocumentoHandler(req, res, { allowEstado }) {
  const documentoId = parsePositiveInt(req.params.documentoId);
  if (!documentoId) return res.status(400).json({ error: 'INVALID_DOCUMENTO_ID' });

  const patch = validateDocumentoMetaPayload(req.body || {}, { allowEstado });
  if (!patch) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

  if (allowEstado && patch.estado) {
    patch.verificado_por = req.user?.id || null;
    patch.fecha_verificacion = new Date();
  }

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await updateDocumento(req.candidatoId, documentoId, patch);
  if (!affected) return res.status(404).json({ error: 'DOCUMENTO_NOT_FOUND' });
  return res.json({ ok: true });
}

async function deleteDocumentoHandler(req, res) {
  const documentoId = parsePositiveInt(req.params.documentoId);
  if (!documentoId) return res.status(400).json({ error: 'INVALID_DOCUMENTO_ID' });

  if (!(await ensureCandidateExistsOr404(res, req.candidatoId))) return;
  const affected = await deleteDocumento(req.candidatoId, documentoId);
  if (!affected) return res.status(404).json({ error: 'DOCUMENTO_NOT_FOUND' });
  return res.json({ ok: true });
}

async function getMyPerfil(req, res) {
  return withResolvedCandidate(req, res, 'me', 'fetch', async () => getPerfil(req, res));
}

async function getPerfilById(req, res) {
  return withResolvedCandidate(req, res, 'id', 'fetch', async () => getPerfil(req, res));
}

function makeMyUpdateHandler(section) {
  return async function handler(req, res) {
    return withResolvedCandidate(req, res, 'me', 'update', async () => updateSection(req, res, section));
  };
}

function makeIdUpdateHandler(section) {
  return async function handler(req, res) {
    return withResolvedCandidate(req, res, 'id', 'update', async () => updateSection(req, res, section));
  };
}

function makeCandidateScopeHandler(mode, handler, action = 'fetch') {
  return async function wrapped(req, res) {
    return withResolvedCandidate(req, res, mode, action, async () => handler(req, res));
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
  updateEducacionById: makeIdUpdateHandler('educacion'),

  listMyEducacionGeneralItems: makeCandidateScopeHandler('me', listEducacionGeneralItemsHandler, 'fetch'),
  createMyEducacionGeneralItem: makeCandidateScopeHandler('me', createEducacionGeneralItemHandler, 'update'),
  updateMyEducacionGeneralItem: makeCandidateScopeHandler('me', updateEducacionGeneralItemHandler, 'update'),
  deleteMyEducacionGeneralItem: makeCandidateScopeHandler('me', deleteEducacionGeneralItemHandler, 'update'),
  listEducacionGeneralItemsById: makeCandidateScopeHandler('id', listEducacionGeneralItemsHandler, 'fetch'),
  createEducacionGeneralItemById: makeCandidateScopeHandler('id', createEducacionGeneralItemHandler, 'update'),
  updateEducacionGeneralItemById: makeCandidateScopeHandler('id', updateEducacionGeneralItemHandler, 'update'),
  deleteEducacionGeneralItemById: makeCandidateScopeHandler('id', deleteEducacionGeneralItemHandler, 'update'),

  listMyIdiomas: makeCandidateScopeHandler('me', listIdiomasHandler, 'fetch'),
  createMyIdioma: makeCandidateScopeHandler('me', createIdiomaHandler, 'update'),
  updateMyIdioma: makeCandidateScopeHandler('me', updateIdiomaHandler, 'update'),
  deleteMyIdioma: makeCandidateScopeHandler('me', deleteIdiomaHandler, 'update'),
  listIdiomasById: makeCandidateScopeHandler('id', listIdiomasHandler, 'fetch'),
  createIdiomaById: makeCandidateScopeHandler('id', createIdiomaHandler, 'update'),
  updateIdiomaById: makeCandidateScopeHandler('id', updateIdiomaHandler, 'update'),
  deleteIdiomaById: makeCandidateScopeHandler('id', deleteIdiomaHandler, 'update'),

  listMyExperiencia: makeCandidateScopeHandler('me', listExperienciaHandler, 'fetch'),
  createMyExperiencia: makeCandidateScopeHandler('me', createExperienciaHandler, 'update'),
  updateMyExperiencia: makeCandidateScopeHandler('me', updateExperienciaHandler, 'update'),
  deleteMyExperiencia: makeCandidateScopeHandler('me', deleteExperienciaHandler, 'update'),
  listExperienciaById: makeCandidateScopeHandler('id', listExperienciaHandler, 'fetch'),
  createExperienciaById: makeCandidateScopeHandler('id', createExperienciaHandler, 'update'),
  updateExperienciaById: makeCandidateScopeHandler('id', updateExperienciaHandler, 'update'),
  deleteExperienciaById: makeCandidateScopeHandler('id', deleteExperienciaHandler, 'update'),

  getMyExperienciaCertificado: makeCandidateScopeHandler('me', getExperienciaCertificadoHandler, 'fetch'),
  createMyExperienciaCertificado: makeCandidateScopeHandler('me', createExperienciaCertificadoHandler, 'update'),
  updateMyExperienciaCertificado: makeCandidateScopeHandler('me', updateExperienciaCertificadoHandler, 'update'),
  deleteMyExperienciaCertificado: makeCandidateScopeHandler('me', deleteExperienciaCertificadoHandler, 'update'),
  getExperienciaCertificadoById: makeCandidateScopeHandler('id', getExperienciaCertificadoHandler, 'fetch'),
  createExperienciaCertificadoById: makeCandidateScopeHandler('id', createExperienciaCertificadoHandler, 'update'),
  updateExperienciaCertificadoById: makeCandidateScopeHandler('id', updateExperienciaCertificadoHandler, 'update'),
  deleteExperienciaCertificadoById: makeCandidateScopeHandler('id', deleteExperienciaCertificadoHandler, 'update'),

  listCentrosCapacitacion: listCentrosCapacitacionHandler,
  listEmpresasExperiencia: listEmpresasExperienciaHandler,
  listMyFormacion: makeCandidateScopeHandler('me', listFormacionHandler, 'fetch'),
  createMyFormacion: makeCandidateScopeHandler('me', createFormacionHandler, 'update'),
  updateMyFormacion: makeCandidateScopeHandler('me', updateFormacionHandler, 'update'),
  deleteMyFormacion: makeCandidateScopeHandler('me', deleteFormacionHandler, 'update'),
  listFormacionById: makeCandidateScopeHandler('id', listFormacionHandler, 'fetch'),
  createFormacionById: makeCandidateScopeHandler('id', createFormacionHandler, 'update'),
  updateFormacionById: makeCandidateScopeHandler('id', updateFormacionHandler, 'update'),
  deleteFormacionById: makeCandidateScopeHandler('id', deleteFormacionHandler, 'update'),

  getMyFormacionCertificado: makeCandidateScopeHandler('me', getFormacionCertificadoHandler, 'fetch'),
  createMyFormacionCertificado: makeCandidateScopeHandler('me', createFormacionCertificadoHandler, 'update'),
  updateMyFormacionCertificado: makeCandidateScopeHandler('me', updateFormacionCertificadoHandler, 'update'),
  deleteMyFormacionCertificado: makeCandidateScopeHandler('me', deleteFormacionCertificadoHandler, 'update'),
  getFormacionCertificadoById: makeCandidateScopeHandler('id', getFormacionCertificadoHandler, 'fetch'),
  createFormacionCertificadoById: makeCandidateScopeHandler('id', createFormacionCertificadoHandler, 'update'),
  updateFormacionCertificadoById: makeCandidateScopeHandler('id', updateFormacionCertificadoHandler, 'update'),
  deleteFormacionCertificadoById: makeCandidateScopeHandler('id', deleteFormacionCertificadoHandler, 'update'),

  listMyDocumentos: makeCandidateScopeHandler('me', listDocumentosHandler, 'fetch'),
  createMyDocumento: makeCandidateScopeHandler('me', createDocumentoHandler, 'update'),
  updateMyDocumento: makeCandidateScopeHandler('me', (req, res) => updateDocumentoHandler(req, res, { allowEstado: false }), 'update'),
  deleteMyDocumento: makeCandidateScopeHandler('me', deleteDocumentoHandler, 'update'),

  listDocumentosById: makeCandidateScopeHandler('id', listDocumentosHandler, 'fetch'),
  createDocumentoById: makeCandidateScopeHandler('id', createDocumentoHandler, 'update'),
  updateDocumentoById: makeCandidateScopeHandler('id', (req, res) => updateDocumentoHandler(req, res, { allowEstado: true }), 'update'),
  deleteDocumentoById: makeCandidateScopeHandler('id', deleteDocumentoHandler, 'update')
};

