const db = require('../db');

let ensuredCompanyFollowTable = false;

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

function toPageSize(value, fallback = 20, max = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function toTinyBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function isSchemaDriftError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const errno = Number(error.errno || 0);
  return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE' || errno === 1054 || errno === 1146;
}

async function ensureCompanyFollowTable() {
  if (ensuredCompanyFollowTable) return;

  await db.query(
    `CREATE TABLE IF NOT EXISTS candidatos_empresas_seguidas (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      candidato_id BIGINT NOT NULL,
      empresa_id BIGINT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_candidatos_empresas_seguidas_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
      CONSTRAINT fk_candidatos_empresas_seguidas_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      UNIQUE KEY uq_candidatos_empresas_seguidas (candidato_id, empresa_id),
      INDEX idx_candidatos_empresas_seguidas_candidato (candidato_id),
      INDEX idx_candidatos_empresas_seguidas_empresa (empresa_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  ensuredCompanyFollowTable = true;
}

function mapCompanyRow(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    ruc: row.ruc || null,
    email: row.email || null,
    telefono: row.telefono || null,
    tipo: row.tipo || null,
    industria: row.industria || null,
    ubicacion_principal: row.ubicacion_principal || null,
    descripcion: row.descripcion || null,
    sitio_web: row.sitio_web || null,
    linkedin_url: row.linkedin_url || null,
    instagram_url: row.instagram_url || null,
    facebook_url: row.facebook_url || null,
    logo_url: row.logo_url || null,
    stats: {
      seguidores_total: Number(row.seguidores_total || 0),
      vacantes_activas: Number(row.vacantes_activas || 0),
      personas_total: Number(row.personas_total || 0),
      personas_actuales: Number(row.personas_actuales || 0),
      siguiendo: Number(row.siguiendo || 0) === 1
    }
  };
}

function buildInitials(nombres, apellidos) {
  const parts = [String(nombres || '').trim(), String(apellidos || '').trim()]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return 'NA';
  return parts.map((part) => part[0].toUpperCase()).join('');
}

async function listEmpresaPersonasPreview(empresaId, limit = 5) {
  const safeEmpresaId = toPositiveIntOrNull(empresaId);
  if (!safeEmpresaId) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);

  const baseParams = [safeEmpresaId, safeLimit];
  const withPhotoSql = `SELECT
      c.id AS candidato_id,
      c.nombres,
      c.apellidos,
      x.actualmente_trabaja,
      f.ruta_archivo AS foto_url
    FROM (
      SELECT
        ce.candidato_id,
        1 AS actualmente_trabaja,
        MAX(COALESCE(ce.updated_at, ce.created_at)) AS last_experiencia_at
      FROM candidatos_experiencia ce
      WHERE ce.deleted_at IS NULL
        AND ce.empresa_id = ?
        AND ce.actualmente_trabaja = 1
      GROUP BY ce.candidato_id
    ) x
    INNER JOIN candidatos c
      ON c.id = x.candidato_id
     AND c.deleted_at IS NULL
    LEFT JOIN (
      SELECT d.candidato_id, d.ruta_archivo
      FROM candidatos_documentos d
      INNER JOIN (
        SELECT candidato_id, MAX(id) AS max_id
        FROM candidatos_documentos
        WHERE deleted_at IS NULL
          AND tipo_documento = 'foto'
          AND COALESCE(TRIM(ruta_archivo), '') <> ''
        GROUP BY candidato_id
      ) latest
        ON latest.max_id = d.id
    ) f
      ON f.candidato_id = c.id
    ORDER BY
      x.actualmente_trabaja DESC,
      x.last_experiencia_at DESC,
      c.nombres ASC,
      c.apellidos ASC
    LIMIT ?`;

  const noPhotoSql = `SELECT
      c.id AS candidato_id,
      c.nombres,
      c.apellidos,
      x.actualmente_trabaja,
      NULL AS foto_url
    FROM (
      SELECT
        ce.candidato_id,
        1 AS actualmente_trabaja,
        MAX(COALESCE(ce.updated_at, ce.created_at)) AS last_experiencia_at
      FROM candidatos_experiencia ce
      WHERE ce.deleted_at IS NULL
        AND ce.empresa_id = ?
        AND ce.actualmente_trabaja = 1
      GROUP BY ce.candidato_id
    ) x
    INNER JOIN candidatos c
      ON c.id = x.candidato_id
     AND c.deleted_at IS NULL
    ORDER BY
      x.actualmente_trabaja DESC,
      x.last_experiencia_at DESC,
      c.nombres ASC,
      c.apellidos ASC
    LIMIT ?`;

  let rows;
  try {
    const [withPhotoRows] = await db.query(withPhotoSql, baseParams);
    rows = withPhotoRows;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    const [fallbackRows] = await db.query(noPhotoSql, baseParams);
    rows = fallbackRows;
  }

  return rows.map((row) => {
    const nombres = String(row.nombres || '').trim();
    const apellidos = String(row.apellidos || '').trim();
    return {
      candidato_id: Number(row.candidato_id || 0),
      nombre: [nombres, apellidos].filter(Boolean).join(' ') || 'Candidato',
      iniciales: buildInitials(nombres, apellidos),
      foto_url: row.foto_url ? String(row.foto_url).trim() : null,
      actualmente_trabaja: Number(row.actualmente_trabaja || 0) === 1
    };
  });
}

async function listEmpresasPublic({
  q = null,
  page = 1,
  pageSize = 20,
  candidatoId = null,
  soloSeguidas = false
} = {}) {
  await ensureCompanyFollowTable();

  const safePage = toPage(page, 1);
  const safePageSize = toPageSize(pageSize, 20, 100);
  const offset = (safePage - 1) * safePageSize;
  const search = toTextOrNull(q);
  const safeCandidateId = toPositiveIntOrNull(candidatoId);
  const onlyFollowing = Boolean(soloSeguidas) && Boolean(safeCandidateId);

  const where = ['e.deleted_at IS NULL', 'e.activo = 1'];
  const params = [];

  if (search) {
    where.push('(e.nombre LIKE ? OR e.ruc LIKE ? OR ep.industria LIKE ? OR ep.ubicacion_principal LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (onlyFollowing) {
    where.push('myf.candidato_id IS NOT NULL');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM empresas e
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     LEFT JOIN candidatos_empresas_seguidas myf
       ON myf.empresa_id = e.id
      AND myf.candidato_id = ?
     ${whereSql}`,
    [safeCandidateId || 0, ...params]
  );

  const [rows] = await db.query(
    `SELECT
       e.id,
       e.nombre,
       e.ruc,
       e.email,
       e.telefono,
       e.tipo,
       ep.industria,
       ep.ubicacion_principal,
       ep.descripcion,
       ep.sitio_web,
       ep.linkedin_url,
       ep.instagram_url,
       ep.facebook_url,
       ep.logo_url,
       COALESCE(fs.seguidores_total, 0) AS seguidores_total,
       COALESCE(vs.vacantes_activas, 0) AS vacantes_activas,
       COALESCE(xs.personas_total, 0) AS personas_total,
       COALESCE(xs.personas_actuales, 0) AS personas_actuales,
       CASE WHEN myf.candidato_id IS NULL THEN 0 ELSE 1 END AS siguiendo
     FROM empresas e
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     LEFT JOIN (
       SELECT empresa_id, COUNT(*) AS seguidores_total
       FROM candidatos_empresas_seguidas
       GROUP BY empresa_id
     ) fs
       ON fs.empresa_id = e.id
     LEFT JOIN (
       SELECT empresa_id, COUNT(*) AS vacantes_activas
       FROM vacantes_publicadas
       WHERE deleted_at IS NULL
         AND activo = 1
         AND estado = 'activa'
       GROUP BY empresa_id
     ) vs
       ON vs.empresa_id = e.id
     LEFT JOIN (
       SELECT
         empresa_id,
         COUNT(DISTINCT candidato_id) AS personas_total,
         COUNT(DISTINCT CASE WHEN actualmente_trabaja = 1 THEN candidato_id END) AS personas_actuales
       FROM candidatos_experiencia
       WHERE deleted_at IS NULL
         AND empresa_id IS NOT NULL
       GROUP BY empresa_id
     ) xs
       ON xs.empresa_id = e.id
     LEFT JOIN candidatos_empresas_seguidas myf
       ON myf.empresa_id = e.id
      AND myf.candidato_id = ?
     ${whereSql}
     ORDER BY
       COALESCE(vs.vacantes_activas, 0) DESC,
       COALESCE(fs.seguidores_total, 0) DESC,
       e.nombre ASC
     LIMIT ? OFFSET ?`,
    [safeCandidateId || 0, ...params, safePageSize, offset]
  );

  return {
    items: rows.map(mapCompanyRow),
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

async function getEmpresaPublicProfile(empresaId, candidatoId = null) {
  await ensureCompanyFollowTable();

  const safeEmpresaId = toPositiveIntOrNull(empresaId);
  if (!safeEmpresaId) return null;
  const safeCandidateId = toPositiveIntOrNull(candidatoId) || 0;

  const [rows] = await db.query(
    `SELECT
       e.id,
       e.nombre,
       e.ruc,
       e.email,
       e.telefono,
       e.tipo,
       ep.industria,
       ep.ubicacion_principal,
       ep.descripcion,
       ep.sitio_web,
       ep.linkedin_url,
       ep.instagram_url,
       ep.facebook_url,
       ep.logo_url,
       COALESCE(fs.seguidores_total, 0) AS seguidores_total,
       COALESCE(vs.vacantes_activas, 0) AS vacantes_activas,
       COALESCE(xs.personas_total, 0) AS personas_total,
       COALESCE(xs.personas_actuales, 0) AS personas_actuales,
       CASE WHEN myf.candidato_id IS NULL THEN 0 ELSE 1 END AS siguiendo
     FROM empresas e
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     LEFT JOIN (
       SELECT empresa_id, COUNT(*) AS seguidores_total
       FROM candidatos_empresas_seguidas
       GROUP BY empresa_id
     ) fs
       ON fs.empresa_id = e.id
     LEFT JOIN (
       SELECT empresa_id, COUNT(*) AS vacantes_activas
       FROM vacantes_publicadas
       WHERE deleted_at IS NULL
         AND activo = 1
         AND estado = 'activa'
       GROUP BY empresa_id
     ) vs
       ON vs.empresa_id = e.id
     LEFT JOIN (
       SELECT
         empresa_id,
         COUNT(DISTINCT candidato_id) AS personas_total,
         COUNT(DISTINCT CASE WHEN actualmente_trabaja = 1 THEN candidato_id END) AS personas_actuales
       FROM candidatos_experiencia
       WHERE deleted_at IS NULL
         AND empresa_id IS NOT NULL
       GROUP BY empresa_id
     ) xs
       ON xs.empresa_id = e.id
     LEFT JOIN candidatos_empresas_seguidas myf
       ON myf.empresa_id = e.id
      AND myf.candidato_id = ?
     WHERE e.id = ?
       AND e.deleted_at IS NULL
       AND e.activo = 1
     LIMIT 1`,
    [safeCandidateId, safeEmpresaId]
  );

  if (!rows.length) return null;

  const empresa = mapCompanyRow(rows[0]);
  const personasPreview = await listEmpresaPersonasPreview(safeEmpresaId, 5);
  return {
    ...empresa,
    trayectoria_preview: {
      items: personasPreview
    }
  };
}

async function followEmpresa(candidatoId, empresaId) {
  await ensureCompanyFollowTable();

  const safeCandidateId = toPositiveIntOrNull(candidatoId);
  const safeEmpresaId = toPositiveIntOrNull(empresaId);
  if (!safeCandidateId || !safeEmpresaId) return false;

  const [empresaRows] = await db.query(
    `SELECT id
     FROM empresas
     WHERE id = ?
       AND deleted_at IS NULL
       AND activo = 1
     LIMIT 1`,
    [safeEmpresaId]
  );
  if (!empresaRows.length) return false;

  await db.query(
    `INSERT INTO candidatos_empresas_seguidas (candidato_id, empresa_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       created_at = created_at`,
    [safeCandidateId, safeEmpresaId]
  );
  return true;
}

async function unfollowEmpresa(candidatoId, empresaId) {
  await ensureCompanyFollowTable();

  const safeCandidateId = toPositiveIntOrNull(candidatoId);
  const safeEmpresaId = toPositiveIntOrNull(empresaId);
  if (!safeCandidateId || !safeEmpresaId) return 0;

  const [result] = await db.query(
    `DELETE FROM candidatos_empresas_seguidas
     WHERE candidato_id = ?
       AND empresa_id = ?`,
    [safeCandidateId, safeEmpresaId]
  );
  return Number(result?.affectedRows || 0);
}

module.exports = {
  toPositiveIntOrNull,
  toTinyBool,
  listEmpresasPublic,
  getEmpresaPublicProfile,
  followEmpresa,
  unfollowEmpresa
};
