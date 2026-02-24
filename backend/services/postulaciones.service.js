const db = require('../db');
const { toPositiveIntOrNull, normalizePosted } = require('./vacantes.service');

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

function normalizeEstadoProceso(value) {
  const estado = toTextOrNull(value);
  if (!estado) return null;
  if (!['nuevo', 'en_revision', 'entrevista', 'oferta', 'rechazado'].includes(estado)) return null;
  return estado;
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
    where.push('(v.titulo LIKE ? OR e.nombre LIKE ? OR v.provincia LIKE ? OR v.ciudad LIKE ?)');
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
  const [rows] = await db.query(
    `SELECT id, empresa_id, estado, deleted_at
     FROM vacantes_publicadas
     WHERE id = ?
     LIMIT 1`,
    [vacanteId]
  );
  return rows[0] || null;
}

async function existsPostulacion(vacanteId, candidatoId) {
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

async function createPostulacion({ vacanteId, candidatoId, empresaId, origen = 'portal_empleo' }) {
  const [result] = await db.query(
    `INSERT INTO postulaciones (
      vacante_id,
      candidato_id,
      empresa_id,
      estado_proceso,
      fecha_postulacion,
      ultima_actividad,
      origen,
      activo
    ) VALUES (?, ?, ?, 'nuevo', NOW(), NOW(), ?, 1)`,
    [vacanteId, candidatoId, empresaId, origen]
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
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
      p.id,
      p.vacante_id,
      p.empresa_id,
      p.estado_proceso,
      p.fecha_postulacion,
      p.ultima_actividad,
      p.origen,
      v.titulo AS vacante_titulo,
      v.provincia,
      v.ciudad,
      e.nombre AS empresa_nombre
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     LEFT JOIN empresas e
       ON e.id = p.empresa_id
      AND e.deleted_at IS NULL
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
     ${whereSql}
     GROUP BY p.estado_proceso`,
    params
  );

  const byEstado = {
    nuevo: 0,
    en_revision: 0,
    entrevista: 0,
    oferta: 0,
    rechazado: 0
  };

  rows.forEach((row) => {
    const key = normalizeEstadoProceso(row.estado_proceso) || 'nuevo';
    byEstado[key] = Number(row.total || 0);
  });

  const total = Object.values(byEstado).reduce((sum, value) => sum + value, 0);
  const enProceso = byEstado.nuevo + byEstado.en_revision;
  const activos = enProceso + byEstado.entrevista + byEstado.oferta;

  return {
    total,
    by_estado: byEstado,
    en_proceso: enProceso,
    tasa_activa: total > 0 ? Number(((activos / total) * 100).toFixed(2)) : 0
  };
}

async function getPostulacionDetailByCandidato({ candidatoId, postulacionId }) {
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.vacante_id,
      p.empresa_id,
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
      e.nombre AS empresa_nombre
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     LEFT JOIN empresas e
       ON e.id = p.empresa_id
      AND e.deleted_at IS NULL
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
      nombre: row.empresa_nombre
    }
  };
}

async function listPostulacionesByEmpresa({
  empresaId,
  page = 1,
  pageSize = 20,
  vacanteId = null,
  q = null
}) {
  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;
  const safeVacanteId = toPositiveIntOrNull(vacanteId);
  const term = toTextOrNull(q);

  const where = ['p.empresa_id = ?', 'p.deleted_at IS NULL'];
  const params = [empresaId];
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

module.exports = {
  toPositiveIntOrNull,
  normalizeEstadoProceso,
  normalizePosted,
  findCandidatoIdByUserId,
  findVacanteForApply,
  existsPostulacion,
  createPostulacion,
  listPostulacionesByCandidato,
  getPostulacionesResumenByCandidato,
  getPostulacionDetailByCandidato,
  listPostulacionesByEmpresa
};
