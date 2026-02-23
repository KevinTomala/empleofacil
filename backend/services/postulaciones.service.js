const db = require('../db');
const { toPositiveIntOrNull } = require('./vacantes.service');

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

async function listPostulacionesByCandidato({ candidatoId, page = 1, pageSize = 20 }) {
  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM postulaciones p
     INNER JOIN vacantes_publicadas v
       ON v.id = p.vacante_id
      AND v.deleted_at IS NULL
     WHERE p.candidato_id = ?
       AND p.deleted_at IS NULL`,
    [candidatoId]
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
     WHERE p.candidato_id = ?
       AND p.deleted_at IS NULL
     ORDER BY p.fecha_postulacion DESC
     LIMIT ? OFFSET ?`,
    [candidatoId, safePageSize, offset]
  );

  return {
    items: rows,
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
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
  findCandidatoIdByUserId,
  findVacanteForApply,
  existsPostulacion,
  createPostulacion,
  listPostulacionesByCandidato,
  listPostulacionesByEmpresa
};
