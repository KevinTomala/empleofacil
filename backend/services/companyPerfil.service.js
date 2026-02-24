const db = require('../db');

const VALID_ROLES_EMPRESA = ['admin', 'reclutador', 'visor'];
const VALID_ESTADOS_EMPRESA_USUARIO = ['activo', 'inactivo'];
const VALID_MODALIDADES = ['presencial', 'hibrido', 'remoto'];
const VALID_NIVELES_EXPERIENCIA = ['junior', 'semi_senior', 'senior'];
const VALID_MOTIVOS_DESACTIVACION_EMPRESA = [
  'sin_vacantes',
  'poca_calidad_candidatos',
  'costo_alto',
  'pausa_temporal',
  'problema_tecnico',
  'otro'
];
const VALID_MOTIVOS_REACTIVACION_EMPRESA = [
  'nuevas_vacantes',
  'mejor_experiencia',
  'continuar_procesos',
  'resolver_problemas',
  'otro'
];
const VALID_ESTADOS_REACTIVACION_EMPRESA = ['pendiente', 'en_revision', 'aprobada', 'rechazada'];

let ensuredPreferenciasTable = false;
let ensuredDesactivacionesTable = false;
let ensuredReactivacionesTable = false;

function createServiceError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function isSchemaDriftError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const errno = Number(error.errno || 0);
  return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE' || errno === 1054 || errno === 1146;
}

function normalizeCompanyName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

async function linkExperienciasByEmpresaName(empresaId, empresaNombre, connection = db) {
  const safeEmpresaId = Number(empresaId);
  const safeNombre = normalizeCompanyName(empresaNombre);
  if (!Number.isInteger(safeEmpresaId) || safeEmpresaId <= 0 || !safeNombre) return 0;

  try {
    const [result] = await connection.query(
      `UPDATE candidatos_experiencia ce
       SET ce.empresa_id = ?,
           ce.empresa_nombre = ?,
           ce.updated_at = NOW()
       WHERE ce.deleted_at IS NULL
         AND ce.empresa_id IS NULL
         AND ce.empresa_origen IS NULL
         AND ce.empresa_nombre IS NOT NULL
         AND LOWER(TRIM(ce.empresa_nombre)) = LOWER(TRIM(?))`,
      [safeEmpresaId, safeNombre, safeNombre]
    );
    return Number(result?.affectedRows || 0);
  } catch (error) {
    if (isSchemaDriftError(error)) return 0;
    throw error;
  }
}

async function linkExperienciasByEmpresaId(empresaId, connection = db) {
  const safeEmpresaId = Number(empresaId);
  if (!Number.isInteger(safeEmpresaId) || safeEmpresaId <= 0) return 0;

  try {
    const [rows] = await connection.query(
      `SELECT id, nombre
       FROM empresas
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [safeEmpresaId]
    );
    const empresa = rows[0];
    if (!empresa?.nombre) return 0;
    return linkExperienciasByEmpresaName(empresa.id, empresa.nombre, connection);
  } catch (error) {
    if (isSchemaDriftError(error)) return 0;
    throw error;
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
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

function sanitizeModalidades(values) {
  const normalized = normalizeStringArray(values).filter((item) => VALID_MODALIDADES.includes(item));
  return normalized;
}

function sanitizeNivelesExperiencia(values) {
  const normalized = normalizeStringArray(values).filter((item) => VALID_NIVELES_EXPERIENCIA.includes(item));
  return normalized;
}

function normalizeReasonCodes(values, allowedCodes) {
  const normalized = normalizeStringArray(values);
  if (!normalized.length) return null;
  if (!normalized.every((item) => allowedCodes.includes(item))) return null;
  return normalized;
}

function normalizePositiveIntArray(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

async function findEmpresaIdByUserId(userId) {
  const [rows] = await db.query(
    `SELECT e.id
     FROM empresas_usuarios eu
     INNER JOIN empresas e
       ON e.id = eu.empresa_id
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     WHERE eu.usuario_id = ?
       AND eu.estado = 'activo'
       AND e.deleted_at IS NULL
     ORDER BY
       eu.principal DESC,
       CASE WHEN ep.empresa_id IS NULL THEN 1 ELSE 0 END ASC,
       eu.id ASC
     LIMIT 1`,
    [userId]
  );

  return rows[0]?.id || null;
}

async function createEmpresaForUser(userId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      `SELECT id, email, nombre_completo, rol
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const user = users[0];
    if (!user || user.rol !== 'empresa') {
      await connection.rollback();
      return null;
    }

    const nombreEmpresa = String(user.nombre_completo || '').trim() || `Empresa ${user.id}`;
    const emailEmpresa = String(user.email || '').trim() || null;

    const [insertEmpresa] = await connection.query(
      `INSERT INTO empresas (nombre, email, tipo, activo)
       VALUES (?, ?, 'externa', 1)`,
      [nombreEmpresa, emailEmpresa]
    );

    const empresaId = insertEmpresa.insertId;

    await linkExperienciasByEmpresaName(empresaId, nombreEmpresa, connection);

    await connection.query(
      `INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
       VALUES (?, ?, 'admin', 1, 'activo')`,
      [empresaId, user.id]
    );

    await connection.commit();
    return empresaId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function attachEmpresaByUserEmail(userId) {
  const [users] = await db.query(
    `SELECT id, email, rol
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = users[0];
  if (!user || user.rol !== 'empresa') return null;

  const email = String(user.email || '').trim();
  if (!email) return null;

  const [empresas] = await db.query(
    `SELECT id
     FROM empresas
     WHERE email = ?
       AND deleted_at IS NULL
     ORDER BY id ASC
     LIMIT 1`,
    [email]
  );

  const empresa = empresas[0];
  if (!empresa) return null;

  await db.query(
    `INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
     VALUES (?, ?, 'admin', 1, 'activo')
     ON DUPLICATE KEY UPDATE
       rol_empresa = VALUES(rol_empresa),
       estado = 'activo',
       principal = IF(principal = 1, 1, VALUES(principal))`,
    [empresa.id, user.id]
  );

  await linkExperienciasByEmpresaId(empresa.id);

  return empresa.id;
}

async function resolveEmpresaIdForUser(userId, { autoCreate = false } = {}) {
  if (!userId) return null;

  const existing = await findEmpresaIdByUserId(userId);
  if (existing) return existing;

  if (!autoCreate) return null;

  const attached = await attachEmpresaByUserEmail(userId);
  if (attached) return attached;

  return createEmpresaForUser(userId);
}

async function resolveEmpresaIdForUserAnyState(userId) {
  if (!userId) return null;

  const [links] = await db.query(
    `SELECT eu.empresa_id
     FROM empresas_usuarios eu
     WHERE eu.usuario_id = ?
     ORDER BY eu.principal DESC, eu.id DESC
     LIMIT 1`,
    [userId]
  );

  if (links[0]?.empresa_id) {
    return links[0].empresa_id;
  }

  const [users] = await db.query(
    `SELECT email, rol
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = users[0];
  if (!user || user.rol !== 'empresa') return null;

  const email = String(user.email || '').trim();
  if (!email) return null;

  const [empresas] = await db.query(
    `SELECT id
     FROM empresas
     WHERE email = ?
     ORDER BY id DESC
     LIMIT 1`,
    [email]
  );

  return empresas[0]?.id || null;
}

function buildResumen(empresa, perfil) {
  const checks = [
    { key: 'nombre', label: 'Nombre', done: Boolean(String(empresa?.nombre || '').trim()) },
    { key: 'industria', label: 'Industria', done: Boolean(String(perfil?.industria || '').trim()) },
    {
      key: 'ubicacion_principal',
      label: 'Ubicacion',
      done: Boolean(String(perfil?.ubicacion_principal || '').trim())
    },
    {
      key: 'tamano_empleados',
      label: 'Tamano',
      done: Number.isInteger(perfil?.tamano_empleados) && perfil.tamano_empleados > 0
    },
    {
      key: 'descripcion',
      label: 'Descripcion',
      done: Boolean(String(perfil?.descripcion || '').trim())
    },
    {
      key: 'sitio_web',
      label: 'Sitio web',
      done: Boolean(String(perfil?.sitio_web || '').trim())
    },
    {
      key: 'instagram_url',
      label: 'Instagram',
      done: Boolean(String(perfil?.instagram_url || '').trim())
    },
    {
      key: 'facebook_url',
      label: 'Facebook',
      done: Boolean(String(perfil?.facebook_url || '').trim())
    },
    {
      key: 'logo_url',
      label: 'Logo',
      done: Boolean(String(perfil?.logo_url || '').trim())
    }
  ];

  const completados = checks.filter((item) => item.done).length;
  const porcentaje = Math.round((completados / checks.length) * 100);
  const camposPendientes = checks.filter((item) => !item.done).map((item) => item.label);

  return {
    porcentaje_completitud: porcentaje,
    campos_pendientes: camposPendientes
  };
}

async function getPerfilByEmpresaId(empresaId) {
  const [rows] = await db.query(
    `SELECT
      e.id AS e_id,
      e.nombre AS e_nombre,
      e.ruc AS e_ruc,
      e.email AS e_email,
      e.telefono AS e_telefono,
      e.tipo AS e_tipo,
      e.activo AS e_activo,
      ep.industria AS ep_industria,
      ep.ubicacion_principal AS ep_ubicacion_principal,
      ep.tamano_empleados AS ep_tamano_empleados,
      ep.descripcion AS ep_descripcion,
      ep.cultura AS ep_cultura,
      ep.beneficios AS ep_beneficios,
      ep.sitio_web AS ep_sitio_web,
      ep.linkedin_url AS ep_linkedin_url,
      ep.instagram_url AS ep_instagram_url,
      ep.facebook_url AS ep_facebook_url,
      ep.logo_url AS ep_logo_url,
      ep.porcentaje_completitud AS ep_porcentaje_completitud,
      ep.campos_pendientes AS ep_campos_pendientes
     FROM empresas e
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     WHERE e.id = ?
       AND e.deleted_at IS NULL
     LIMIT 1`,
    [empresaId]
  );

  const row = rows[0];
  if (!row) return null;

  const empresa = {
    id: row.e_id,
    nombre: row.e_nombre,
    ruc: row.e_ruc,
    email: row.e_email,
    telefono: row.e_telefono,
    tipo: row.e_tipo,
    activo: row.e_activo
  };

  const perfil = {
    industria: row.ep_industria,
    ubicacion_principal: row.ep_ubicacion_principal,
    tamano_empleados: row.ep_tamano_empleados,
    descripcion: row.ep_descripcion,
    cultura: row.ep_cultura,
    beneficios: parseJsonArray(row.ep_beneficios),
    sitio_web: row.ep_sitio_web,
    linkedin_url: row.ep_linkedin_url,
    instagram_url: row.ep_instagram_url,
    facebook_url: row.ep_facebook_url,
    logo_url: row.ep_logo_url
  };

  const resumen = buildResumen(empresa, perfil);

  return {
    empresa,
    perfil,
    resumen_guardado: {
      porcentaje_completitud: row.ep_porcentaje_completitud,
      campos_pendientes: parseJsonArray(row.ep_campos_pendientes)
    },
    resumen
  };
}

async function updateEmpresa(empresaId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  await db.query(
    `UPDATE empresas
     SET ${setSql}
     WHERE id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => patch[key]), empresaId]
  );

  if (Object.prototype.hasOwnProperty.call(patch, 'nombre')) {
    await linkExperienciasByEmpresaId(empresaId);
  }
}

async function upsertPerfilEmpresa(empresaId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const columns = ['empresa_id', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [empresaId, ...keys.map((key) => patch[key])];
  const updateSql = keys.map((key) => `${key} = VALUES(${key})`).join(', ');

  await db.query(
    `INSERT INTO empresas_perfil (${columns.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    values
  );
}

async function saveResumenPerfil(empresaId, resumen) {
  await upsertPerfilEmpresa(empresaId, {
    porcentaje_completitud: resumen.porcentaje_completitud,
    campos_pendientes: JSON.stringify(resumen.campos_pendientes || [])
  });
}

async function ensureEmpresasPreferenciasTable() {
  if (ensuredPreferenciasTable) return;

  await db.query(
    `CREATE TABLE IF NOT EXISTS empresas_preferencias (
      empresa_id BIGINT PRIMARY KEY,
      modalidades_permitidas JSON NULL,
      niveles_experiencia JSON NULL,
      observaciones TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_empresas_preferencias_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  ensuredPreferenciasTable = true;
}

async function ensureEmpresasDesactivacionesTable(connection = db) {
  if (ensuredDesactivacionesTable) return;

  await connection.query(
    `CREATE TABLE IF NOT EXISTS empresas_desactivaciones (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      empresa_id BIGINT NOT NULL,
      usuario_id BIGINT NULL,
      usuarios_activos_json JSON NULL,
      motivo_codigo VARCHAR(50) NOT NULL,
      motivos_codigos_json JSON NULL,
      motivo_detalle TEXT NULL,
      requiere_soporte TINYINT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_empresas_desactivaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      CONSTRAINT fk_empresas_desactivaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
      INDEX idx_empresas_desactivaciones_empresa (empresa_id),
      INDEX idx_empresas_desactivaciones_motivo (motivo_codigo),
      INDEX idx_empresas_desactivaciones_soporte (requiere_soporte),
      INDEX idx_empresas_desactivaciones_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  try {
    await connection.query(
      `ALTER TABLE empresas_desactivaciones
       ADD COLUMN motivos_codigos_json JSON NULL AFTER motivo_codigo`
    );
  } catch (error) {
    if (String(error.code || '') !== 'ER_DUP_FIELDNAME') throw error;
  }

  try {
    await connection.query(
      `ALTER TABLE empresas_desactivaciones
       ADD COLUMN usuarios_activos_json JSON NULL AFTER usuario_id`
    );
  } catch (error) {
    if (String(error.code || '') !== 'ER_DUP_FIELDNAME') throw error;
  }

  ensuredDesactivacionesTable = true;
}

async function saveEmpresaDesactivacion(
  connection,
  {
    empresaId,
    usuarioId = null,
    usuariosActivosEmpresaUsuarioIds = [],
    motivosCodigos = ['otro'],
    motivoDetalle = null,
    requiereSoporte = false
  }
) {
  const motivos = normalizeReasonCodes(motivosCodigos, VALID_MOTIVOS_DESACTIVACION_EMPRESA);
  if (!motivos?.length) {
    throw createServiceError('INVALID_DEACTIVATION_REASON');
  }

  if (motivos.includes('otro') && !String(motivoDetalle || '').trim()) {
    throw createServiceError('MOTIVO_OTRO_REQUIRED');
  }

  await connection.query(
    `INSERT INTO empresas_desactivaciones (
      empresa_id,
      usuario_id,
      usuarios_activos_json,
      motivo_codigo,
      motivos_codigos_json,
      motivo_detalle,
      requiere_soporte
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      empresaId,
      usuarioId,
      JSON.stringify(normalizePositiveIntArray(usuariosActivosEmpresaUsuarioIds)),
      motivos[0],
      JSON.stringify(motivos),
      motivoDetalle,
      requiereSoporte ? 1 : 0
    ]
  );
}

async function getLatestEmpresaDesactivacionByEmpresaId(empresaId) {
  await ensureEmpresasDesactivacionesTable();

  const [rows] = await db.query(
    `SELECT
      id,
      empresa_id,
      usuario_id,
      usuarios_activos_json,
      motivo_codigo,
      motivos_codigos_json,
      motivo_detalle,
      requiere_soporte,
      created_at
     FROM empresas_desactivaciones
     WHERE empresa_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [empresaId]
  );

  const row = rows[0] || null;
  if (!row) return null;

  return {
    id: row.id,
    empresa_id: row.empresa_id,
    usuario_id: row.usuario_id,
    usuarios_activos_empresa_usuario_ids: normalizePositiveIntArray(parseJsonArray(row.usuarios_activos_json)),
    motivo_codigo: row.motivo_codigo,
    motivos_codigos: normalizeReasonCodes(parseJsonArray(row.motivos_codigos_json), VALID_MOTIVOS_DESACTIVACION_EMPRESA)
      || [row.motivo_codigo].filter(Boolean),
    motivo_detalle: row.motivo_detalle || null,
    requiere_soporte: Number(row.requiere_soporte) === 1,
    created_at: row.created_at || null
  };
}

async function ensureEmpresasReactivacionesTable(connection = db) {
  if (ensuredReactivacionesTable) return;

  await connection.query(
    `CREATE TABLE IF NOT EXISTS empresas_reactivaciones (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      empresa_id BIGINT NOT NULL,
      usuario_id BIGINT NULL,
      estado ENUM('pendiente','en_revision','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
      motivo_codigo VARCHAR(50) NOT NULL,
      motivos_codigos_json JSON NULL,
      motivo_detalle TEXT NULL,
      acciones_realizadas TEXT NULL,
      requiere_soporte TINYINT UNSIGNED NOT NULL DEFAULT 0,
      comentario_admin TEXT NULL,
      reviewed_by BIGINT NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_empresas_reactivaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      CONSTRAINT fk_empresas_reactivaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
      CONSTRAINT fk_empresas_reactivaciones_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES usuarios(id) ON DELETE SET NULL,
      INDEX idx_empresas_reactivaciones_empresa (empresa_id),
      INDEX idx_empresas_reactivaciones_estado (estado),
      INDEX idx_empresas_reactivaciones_motivo (motivo_codigo),
      INDEX idx_empresas_reactivaciones_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  try {
    await connection.query(
      `ALTER TABLE empresas_reactivaciones
       ADD COLUMN motivos_codigos_json JSON NULL AFTER motivo_codigo`
    );
  } catch (error) {
    if (String(error.code || '') !== 'ER_DUP_FIELDNAME') throw error;
  }

  ensuredReactivacionesTable = true;
}

function mapEmpresaReactivacionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    usuario_id: row.usuario_id,
    estado: row.estado,
    motivo_codigo: row.motivo_codigo,
    motivos_codigos: normalizeReasonCodes(parseJsonArray(row.motivos_codigos_json), VALID_MOTIVOS_REACTIVACION_EMPRESA)
      || [row.motivo_codigo].filter(Boolean),
    motivo_detalle: row.motivo_detalle || null,
    acciones_realizadas: row.acciones_realizadas || null,
    requiere_soporte: Number(row.requiere_soporte) === 1,
    comentario_admin: row.comentario_admin || null,
    reviewed_by: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    empresa_nombre: row.empresa_nombre || null,
    empresa_email: row.empresa_email || null,
    solicitante_email: row.solicitante_email || null,
    solicitante_nombre: row.solicitante_nombre || null,
    reviewed_by_email: row.reviewed_by_email || null,
    reviewed_by_nombre: row.reviewed_by_nombre || null,
    desactivacion_motivo_codigo: row.desactivacion_motivo_codigo || null,
    desactivacion_motivos_codigos:
      normalizeReasonCodes(parseJsonArray(row.desactivacion_motivos_codigos_json), VALID_MOTIVOS_DESACTIVACION_EMPRESA)
      || [row.desactivacion_motivo_codigo].filter(Boolean),
    desactivacion_motivo_detalle: row.desactivacion_motivo_detalle || null,
    desactivacion_requiere_soporte:
      row.desactivacion_requiere_soporte === null || row.desactivacion_requiere_soporte === undefined
        ? null
        : Number(row.desactivacion_requiere_soporte) === 1,
    desactivacion_created_at: row.desactivacion_created_at || null
  };
}

async function getEmpresaReactivacionById(reactivacionId) {
  await ensureEmpresasReactivacionesTable();
  await ensureEmpresasDesactivacionesTable();

  const [rows] = await db.query(
    `SELECT
      r.*,
      e.nombre AS empresa_nombre,
      e.email AS empresa_email,
      su.email AS solicitante_email,
      su.nombre_completo AS solicitante_nombre,
      ru.email AS reviewed_by_email,
      ru.nombre_completo AS reviewed_by_nombre,
      d.motivo_codigo AS desactivacion_motivo_codigo,
      d.motivos_codigos_json AS desactivacion_motivos_codigos_json,
      d.motivo_detalle AS desactivacion_motivo_detalle,
      d.requiere_soporte AS desactivacion_requiere_soporte,
      d.created_at AS desactivacion_created_at
     FROM empresas_reactivaciones r
     INNER JOIN empresas e
       ON e.id = r.empresa_id
     LEFT JOIN usuarios su
       ON su.id = r.usuario_id
     LEFT JOIN usuarios ru
       ON ru.id = r.reviewed_by
     LEFT JOIN (
       SELECT d1.*
       FROM empresas_desactivaciones d1
       INNER JOIN (
         SELECT empresa_id, MAX(id) AS max_id
         FROM empresas_desactivaciones
         GROUP BY empresa_id
       ) d2
         ON d2.max_id = d1.id
     ) d
       ON d.empresa_id = r.empresa_id
     WHERE r.id = ?
     LIMIT 1`,
    [reactivacionId]
  );

  return mapEmpresaReactivacionRow(rows[0] || null);
}

async function getLatestEmpresaReactivacionByEmpresaId(empresaId) {
  await ensureEmpresasReactivacionesTable();
  await ensureEmpresasDesactivacionesTable();

  const [rows] = await db.query(
    `SELECT
      r.*,
      e.nombre AS empresa_nombre,
      e.email AS empresa_email,
      su.email AS solicitante_email,
      su.nombre_completo AS solicitante_nombre,
      ru.email AS reviewed_by_email,
      ru.nombre_completo AS reviewed_by_nombre,
      d.motivo_codigo AS desactivacion_motivo_codigo,
      d.motivos_codigos_json AS desactivacion_motivos_codigos_json,
      d.motivo_detalle AS desactivacion_motivo_detalle,
      d.requiere_soporte AS desactivacion_requiere_soporte,
      d.created_at AS desactivacion_created_at
     FROM empresas_reactivaciones r
     INNER JOIN empresas e
       ON e.id = r.empresa_id
     LEFT JOIN usuarios su
       ON su.id = r.usuario_id
     LEFT JOIN usuarios ru
       ON ru.id = r.reviewed_by
     LEFT JOIN (
       SELECT d1.*
       FROM empresas_desactivaciones d1
       INNER JOIN (
         SELECT empresa_id, MAX(id) AS max_id
         FROM empresas_desactivaciones
         GROUP BY empresa_id
       ) d2
         ON d2.max_id = d1.id
     ) d
       ON d.empresa_id = r.empresa_id
     WHERE r.empresa_id = ?
     ORDER BY r.id DESC
     LIMIT 1`,
    [empresaId]
  );

  return mapEmpresaReactivacionRow(rows[0] || null);
}

async function createEmpresaReactivacionByEmpresaId(
  empresaId,
  {
    usuarioId = null,
    motivosCodigos = ['otro'],
    motivoDetalle = null,
    accionesRealizadas = null,
    requiereSoporte = false
  } = {}
) {
  await ensureEmpresasReactivacionesTable();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [empresas] = await connection.query(
      `SELECT id, activo, deleted_at
       FROM empresas
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [empresaId]
    );

    const empresa = empresas[0];
    if (!empresa) {
      throw createServiceError('EMPRESA_NOT_FOUND');
    }

    const isActive = Number(empresa.activo) === 1 && !empresa.deleted_at;
    if (isActive) {
      throw createServiceError('COMPANY_ALREADY_ACTIVE');
    }

    const motivosNormalizados = normalizeReasonCodes(motivosCodigos, VALID_MOTIVOS_REACTIVACION_EMPRESA);
    if (!motivosNormalizados?.length) {
      throw createServiceError('INVALID_REACTIVATION_REASON');
    }

    if (motivosNormalizados.includes('otro') && !String(motivoDetalle || '').trim()) {
      throw createServiceError('MOTIVO_OTRO_REQUIRED');
    }

    const [existingRows] = await connection.query(
      `SELECT id
       FROM empresas_reactivaciones
       WHERE empresa_id = ?
       LIMIT 1`,
      [empresaId]
    );

    if (existingRows.length) {
      throw createServiceError('REACTIVATION_SURVEY_ALREADY_SUBMITTED');
    }

    const [insert] = await connection.query(
      `INSERT INTO empresas_reactivaciones (
        empresa_id,
        usuario_id,
        estado,
        motivo_codigo,
        motivos_codigos_json,
        motivo_detalle,
        acciones_realizadas,
        requiere_soporte
      ) VALUES (?, ?, 'pendiente', ?, ?, ?, ?, ?)`,
      [
        empresaId,
        usuarioId,
        motivosNormalizados[0],
        JSON.stringify(motivosNormalizados),
        motivoDetalle,
        accionesRealizadas,
        requiereSoporte ? 1 : 0
      ]
    );

    await connection.commit();
    return getEmpresaReactivacionById(insert.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listEmpresaReactivaciones({ estado = null, q = '', page = 1, pageSize = 20 } = {}) {
  await ensureEmpresasReactivacionesTable();
  await ensureEmpresasDesactivacionesTable();

  const where = [];
  const params = [];

  if (estado && VALID_ESTADOS_REACTIVACION_EMPRESA.includes(estado)) {
    where.push('r.estado = ?');
    params.push(estado);
  }

  const search = String(q || '').trim();
  if (search) {
    where.push(`(
      e.nombre LIKE ?
      OR e.email LIKE ?
      OR su.email LIKE ?
      OR su.nombre_completo LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
  const offset = (safePage - 1) * safePageSize;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM empresas_reactivaciones r
     INNER JOIN empresas e
       ON e.id = r.empresa_id
     LEFT JOIN usuarios su
       ON su.id = r.usuario_id
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
      r.*,
      e.nombre AS empresa_nombre,
      e.email AS empresa_email,
      su.email AS solicitante_email,
      su.nombre_completo AS solicitante_nombre,
      ru.email AS reviewed_by_email,
      ru.nombre_completo AS reviewed_by_nombre,
      d.motivo_codigo AS desactivacion_motivo_codigo,
      d.motivos_codigos_json AS desactivacion_motivos_codigos_json,
      d.motivo_detalle AS desactivacion_motivo_detalle,
      d.requiere_soporte AS desactivacion_requiere_soporte,
      d.created_at AS desactivacion_created_at
     FROM empresas_reactivaciones r
     INNER JOIN empresas e
       ON e.id = r.empresa_id
     LEFT JOIN usuarios su
       ON su.id = r.usuario_id
     LEFT JOIN usuarios ru
       ON ru.id = r.reviewed_by
     LEFT JOIN (
       SELECT d1.*
       FROM empresas_desactivaciones d1
       INNER JOIN (
         SELECT empresa_id, MAX(id) AS max_id
         FROM empresas_desactivaciones
         GROUP BY empresa_id
       ) d2
         ON d2.max_id = d1.id
     ) d
       ON d.empresa_id = r.empresa_id
     ${whereSql}
     ORDER BY
       CASE WHEN r.estado IN ('pendiente', 'en_revision') THEN 0 ELSE 1 END ASC,
       r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  const total = Number(countRows[0]?.total || 0);

  return {
    items: rows.map((row) => mapEmpresaReactivacionRow(row)),
    meta: {
      page: safePage,
      page_size: safePageSize,
      total,
      total_pages: Math.max(Math.ceil(total / safePageSize), 1)
    }
  };
}

async function reviewEmpresaReactivacionById(
  { reactivacionId, estado, comentarioAdmin = null, actorUsuarioId = null } = {}
) {
  await ensureEmpresasReactivacionesTable();

  if (!reactivacionId || !Number.isInteger(Number(reactivacionId))) {
    throw createServiceError('INVALID_REACTIVATION_ID');
  }
  if (!estado || !VALID_ESTADOS_REACTIVACION_EMPRESA.includes(estado)) {
    throw createServiceError('INVALID_REACTIVATION_STATUS');
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, empresa_id, estado
       FROM empresas_reactivaciones
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [reactivacionId]
    );

    const solicitud = rows[0];
    if (!solicitud) {
      throw createServiceError('REACTIVATION_NOT_FOUND');
    }

    if (estado === 'aprobada') {
      await connection.query(
        `UPDATE empresas
         SET activo = 1,
             deleted_at = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [solicitud.empresa_id]
      );

      const [desactivacionRows] = await connection.query(
        `SELECT usuarios_activos_json
         FROM empresas_desactivaciones
         WHERE empresa_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [solicitud.empresa_id]
      );

      const usuariosActivosIds = normalizePositiveIntArray(
        parseJsonArray(desactivacionRows[0]?.usuarios_activos_json)
      );

      if (usuariosActivosIds.length) {
        const placeholders = usuariosActivosIds.map(() => '?').join(', ');
        await connection.query(
          `UPDATE empresas_usuarios
           SET estado = 'activo',
               updated_at = NOW()
           WHERE empresa_id = ?
             AND id IN (${placeholders})`,
          [solicitud.empresa_id, ...usuariosActivosIds]
        );
      } else {
        // Fallback para desactivaciones antiguas sin snapshot de activos.
        await connection.query(
          `UPDATE empresas_usuarios
           SET estado = 'activo',
               updated_at = NOW()
           WHERE empresa_id = ?
             AND rol_empresa = 'admin'`,
          [solicitud.empresa_id]
        );
      }
    }

    await connection.query(
      `UPDATE empresas_reactivaciones
       SET estado = ?,
           comentario_admin = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE id = ?`,
      [estado, comentarioAdmin, actorUsuarioId, reactivacionId]
    );

    await connection.commit();
    return getEmpresaReactivacionById(reactivacionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getEmpresaPreferenciasById(empresaId) {
  await ensureEmpresasPreferenciasTable();

  const [rows] = await db.query(
    `SELECT empresa_id, modalidades_permitidas, niveles_experiencia, observaciones
     FROM empresas_preferencias
     WHERE empresa_id = ?
     LIMIT 1`,
    [empresaId]
  );

  const row = rows[0];
  if (!row) {
    return {
      empresa_id: empresaId,
      modalidades_permitidas: [],
      niveles_experiencia: [],
      observaciones: null
    };
  }

  return {
    empresa_id: row.empresa_id,
    modalidades_permitidas: sanitizeModalidades(parseJsonArray(row.modalidades_permitidas)),
    niveles_experiencia: sanitizeNivelesExperiencia(parseJsonArray(row.niveles_experiencia)),
    observaciones: row.observaciones || null
  };
}

async function upsertEmpresaPreferenciasById(empresaId, patch) {
  await ensureEmpresasPreferenciasTable();

  const modalidades = sanitizeModalidades(patch.modalidades_permitidas);
  const niveles = sanitizeNivelesExperiencia(patch.niveles_experiencia);
  const observaciones = patch.observaciones ?? null;

  await db.query(
    `INSERT INTO empresas_preferencias (empresa_id, modalidades_permitidas, niveles_experiencia, observaciones)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       modalidades_permitidas = VALUES(modalidades_permitidas),
       niveles_experiencia = VALUES(niveles_experiencia),
       observaciones = VALUES(observaciones)`,
    [
      empresaId,
      JSON.stringify(modalidades),
      JSON.stringify(niveles),
      observaciones
    ]
  );

  return getEmpresaPreferenciasById(empresaId);
}

async function listEmpresaUsuariosByEmpresaId(empresaId) {
  const [rows] = await db.query(
    `SELECT
      eu.id,
      eu.empresa_id,
      eu.usuario_id,
      eu.rol_empresa,
      eu.principal,
      eu.estado,
      u.nombre_completo AS nombre,
      u.email
     FROM empresas_usuarios eu
     INNER JOIN usuarios u
       ON u.id = eu.usuario_id
     INNER JOIN empresas e
       ON e.id = eu.empresa_id
     WHERE eu.empresa_id = ?
       AND e.deleted_at IS NULL
     ORDER BY eu.principal DESC, eu.id ASC`,
    [empresaId]
  );

  return rows.map((row) => ({
    id: row.id,
    empresa_id: row.empresa_id,
    usuario_id: row.usuario_id,
    rol_empresa: row.rol_empresa,
    principal: Number(row.principal) === 1,
    estado: row.estado,
    nombre: row.nombre,
    email: row.email
  }));
}

async function countActiveAdmins(empresaId, connection = db) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM empresas_usuarios
     WHERE empresa_id = ?
       AND estado = 'activo'
       AND rol_empresa = 'admin'`,
    [empresaId]
  );
  return Number(rows[0]?.total || 0);
}

async function getEmpresaUsuarioById(empresaId, empresaUsuarioId, connection = db) {
  const [rows] = await connection.query(
    `SELECT id, empresa_id, usuario_id, rol_empresa, principal, estado
     FROM empresas_usuarios
     WHERE id = ?
       AND empresa_id = ?
     LIMIT 1`,
    [empresaUsuarioId, empresaId]
  );

  return rows[0] || null;
}

async function findUsuarioByEmail(email, connection = db) {
  const [rows] = await connection.query(
    `SELECT id, email, nombre_completo, estado
     FROM usuarios
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function createEmpresaUsuarioByEmail(empresaId, { email, rolEmpresa = 'reclutador', principal = false }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const usuario = await findUsuarioByEmail(email, connection);
    if (!usuario) {
      throw createServiceError('USER_NOT_FOUND');
    }

    const [existing] = await connection.query(
      `SELECT id
       FROM empresas_usuarios
       WHERE empresa_id = ?
         AND usuario_id = ?
       LIMIT 1`,
      [empresaId, usuario.id]
    );

    if (existing.length) {
      throw createServiceError('USER_ALREADY_LINKED');
    }

    if (principal) {
      await connection.query(
        `UPDATE empresas_usuarios
         SET principal = 0
         WHERE empresa_id = ?`,
        [empresaId]
      );
    }

    await connection.query(
      `INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
       VALUES (?, ?, ?, ?, 'activo')`,
      [empresaId, usuario.id, rolEmpresa, principal ? 1 : 0]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return listEmpresaUsuariosByEmpresaId(empresaId);
}

async function updateEmpresaUsuarioById(empresaId, empresaUsuarioId, patch) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const current = await getEmpresaUsuarioById(empresaId, empresaUsuarioId, connection);
    if (!current) {
      throw createServiceError('LINK_NOT_FOUND');
    }

    const nextRol = patch.rol_empresa ?? current.rol_empresa;
    const nextEstado = patch.estado ?? current.estado;
    const nextPrincipal = patch.principal === undefined ? Number(current.principal) === 1 : Boolean(patch.principal);

    const activeAdmins = await countActiveAdmins(empresaId, connection);
    const isCurrentActiveAdmin = current.estado === 'activo' && current.rol_empresa === 'admin';
    const willRemainActiveAdmin = nextEstado === 'activo' && nextRol === 'admin';

    if (isCurrentActiveAdmin && !willRemainActiveAdmin && activeAdmins <= 1) {
      throw createServiceError('LAST_ADMIN_REQUIRED');
    }

    if (patch.principal === true) {
      await connection.query(
        `UPDATE empresas_usuarios
         SET principal = 0
         WHERE empresa_id = ?`,
        [empresaId]
      );
    }

    await connection.query(
      `UPDATE empresas_usuarios
       SET rol_empresa = ?,
           estado = ?,
           principal = ?
       WHERE id = ?
         AND empresa_id = ?`,
      [nextRol, nextEstado, nextPrincipal ? 1 : 0, empresaUsuarioId, empresaId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return listEmpresaUsuariosByEmpresaId(empresaId);
}

async function deactivateEmpresaUsuarioById(empresaId, empresaUsuarioId) {
  return updateEmpresaUsuarioById(empresaId, empresaUsuarioId, { estado: 'inactivo' });
}

async function softDeleteEmpresaById(
  empresaId,
  {
    actorUsuarioId = null,
    motivosCodigos = ['otro'],
    motivoDetalle = null,
    requiereSoporte = false
  } = {}
) {
  await ensureEmpresasDesactivacionesTable();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id
       FROM empresas
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [empresaId]
    );

    if (!rows.length) {
      throw createServiceError('EMPRESA_NOT_FOUND');
    }

    const motivosNormalizados = normalizeReasonCodes(motivosCodigos, VALID_MOTIVOS_DESACTIVACION_EMPRESA);
    if (!motivosNormalizados?.length) {
      throw createServiceError('INVALID_DEACTIVATION_REASON');
    }

    const [existingSurveyRows] = await connection.query(
      `SELECT id
       FROM empresas_desactivaciones
       WHERE empresa_id = ?
       LIMIT 1`,
      [empresaId]
    );
    if (existingSurveyRows.length) {
      throw createServiceError('DEACTIVATION_SURVEY_ALREADY_SUBMITTED');
    }

    if (motivosNormalizados.includes('otro') && !String(motivoDetalle || '').trim()) {
      throw createServiceError('MOTIVO_OTRO_REQUIRED');
    }

    const [activeRows] = await connection.query(
      `SELECT id
       FROM empresas_usuarios
       WHERE empresa_id = ?
         AND estado = 'activo'
       ORDER BY id ASC`,
      [empresaId]
    );
    const usuariosActivosEmpresaUsuarioIds = normalizePositiveIntArray(activeRows.map((row) => row.id));

    await saveEmpresaDesactivacion(connection, {
      empresaId,
      usuarioId: actorUsuarioId,
      usuariosActivosEmpresaUsuarioIds,
      motivosCodigos: motivosNormalizados,
      motivoDetalle,
      requiereSoporte
    });

    await connection.query(
      `UPDATE empresas
       SET activo = 0,
           deleted_at = NOW()
       WHERE id = ?`,
      [empresaId]
    );

    await connection.query(
      `UPDATE empresas_usuarios
       SET estado = 'inactivo'
       WHERE empresa_id = ?`,
      [empresaId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  VALID_ROLES_EMPRESA,
  VALID_ESTADOS_EMPRESA_USUARIO,
  VALID_MODALIDADES,
  VALID_NIVELES_EXPERIENCIA,
  VALID_MOTIVOS_DESACTIVACION_EMPRESA,
  VALID_MOTIVOS_REACTIVACION_EMPRESA,
  VALID_ESTADOS_REACTIVACION_EMPRESA,
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
  getLatestEmpresaDesactivacionByEmpresaId,
  listEmpresaReactivaciones,
  reviewEmpresaReactivacionById
};
