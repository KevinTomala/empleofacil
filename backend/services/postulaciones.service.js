const db = require('../db');
const { toPositiveIntOrNull, normalizePosted, ensureVacantesSchema } = require('./vacantes.service');

let ensuredPostulacionesSchema = false;

function toPage(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function toPageSize(value, fallback = 20, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isTruthyNumber(value) {
  return Number(value) === 1;
}

function hasFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

function normalizeEstadoProceso(value) {
  const estado = toTextOrNull(value);
  if (!estado) return null;
  if (!['nuevo', 'en_revision', 'contactado', 'entrevista', 'oferta', 'seleccionado', 'descartado', 'finalizado', 'rechazado'].includes(estado)) return null;
  return estado;
}

async function hasColumn(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function isNullableColumn(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT IS_NULLABLE AS is_nullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  if (!rows.length) return false;
  return String(rows[0]?.is_nullable || '').toUpperCase() === 'YES';
}

async function ensurePostulacionesSchema() {
  if (ensuredPostulacionesSchema) return;
  await ensureVacantesSchema();

  if (!(await hasColumn('postulaciones', 'contratante_tipo'))) {
    await db.query(
      "ALTER TABLE postulaciones ADD COLUMN contratante_tipo ENUM('empresa','persona') NOT NULL DEFAULT 'empresa' AFTER empresa_id"
    );
  }

  if (!(await hasColumn('postulaciones', 'contratante_candidato_id'))) {
    await db.query(
      'ALTER TABLE postulaciones ADD COLUMN contratante_candidato_id BIGINT NULL AFTER contratante_tipo'
    );
  }

  if (!(await isNullableColumn('postulaciones', 'empresa_id'))) {
    await db.query('ALTER TABLE postulaciones MODIFY COLUMN empresa_id BIGINT NULL');
  }

  try {
    await db.query(
      'ALTER TABLE postulaciones ADD CONSTRAINT fk_postulaciones_contratante_candidato FOREIGN KEY (contratante_candidato_id) REFERENCES candidatos(id) ON DELETE SET NULL'
    );
  } catch (error) {
    const code = String(error.code || '');
    if (code !== 'ER_DUP_KEYNAME' && code !== 'ER_CANT_CREATE_TABLE' && code !== 'ER_FK_DUP_NAME') {
      throw error;
    }
  }

  try {
    await db.query('CREATE INDEX idx_postulaciones_contratante_tipo ON postulaciones (contratante_tipo)');
  } catch (error) {
    if (String(error.code || '') !== 'ER_DUP_KEYNAME') throw error;
  }

  try {
    await db.query('CREATE INDEX idx_postulaciones_contratante_candidato ON postulaciones (contratante_candidato_id)');
  } catch (error) {
    if (String(error.code || '') !== 'ER_DUP_KEYNAME') throw error;
  }

  ensuredPostulacionesSchema = true;
}

function buildPostedCondition(posted, fieldName = 'p.fecha_postulacion') {
  if (!posted) return null;
  if (posted === 'hoy') return `DATE(${fieldName}) = CURDATE()`;
  if (posted === '7d') return `${fieldName} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
  if (posted === '30d') return `${fieldName} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
  if (posted === '90d') return `${fieldName} >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
  return null;
}

function buildCandidatoWhereClause({ candidatoId, q = null, estado = null, posted = null }) {
  const term = toTextOrNull(q);
  const safeEstado = normalizeEstadoProceso(estado);
  const safePosted = normalizePosted(posted);

  const where = ['p.candidato_id = ?', 'p.deleted_at IS NULL'];
  const params = [candidatoId];

  if (term) {
    const like = `%${term}%`;
    where.push('(v.titulo LIKE ? OR COALESCE(e.nombre, TRIM(CONCAT_WS(\' \', cp.nombres, cp.apellidos)), \'\') LIKE ? OR v.provincia LIKE ? OR v.ciudad LIKE ?)');
    params.push(like, like, like, like);
  }

  if (safeEstado) {
    where.push('p.estado_proceso = ?');
    params.push(safeEstado);
  }

  const postedCondition = buildPostedCondition(safePosted);
  if (postedCondition) where.push(postedCondition);

  return { whereSql: `WHERE ${where.join(' AND ')}`, params };
}

async function findCandidatoIdByUserId(userId) {
  const [rows] = await db.query(
    `SELECT id
     FROM candidatos
     WHERE usuario_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  return rows[0]?.id || null;
}

async function findVacanteForApply(vacanteId) {
  await ensurePostulacionesSchema();
  const [rows] = await db.query(
    `SELECT id, empresa_id, contratante_tipo, contratante_candidato_id, estado, deleted_at
     FROM vacantes_publicadas
     WHERE id = ?
     LIMIT 1`,
    [vacanteId]
  );
  return rows[0] || null;
}

async function getCandidateApplyProfileReadiness(candidatoId) {
  await ensurePostulacionesSchema();
  const [rows] = await db.query(
    `SELECT
      c.nombres,
      c.apellidos,
      c.documento_identidad,
      cc.email,
      cc.telefono_celular,
      cd.provincia,
      cd.canton,
      cd.parroquia,
      cs.tipo_sangre,
      cs.estatura,
      cs.peso,
      cs.tatuaje,
      cl.movilizacion,
      cl.tipo_vehiculo,
      cl.disp_viajar,
      cl.disp_turnos,
      cl.disp_fines_semana,
      ce.nivel_estudio,
      ce.institucion,
      ce.titulo_obtenido,
      (
        SELECT COUNT(*)
        FROM candidatos_formaciones f
        WHERE f.candidato_id = c.id
          AND f.deleted_at IS NULL
      ) AS formacion_count,
      (
        SELECT COUNT(*)
        FROM candidatos_idiomas ci
        WHERE ci.candidato_id = c.id
          AND ci.deleted_at IS NULL
      ) AS idiomas_count,
      (
        SELECT COUNT(*)
        FROM candidatos_experiencia ex
        WHERE ex.candidato_id = c.id
          AND ex.deleted_at IS NULL
      ) AS experiencia_count,
      (
        SELECT COUNT(*)
        FROM candidatos_documentos d
        WHERE d.candidato_id = c.id
          AND d.deleted_at IS NULL
      ) AS documentos_count
     FROM candidatos c
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     LEFT JOIN candidatos_domicilio cd
       ON cd.candidato_id = c.id
      AND cd.deleted_at IS NULL
     LEFT JOIN candidatos_salud cs
       ON cs.candidato_id = c.id
      AND cs.deleted_at IS NULL
     LEFT JOIN candidatos_logistica cl
       ON cl.candidato_id = c.id
      AND cl.deleted_at IS NULL
     LEFT JOIN (
       SELECT ce1.candidato_id, ce1.nivel_estudio, ce1.institucion, ce1.titulo_obtenido
       FROM candidatos_educacion_general ce1
       LEFT JOIN candidatos_educacion_general ce2
         ON ce2.candidato_id = ce1.candidato_id
        AND ce2.deleted_at IS NULL
        AND (
          ce2.updated_at > ce1.updated_at
          OR (ce2.updated_at = ce1.updated_at AND ce2.created_at > ce1.created_at)
        )
       WHERE ce1.deleted_at IS NULL
         AND ce2.candidato_id IS NULL
     ) ce
       ON ce.candidato_id = c.id
     WHERE c.id = ?
       AND c.deleted_at IS NULL
     LIMIT 1`,
    [candidatoId]
  );

  const row = rows[0];
  if (!row) {
    return {
      exists: false,
      is_ready: false,
      missing_sections: ['perfil', 'domicilio', 'movilidad', 'salud', 'formacion', 'idiomas', 'experiencia', 'documentos'],
      missing_fields: [
        'datos_basicos.nombres',
        'datos_basicos.apellidos',
        'datos_basicos.documento_identidad',
        'contacto.email_or_telefono_celular',
        'domicilio.provincia',
        'domicilio.canton',
        'domicilio.parroquia',
        'logistica.(movilizacion|tipo_vehiculo|disp_viajar|disp_turnos|disp_fines_semana)',
        'salud.(tipo_sangre|estatura|peso|tatuaje)',
        'formacion.(educacion_general|formacion_detalle)',
        'idiomas.at_least_one',
        'experiencia.at_least_one',
        'documentos.at_least_one'
      ]
    };
  }

  const missingFields = [];
  const missingSections = [];

  const hasEmail = hasText(row.email);
  const hasPhone = hasText(row.telefono_celular);
  const perfilComplete = hasText(row.nombres)
    && hasText(row.apellidos)
    && hasText(row.documento_identidad)
    && (hasEmail || hasPhone);

  if (!perfilComplete) {
    missingSections.push('perfil');
    if (!hasText(row.nombres)) missingFields.push('datos_basicos.nombres');
    if (!hasText(row.apellidos)) missingFields.push('datos_basicos.apellidos');
    if (!hasText(row.documento_identidad)) missingFields.push('datos_basicos.documento_identidad');
    if (!hasEmail && !hasPhone) missingFields.push('contacto.email_or_telefono_celular');
  }

  const domicilioComplete = hasText(row.provincia) && hasText(row.canton) && hasText(row.parroquia);
  if (!domicilioComplete) {
    missingSections.push('domicilio');
    if (!hasText(row.provincia)) missingFields.push('domicilio.provincia');
    if (!hasText(row.canton)) missingFields.push('domicilio.canton');
    if (!hasText(row.parroquia)) missingFields.push('domicilio.parroquia');
  }

  const movilidadComplete = isTruthyNumber(row.movilizacion)
    || hasText(row.tipo_vehiculo)
    || isTruthyNumber(row.disp_viajar)
    || isTruthyNumber(row.disp_turnos)
    || isTruthyNumber(row.disp_fines_semana);
  if (!movilidadComplete) {
    missingSections.push('movilidad');
    missingFields.push('logistica.(movilizacion|tipo_vehiculo|disp_viajar|disp_turnos|disp_fines_semana)');
  }

  const saludComplete = hasText(row.tipo_sangre)
    || hasFiniteNumber(row.estatura)
    || hasFiniteNumber(row.peso)
    || hasText(row.tatuaje);
  if (!saludComplete) {
    missingSections.push('salud');
    missingFields.push('salud.(tipo_sangre|estatura|peso|tatuaje)');
  }

  const formacionCount = Number(row.formacion_count || 0);
  const formacionComplete = formacionCount > 0
    || hasText(row.nivel_estudio)
    || hasText(row.institucion)
    || hasText(row.titulo_obtenido);
  if (!formacionComplete) {
    missingSections.push('formacion');
    missingFields.push('formacion.(educacion_general|formacion_detalle)');
  }

  const idiomasCount = Number(row.idiomas_count || 0);
  if (idiomasCount <= 0) {
    missingSections.push('idiomas');
    missingFields.push('idiomas.at_least_one');
  }

  const experienciaCount = Number(row.experiencia_count || 0);
  if (experienciaCount <= 0) {
    missingSections.push('experiencia');
    missingFields.push('experiencia.at_least_one');
  }

  const documentosCount = Number(row.documentos_count || 0);
  if (documentosCount <= 0) {
    missingSections.push('documentos');
    missingFields.push('documentos.at_least_one');
  }

  return {
    exists: true,
    is_ready: missingSections.length === 0,
    missing_sections: missingSections,
    missing_fields: missingFields
  };
}

async function existsPostulacion(vacanteId, candidatoId) {
  await ensurePostulacionesSchema();
  const [rows] = await db.query(
    `SELECT id
     FROM postulaciones
     WHERE vacante_id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [vacanteId, candidatoId]
  );
  return Boolean(rows.length);
}

async function createPostulacion({
  vacanteId,
  candidatoId,
  empresaId = null,
  contratanteTipo = 'empresa',
  contratanteCandidatoId = null,
  origen = 'portal_empleo'
}) {
  await ensurePostulacionesSchema();
  const [result] = await db.query(
    `INSERT INTO postulaciones (
      vacante_id,
      candidato_id,
      empresa_id,
      contratante_tipo,
      contratante_candidato_id,
      estado_proceso,
      fecha_postulacion,
      ultima_actividad,
      origen,
      activo
    ) VALUES (?, ?, ?, ?, ?, 'nuevo', NOW(), NOW(), ?, 1)`,
    [vacanteId, candidatoId, empresaId, contratanteTipo, contratanteCandidatoId, origen]
  );
  return { id: result.insertId };
}

async function listPostulacionesByCandidato({
  candidatoId,
  page = 1,
  pageSize = 20,
  q = null,
  estado = null,
  posted = null
}) {
  await ensurePostulacionesSchema();
  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;
  const { whereSql, params } = buildCandidatoWhereClause({ candidatoId, q, estado, posted });

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     LEFT JOIN empresas e
       ON e.id = p.empresa_id
      AND e.deleted_at IS NULL
     LEFT JOIN candidatos cp
       ON cp.id = p.contratante_candidato_id
      AND cp.deleted_at IS NULL
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
      p.id,
      p.vacante_id,
      p.empresa_id,
      p.contratante_tipo,
      p.contratante_candidato_id,
      p.estado_proceso,
      p.fecha_postulacion,
      p.ultima_actividad,
      p.origen,
      v.titulo AS vacante_titulo,
      v.provincia,
      v.ciudad,
      COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp.nombres, cp.apellidos))) AS contratante_nombre,
      COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp.nombres, cp.apellidos))) AS empresa_nombre
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     LEFT JOIN empresas e
       ON e.id = p.empresa_id
      AND e.deleted_at IS NULL
     LEFT JOIN candidatos cp
       ON cp.id = p.contratante_candidato_id
      AND cp.deleted_at IS NULL
     ${whereSql}
     ORDER BY p.fecha_postulacion DESC
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return {
    items: rows,
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

async function getPostulacionesResumenByCandidato({ candidatoId, q = null, posted = null }) {
  await ensurePostulacionesSchema();
  const { whereSql, params } = buildCandidatoWhereClause({ candidatoId, q, posted });

  const [rows] = await db.query(
    `SELECT p.estado_proceso, COUNT(*) AS total
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     LEFT JOIN empresas e
       ON e.id = p.empresa_id
      AND e.deleted_at IS NULL
     LEFT JOIN candidatos cp
       ON cp.id = p.contratante_candidato_id
      AND cp.deleted_at IS NULL
     ${whereSql}
     GROUP BY p.estado_proceso`,
    params
  );

  const byEstado = {
    nuevo: 0,
    en_revision: 0,
    contactado: 0,
    entrevista: 0,
    oferta: 0,
    seleccionado: 0,
    descartado: 0,
    finalizado: 0,
    rechazado: 0
  };

  rows.forEach((row) => {
    const key = normalizeEstadoProceso(row.estado_proceso) || 'nuevo';
    byEstado[key] = Number(row.total || 0);
  });

  const total = Object.values(byEstado).reduce((sum, value) => sum + value, 0);
  const enProceso = byEstado.nuevo + byEstado.en_revision + byEstado.contactado;
  const activos = enProceso + byEstado.entrevista + byEstado.oferta + byEstado.seleccionado;

  return {
    total,
    by_estado: byEstado,
    en_proceso: enProceso,
    tasa_activa: total > 0 ? Number(((activos / total) * 100).toFixed(2)) : 0
  };
}

async function getPostulacionDetailByCandidato({ candidatoId, postulacionId }) {
  await ensurePostulacionesSchema();
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.vacante_id,
      p.empresa_id,
      p.contratante_tipo,
      p.contratante_candidato_id,
      p.estado_proceso,
      p.fecha_postulacion,
      p.ultima_actividad,
      p.origen,
      v.id AS vacante_detalle_id,
      v.titulo AS vacante_titulo,
      v.area AS vacante_area,
      v.provincia AS vacante_provincia,
      v.ciudad AS vacante_ciudad,
      v.modalidad AS vacante_modalidad,
      v.tipo_contrato AS vacante_tipo_contrato,
      v.descripcion AS vacante_descripcion,
      v.requisitos AS vacante_requisitos,
      v.estado AS vacante_estado,
      v.fecha_publicacion AS vacante_fecha_publicacion,
      v.fecha_cierre AS vacante_fecha_cierre,
      e.id AS empresa_detalle_id,
      COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp.nombres, cp.apellidos))) AS contratante_nombre
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     LEFT JOIN empresas e
       ON e.id = p.empresa_id
      AND e.deleted_at IS NULL
     LEFT JOIN candidatos cp
       ON cp.id = p.contratante_candidato_id
      AND cp.deleted_at IS NULL
     WHERE p.id = ?
       AND p.candidato_id = ?
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [postulacionId, candidatoId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    vacante_id: row.vacante_id,
    empresa_id: row.empresa_id,
    contratante_tipo: row.contratante_tipo,
    contratante_candidato_id: row.contratante_candidato_id,
    estado_proceso: row.estado_proceso,
    fecha_postulacion: row.fecha_postulacion,
    ultima_actividad: row.ultima_actividad,
    origen: row.origen,
    vacante: {
      id: row.vacante_detalle_id,
      titulo: row.vacante_titulo,
      area: row.vacante_area,
      provincia: row.vacante_provincia,
      ciudad: row.vacante_ciudad,
      modalidad: row.vacante_modalidad,
      tipo_contrato: row.vacante_tipo_contrato,
      descripcion: row.vacante_descripcion,
      requisitos: row.vacante_requisitos,
      estado: row.vacante_estado,
      fecha_publicacion: row.vacante_fecha_publicacion,
      fecha_cierre: row.vacante_fecha_cierre
    },
    empresa: {
      id: row.empresa_detalle_id,
      nombre: row.contratante_nombre
    },
    contratante: {
      tipo: row.contratante_tipo,
      empresa_id: row.empresa_detalle_id,
      candidato_id: row.contratante_candidato_id,
      nombre: row.contratante_nombre
    }
  };
}

async function listPostulacionesByContratante({
  ownerScope,
  page = 1,
  pageSize = 20,
  vacanteId = null,
  q = null
}) {
  await ensurePostulacionesSchema();
  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;
  const safeVacanteId = toPositiveIntOrNull(vacanteId);
  const term = toTextOrNull(q);

  const where = ['p.deleted_at IS NULL'];
  const params = [];

  if (ownerScope?.type === 'empresa' && ownerScope?.empresaId) {
    where.push("p.contratante_tipo = 'empresa'");
    where.push('p.empresa_id = ?');
    params.push(ownerScope.empresaId);
  } else if (ownerScope?.type === 'persona' && ownerScope?.candidatoId) {
    where.push("p.contratante_tipo = 'persona'");
    where.push('p.contratante_candidato_id = ?');
    params.push(ownerScope.candidatoId);
  } else {
    return {
      items: [],
      page: safePage,
      page_size: safePageSize,
      total: 0
    };
  }

  if (safeVacanteId) {
    where.push('p.vacante_id = ?');
    params.push(safeVacanteId);
  }
  if (term) {
    where.push('(v.titulo LIKE ? OR c.nombres LIKE ? OR c.apellidos LIKE ? OR c.documento_identidad LIKE ? OR cc.email LIKE ?)');
    const like = `%${term}%`;
    params.push(like, like, like, like, like);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     INNER JOIN candidatos c
       ON c.id = p.candidato_id
      AND c.deleted_at IS NULL
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
      p.id,
      p.vacante_id,
      p.candidato_id,
      p.empresa_id,
      p.contratante_tipo,
      p.contratante_candidato_id,
      p.estado_proceso,
      p.fecha_postulacion,
      p.ultima_actividad,
      p.origen,
      v.titulo AS vacante_titulo,
      c.nombres,
      c.apellidos,
      c.documento_identidad,
      cc.email,
      cc.telefono_celular
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     INNER JOIN candidatos c
       ON c.id = p.candidato_id
      AND c.deleted_at IS NULL
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     ${whereSql}
     ORDER BY p.fecha_postulacion DESC
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return {
    items: rows,
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

async function getEmpresaPostulacionForCurriculum({ postulacionId, empresaId }) {
  await ensurePostulacionesSchema();
  const safePostulacionId = toPositiveIntOrNull(postulacionId);
  const safeEmpresaId = toPositiveIntOrNull(empresaId);
  if (!safePostulacionId || !safeEmpresaId) return null;

  const [rows] = await db.query(
    `SELECT
      p.id AS postulacion_id,
      p.candidato_id,
      p.vacante_id
     FROM postulaciones p
     WHERE p.id = ?
       AND p.deleted_at IS NULL
       AND p.contratante_tipo = 'empresa'
       AND p.empresa_id = ?
     LIMIT 1`,
    [safePostulacionId, safeEmpresaId]
  );

  return rows[0] || null;
}

module.exports = {
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
  listPostulacionesByContratante,
  getEmpresaPostulacionForCurriculum,
  listPostulacionesByEmpresa: listPostulacionesByContratante
};
