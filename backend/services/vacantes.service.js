const db = require('../db');

function toTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function toPositiveIntOrNull(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

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

function normalizeEstado(value) {
  const estado = toTextOrNull(value);
  if (!estado) return null;
  if (!['borrador', 'activa', 'pausada', 'cerrada'].includes(estado)) return null;
  return estado;
}

function normalizeModalidad(value) {
  const modalidad = toTextOrNull(value);
  if (!modalidad) return null;
  if (!['presencial', 'remoto', 'hibrido'].includes(modalidad)) return null;
  return modalidad;
}

function normalizeTipoContrato(value) {
  const tipo = toTextOrNull(value);
  if (!tipo) return null;
  if (!['tiempo_completo', 'medio_tiempo', 'por_horas', 'temporal', 'indefinido', 'otro'].includes(tipo)) return null;
  return tipo;
}

function normalizePosted(value) {
  const posted = toTextOrNull(value);
  if (!posted) return null;
  if (!['hoy', '7d', '30d', '90d'].includes(posted)) return null;
  return posted;
}

function isSchemaDriftError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const errno = Number(error.errno || 0);
  return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE' || errno === 1054 || errno === 1146;
}

async function fetchEmpresaExperienciaStats(empresaIds = []) {
  const uniqueIds = Array.from(
    new Set(
      (Array.isArray(empresaIds) ? empresaIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
  if (!uniqueIds.length) return new Map();

  const placeholders = uniqueIds.map(() => '?').join(', ');
  try {
    const [rows] = await db.query(
      `SELECT
         empresa_id,
         COUNT(DISTINCT candidato_id) AS personas_total,
         COUNT(DISTINCT CASE WHEN actualmente_trabaja = 1 THEN candidato_id END) AS personas_actuales
       FROM candidatos_experiencia
       WHERE deleted_at IS NULL
         AND empresa_id IN (${placeholders})
       GROUP BY empresa_id`,
      uniqueIds
    );

    const stats = new Map();
    rows.forEach((row) => {
      const empresaId = Number(row?.empresa_id || 0);
      if (!empresaId) return;
      stats.set(empresaId, {
        personas_total: Number(row?.personas_total || 0),
        personas_actuales: Number(row?.personas_actuales || 0)
      });
    });
    return stats;
  } catch (error) {
    if (isSchemaDriftError(error)) return new Map();
    throw error;
  }
}

function buildVacantesWhereClause(filters, { ownEmpresaId = null, onlyActive = false } = {}) {
  const where = ['v.deleted_at IS NULL', 'v.activo = 1'];
  const params = [];

  if (ownEmpresaId) {
    where.push('v.empresa_id = ?');
    params.push(ownEmpresaId);
  } else if (onlyActive) {
    where.push("v.estado = 'activa'");
  }

  if (filters.q) {
    where.push('(v.titulo LIKE ? OR v.area LIKE ? OR v.provincia LIKE ? OR v.ciudad LIKE ? OR e.nombre LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like, like, like);
  }

  if (filters.provincia) {
    where.push('v.provincia = ?');
    params.push(filters.provincia);
  }
  if (filters.ciudad) {
    where.push('v.ciudad = ?');
    params.push(filters.ciudad);
  }
  if (filters.area) {
    where.push('v.area = ?');
    params.push(filters.area);
  }
  if (filters.modalidad) {
    where.push('v.modalidad = ?');
    params.push(filters.modalidad);
  }
  if (filters.tipoContrato) {
    where.push('v.tipo_contrato = ?');
    params.push(filters.tipoContrato);
  }
  if (filters.estado) {
    where.push('v.estado = ?');
    params.push(filters.estado);
  }
  if (filters.posted) {
    if (filters.posted === 'hoy') {
      where.push('DATE(v.fecha_publicacion) = CURDATE()');
    } else if (filters.posted === '7d') {
      where.push('v.fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    } else if (filters.posted === '30d') {
      where.push('v.fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    } else if (filters.posted === '90d') {
      where.push('v.fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 90 DAY)');
    }
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

async function listVacantes({
  page = 1,
  pageSize = 20,
  q = null,
  provincia = null,
  ciudad = null,
  area = null,
  modalidad = null,
  tipoContrato = null,
  estado = null,
  posted = null
} = {}, { ownEmpresaId = null, onlyActive = false } = {}) {
  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;

  const filters = {
    q: toTextOrNull(q),
    provincia: toTextOrNull(provincia),
    ciudad: toTextOrNull(ciudad),
    area: toTextOrNull(area),
    modalidad: normalizeModalidad(modalidad),
    tipoContrato: normalizeTipoContrato(tipoContrato),
    estado: normalizeEstado(estado),
    posted: normalizePosted(posted)
  };

  const { whereSql, params } = buildVacantesWhereClause(filters, { ownEmpresaId, onlyActive });

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM vacantes_publicadas v
     INNER JOIN empresas e
       ON e.id = v.empresa_id
      AND e.deleted_at IS NULL
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
      v.id,
      v.empresa_id,
      v.publicado_por,
      e.nombre AS empresa_nombre,
      v.titulo,
      v.area,
      v.provincia,
      v.ciudad,
      v.modalidad,
      v.tipo_contrato,
      v.descripcion,
      v.requisitos,
      v.estado,
      v.fecha_publicacion,
      v.fecha_cierre,
      v.created_at,
      v.updated_at
     FROM vacantes_publicadas v
     INNER JOIN empresas e
       ON e.id = v.empresa_id
      AND e.deleted_at IS NULL
     ${whereSql}
     ORDER BY v.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  const statsByEmpresaId = await fetchEmpresaExperienciaStats(rows.map((row) => row.empresa_id));
  const items = rows.map((row) => {
    const stats = statsByEmpresaId.get(Number(row.empresa_id)) || { personas_total: 0, personas_actuales: 0 };
    return {
      ...row,
      empresa_personas_total: stats.personas_total,
      empresa_personas_actuales: stats.personas_actuales
    };
  });

  return {
    items,
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

async function createVacante(empresaId, publicadoPor, payload) {
  const [result] = await db.query(
    `INSERT INTO vacantes_publicadas (
      empresa_id,
      publicado_por,
      titulo,
      area,
      provincia,
      ciudad,
      modalidad,
      tipo_contrato,
      descripcion,
      requisitos,
      estado,
      fecha_publicacion,
      fecha_cierre,
      activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)`,
    [
      empresaId,
      publicadoPor,
      payload.titulo,
      payload.area ?? null,
      payload.provincia ?? null,
      payload.ciudad ?? null,
      payload.modalidad ?? 'presencial',
      payload.tipo_contrato ?? 'tiempo_completo',
      payload.descripcion ?? null,
      payload.requisitos ?? null,
      payload.estado ?? 'borrador',
      payload.fecha_cierre ?? null
    ]
  );
  return { id: result.insertId };
}

async function findVacanteById(vacanteId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, estado, deleted_at
     FROM vacantes_publicadas
     WHERE id = ?
     LIMIT 1`,
    [vacanteId]
  );
  return rows[0] || null;
}

async function updateVacante(vacanteId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return 0;
  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE vacantes_publicadas
     SET ${setSql}, updated_at = NOW()
     WHERE id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => patch[key]), vacanteId]
  );
  return result.affectedRows;
}

module.exports = {
  toPositiveIntOrNull,
  normalizeEstado,
  normalizeModalidad,
  normalizeTipoContrato,
  normalizePosted,
  listVacantes,
  createVacante,
  findVacanteById,
  updateVacante
};
