const db = require('../db');

let ensuredCompanyFollowTable = false;
let ensuredCandidateSocialConfigTable = false;
let ensuredCandidateFollowTable = false;

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

async function ensureCandidateSocialConfigTable() {
  if (ensuredCandidateSocialConfigTable) return;

  await db.query(
    `CREATE TABLE IF NOT EXISTS candidatos_social_config (
      candidato_id BIGINT PRIMARY KEY,
      perfil_publico TINYINT(1) NOT NULL DEFAULT 0,
      alias_publico VARCHAR(120) NULL,
      titular_publico VARCHAR(300) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_candidatos_social_config_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
      INDEX idx_candidatos_social_config_publico (perfil_publico)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  // Keep existing environments aligned with the latest max length.
  await db.query(
    `ALTER TABLE candidatos_social_config
     MODIFY COLUMN titular_publico VARCHAR(300) NULL`
  );

  ensuredCandidateSocialConfigTable = true;
}

async function ensureCandidateFollowTable() {
  if (ensuredCandidateFollowTable) return;

  await db.query(
    `CREATE TABLE IF NOT EXISTS candidatos_seguidos (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      seguidor_candidato_id BIGINT NOT NULL,
      seguido_candidato_id BIGINT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_candidatos_seguidos_seguidor FOREIGN KEY (seguidor_candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
      CONSTRAINT fk_candidatos_seguidos_seguido FOREIGN KEY (seguido_candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
      UNIQUE KEY uq_candidatos_seguidos (seguidor_candidato_id, seguido_candidato_id),
      INDEX idx_candidatos_seguidos_seguidor (seguidor_candidato_id),
      INDEX idx_candidatos_seguidos_seguido (seguido_candidato_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  ensuredCandidateFollowTable = true;
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

function mapCandidateConfigRow(row) {
  return {
    perfil_publico: Number(row?.perfil_publico || 0) === 1,
    alias_publico: row?.alias_publico ? String(row.alias_publico).trim() : null,
    titular_publico: row?.titular_publico ? String(row.titular_publico).trim() : null
  };
}

function mapCandidatePublicRow(row) {
  const nombres = String(row?.nombres || '').trim();
  const apellidos = String(row?.apellidos || '').trim();
  const alias = String(row?.alias_publico || '').trim();
  const nombreMostrar = alias || [nombres, apellidos].filter(Boolean).join(' ') || 'Candidato';
  const titular = String(row?.titular_publico || '').trim() || String(row?.cargo_resumen || '').trim() || 'Perfil profesional en desarrollo';
  const provincia = String(row?.provincia || '').trim();
  const canton = String(row?.canton || '').trim();
  const ubicacion = [provincia, canton].filter(Boolean).join(' - ') || null;

  return {
    id: Number(row?.id || 0),
    nombre: nombreMostrar,
    iniciales: buildInitials(nombres, apellidos),
    foto_url: row?.foto_url ? String(row.foto_url).trim() : null,
    titular,
    ubicacion,
    stats: {
      empresas_actuales: Number(row?.empresas_actuales || 0),
      empresas_totales: Number(row?.empresas_totales || 0),
      idiomas_total: Number(row?.idiomas_total || 0),
      seguidores_total: Number(row?.seguidores_total || 0),
      siguiendo: Number(row?.siguiendo || 0) === 1
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

async function ensureCandidateSocialConfigRow(candidatoId) {
  const safeCandidatoId = toPositiveIntOrNull(candidatoId);
  if (!safeCandidatoId) return null;
  await ensureCandidateSocialConfigTable();

  await db.query(
    `INSERT INTO candidatos_social_config (candidato_id)
     VALUES (?)
     ON DUPLICATE KEY UPDATE
       candidato_id = candidato_id`,
    [safeCandidatoId]
  );
  return safeCandidatoId;
}

async function getCandidateSocialConfig(candidatoId) {
  const safeCandidatoId = await ensureCandidateSocialConfigRow(candidatoId);
  if (!safeCandidatoId) return null;

  const [rows] = await db.query(
    `SELECT candidato_id, perfil_publico, alias_publico, titular_publico
     FROM candidatos_social_config
     WHERE candidato_id = ?
     LIMIT 1`,
    [safeCandidatoId]
  );
  if (!rows.length) return null;
  return mapCandidateConfigRow(rows[0]);
}

async function updateCandidateSocialConfig(candidatoId, patch = {}) {
  const safeCandidatoId = await ensureCandidateSocialConfigRow(candidatoId);
  if (!safeCandidatoId) return null;

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(patch, 'perfil_publico')) {
    updates.perfil_publico = toTinyBool(patch.perfil_publico) ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'alias_publico')) {
    updates.alias_publico = toTextOrNull(patch.alias_publico);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'titular_publico')) {
    updates.titular_publico = toTextOrNull(patch.titular_publico);
  }

  const keys = Object.keys(updates);
  if (keys.length) {
    const setSql = keys.map((key) => `${key} = ?`).join(', ');
    await db.query(
      `UPDATE candidatos_social_config
       SET ${setSql}
       WHERE candidato_id = ?`,
      [...keys.map((key) => updates[key]), safeCandidatoId]
    );
  }

  return getCandidateSocialConfig(safeCandidatoId);
}

async function listPublicCandidates({
  q = null,
  page = 1,
  pageSize = 20,
  excludeCandidatoId = null,
  viewerCandidatoId = null
} = {}) {
  await ensureCandidateSocialConfigTable();
  await ensureCandidateFollowTable();

  const safePage = toPage(page, 1);
  const safePageSize = toPageSize(pageSize, 20, 100);
  const offset = (safePage - 1) * safePageSize;
  const search = toTextOrNull(q);
  const safeExcludeId = toPositiveIntOrNull(excludeCandidatoId);
  const safeViewerId = toPositiveIntOrNull(viewerCandidatoId) || 0;

  const where = [
    'c.deleted_at IS NULL',
    'c.activo = 1',
    'cfg.perfil_publico = 1'
  ];
  const params = [];

  if (safeExcludeId) {
    where.push('c.id <> ?');
    params.push(safeExcludeId);
  }

  if (search) {
    const like = `%${search}%`;
    where.push(`(
      c.nombres LIKE ?
      OR c.apellidos LIKE ?
      OR cfg.alias_publico LIKE ?
      OR cfg.titular_publico LIKE ?
      OR d.provincia LIKE ?
      OR d.canton LIKE ?
      OR ex.cargo_resumen LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM candidatos c
     INNER JOIN candidatos_social_config cfg
       ON cfg.candidato_id = c.id
     LEFT JOIN candidatos_seguidos myf
       ON myf.seguido_candidato_id = c.id
      AND myf.seguidor_candidato_id = ?
     LEFT JOIN candidatos_domicilio d
       ON d.candidato_id = c.id
      AND d.deleted_at IS NULL
     LEFT JOIN (
       SELECT
         ce.candidato_id,
         COUNT(DISTINCT CASE WHEN ce.empresa_id IS NOT NULL THEN ce.empresa_id END) AS empresas_totales,
         COUNT(DISTINCT CASE WHEN ce.actualmente_trabaja = 1 AND ce.empresa_id IS NOT NULL THEN ce.empresa_id END) AS empresas_actuales,
         SUBSTRING_INDEX(
           GROUP_CONCAT(COALESCE(ce.cargo, '') ORDER BY COALESCE(ce.updated_at, ce.created_at) DESC SEPARATOR '||'),
           '||',
           1
         ) AS cargo_resumen
       FROM candidatos_experiencia ce
       WHERE ce.deleted_at IS NULL
       GROUP BY ce.candidato_id
     ) ex
       ON ex.candidato_id = c.id
     ${whereSql}`,
    [safeViewerId, ...params]
  );

  const [rows] = await db.query(
    `SELECT
       c.id,
       c.nombres,
       c.apellidos,
       cfg.alias_publico,
       cfg.titular_publico,
       d.provincia,
       d.canton,
       ex.empresas_totales,
       ex.empresas_actuales,
       ex.cargo_resumen,
       COALESCE(idm.idiomas_total, 0) AS idiomas_total,
       COALESCE(fs.seguidores_total, 0) AS seguidores_total,
       f.foto_url,
       CASE WHEN myf.seguidor_candidato_id IS NULL THEN 0 ELSE 1 END AS siguiendo
     FROM candidatos c
     INNER JOIN candidatos_social_config cfg
       ON cfg.candidato_id = c.id
     LEFT JOIN (
       SELECT seguido_candidato_id, COUNT(*) AS seguidores_total
       FROM candidatos_seguidos
       GROUP BY seguido_candidato_id
     ) fs
       ON fs.seguido_candidato_id = c.id
     LEFT JOIN candidatos_seguidos myf
       ON myf.seguido_candidato_id = c.id
      AND myf.seguidor_candidato_id = ?
     LEFT JOIN candidatos_domicilio d
       ON d.candidato_id = c.id
      AND d.deleted_at IS NULL
     LEFT JOIN (
       SELECT
         ce.candidato_id,
         COUNT(DISTINCT CASE WHEN ce.empresa_id IS NOT NULL THEN ce.empresa_id END) AS empresas_totales,
         COUNT(DISTINCT CASE WHEN ce.actualmente_trabaja = 1 AND ce.empresa_id IS NOT NULL THEN ce.empresa_id END) AS empresas_actuales,
         SUBSTRING_INDEX(
           GROUP_CONCAT(COALESCE(ce.cargo, '') ORDER BY COALESCE(ce.updated_at, ce.created_at) DESC SEPARATOR '||'),
           '||',
           1
         ) AS cargo_resumen
       FROM candidatos_experiencia ce
       WHERE ce.deleted_at IS NULL
       GROUP BY ce.candidato_id
     ) ex
       ON ex.candidato_id = c.id
     LEFT JOIN (
       SELECT candidato_id, COUNT(*) AS idiomas_total
       FROM candidatos_idiomas
       WHERE deleted_at IS NULL
       GROUP BY candidato_id
     ) idm
       ON idm.candidato_id = c.id
     LEFT JOIN (
       SELECT d1.candidato_id, d1.ruta_archivo AS foto_url
       FROM candidatos_documentos d1
       INNER JOIN (
         SELECT candidato_id, MAX(id) AS max_id
         FROM candidatos_documentos
         WHERE deleted_at IS NULL
           AND tipo_documento = 'foto'
           AND COALESCE(TRIM(ruta_archivo), '') <> ''
         GROUP BY candidato_id
       ) d2
         ON d2.max_id = d1.id
     ) f
       ON f.candidato_id = c.id
     ${whereSql}
     ORDER BY
       COALESCE(ex.empresas_actuales, 0) DESC,
       COALESCE(ex.empresas_totales, 0) DESC,
       c.nombres ASC,
       c.apellidos ASC
     LIMIT ? OFFSET ?`,
    [safeViewerId, ...params, safePageSize, offset]
  );

  return {
    items: rows.map(mapCandidatePublicRow),
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
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

async function followCandidate(candidatoId, targetCandidatoId) {
  await ensureCandidateFollowTable();
  await ensureCandidateSocialConfigTable();

  const safeCandidatoId = toPositiveIntOrNull(candidatoId);
  const safeTargetId = toPositiveIntOrNull(targetCandidatoId);
  if (!safeCandidatoId || !safeTargetId) return false;
  if (safeCandidatoId === safeTargetId) return -1;

  await ensureCandidateSocialConfigRow(safeTargetId);

  const [targetRows] = await db.query(
    `SELECT c.id
     FROM candidatos c
     INNER JOIN candidatos_social_config cfg
       ON cfg.candidato_id = c.id
     WHERE c.id = ?
       AND c.deleted_at IS NULL
       AND c.activo = 1
       AND cfg.perfil_publico = 1
     LIMIT 1`,
    [safeTargetId]
  );
  if (!targetRows.length) return 0;

  await db.query(
    `INSERT INTO candidatos_seguidos (seguidor_candidato_id, seguido_candidato_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       created_at = created_at`,
    [safeCandidatoId, safeTargetId]
  );
  return 1;
}

async function unfollowCandidate(candidatoId, targetCandidatoId) {
  await ensureCandidateFollowTable();

  const safeCandidatoId = toPositiveIntOrNull(candidatoId);
  const safeTargetId = toPositiveIntOrNull(targetCandidatoId);
  if (!safeCandidatoId || !safeTargetId) return 0;

  const [result] = await db.query(
    `DELETE FROM candidatos_seguidos
     WHERE seguidor_candidato_id = ?
       AND seguido_candidato_id = ?`,
    [safeCandidatoId, safeTargetId]
  );
  return Number(result?.affectedRows || 0);
}

module.exports = {
  toPositiveIntOrNull,
  toTinyBool,
  listEmpresasPublic,
  getEmpresaPublicProfile,
  followEmpresa,
  unfollowEmpresa,
  getCandidateSocialConfig,
  updateCandidateSocialConfig,
  listPublicCandidates,
  followCandidate,
  unfollowCandidate
};
