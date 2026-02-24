const db = require('../db');

const VALID_VERIFICACION_TIPOS = ['empresa', 'candidato'];
const VALID_VERIFICACION_ESTADOS = ['pendiente', 'en_revision', 'aprobada', 'rechazada', 'vencida', 'suspendida'];
const VALID_VERIFICACION_NIVELES = ['basico', 'completo'];
const VALID_EVENTO_ACCIONES = ['solicitada', 'en_revision', 'aprobada', 'rechazada', 'suspendida', 'reabierta', 'vencida'];
const VALID_EVENTO_ACTOR_ROLES = ['candidato', 'empresa', 'administrador', 'superadmin', 'system'];
let verificationSchemaReadyPromise = null;

function normalizeEventoActorRol(actorRol) {
  const normalized = String(actorRol || '').trim().toLowerCase();
  if (VALID_EVENTO_ACTOR_ROLES.includes(normalized)) return normalized;

  // Roles internos de empresa deben mapear al rol permitido en eventos.
  if (['admin', 'reclutador'].includes(normalized)) return 'empresa';

  return 'system';
}

function toMysqlDateTime(value = new Date()) {
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

function parseDateToMysqlOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toMysqlDateTime(date);
}

async function ensureVerificationSchema() {
  if (verificationSchemaReadyPromise) {
    return verificationSchemaReadyPromise;
  }

  verificationSchemaReadyPromise = (async () => {
    await db.query(
      `CREATE TABLE IF NOT EXISTS verificaciones_cuenta (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        cuenta_tipo ENUM('empresa','candidato') NOT NULL,
        empresa_id BIGINT NULL,
        candidato_id BIGINT NULL,
        estado ENUM('pendiente','en_revision','aprobada','rechazada','vencida','suspendida') NOT NULL DEFAULT 'pendiente',
        nivel ENUM('basico','completo') NOT NULL DEFAULT 'basico',
        motivo_rechazo TEXT NULL,
        notas_admin TEXT NULL,
        fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by BIGINT NULL,
        reviewed_at DATETIME NULL,
        expires_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_verificaciones_cuenta_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        CONSTRAINT fk_verificaciones_cuenta_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
        CONSTRAINT fk_verificaciones_cuenta_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES usuarios(id) ON DELETE SET NULL,
        UNIQUE KEY uq_verificacion_empresa (empresa_id),
        UNIQUE KEY uq_verificacion_candidato (candidato_id),
        INDEX idx_verificaciones_tipo_estado (cuenta_tipo, estado),
        INDEX idx_verificaciones_reviewed_at (reviewed_at),
        INDEX idx_verificaciones_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await db.query(
      `CREATE TABLE IF NOT EXISTS verificaciones_cuenta_eventos (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        verificacion_id BIGINT NOT NULL,
        accion ENUM('solicitada','en_revision','aprobada','rechazada','suspendida','reabierta','vencida') NOT NULL,
        estado_anterior ENUM('pendiente','en_revision','aprobada','rechazada','vencida','suspendida') NULL,
        estado_nuevo ENUM('pendiente','en_revision','aprobada','rechazada','vencida','suspendida') NULL,
        actor_usuario_id BIGINT NULL,
        actor_rol ENUM('candidato','empresa','administrador','superadmin','system') DEFAULT 'system',
        comentario TEXT NULL,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_verificaciones_eventos_verificacion FOREIGN KEY (verificacion_id) REFERENCES verificaciones_cuenta(id) ON DELETE CASCADE,
        CONSTRAINT fk_verificaciones_eventos_actor FOREIGN KEY (actor_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        INDEX idx_verificaciones_eventos_verificacion (verificacion_id),
        INDEX idx_verificaciones_eventos_accion (accion),
        INDEX idx_verificaciones_eventos_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  })();

  try {
    await verificationSchemaReadyPromise;
  } catch (error) {
    verificationSchemaReadyPromise = null;
    throw error;
  }
}

function mapVerificacionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    cuenta_tipo: row.cuenta_tipo,
    empresa_id: row.empresa_id,
    candidato_id: row.candidato_id,
    estado: row.estado,
    nivel: row.nivel,
    motivo_rechazo: row.motivo_rechazo,
    notas_admin: row.notas_admin,
    fecha_solicitud: row.fecha_solicitud,
    reviewed_by: row.reviewed_by,
    reviewed_by_nombre: row.reviewed_by_nombre || null,
    reviewed_at: row.reviewed_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    empresa_nombre: row.empresa_nombre || null,
    empresa_email: row.empresa_email || null,
    candidato_nombre: row.candidato_nombre || null,
    candidato_documento: row.candidato_documento || null,
    candidato_email: row.candidato_email || null,
    has_solicitud: Boolean(Number(row.has_solicitud || 0))
  };
}

async function ensureVerificacionDefaults() {
  await db.query(
    `INSERT INTO verificaciones_cuenta (cuenta_tipo, empresa_id, estado, nivel, fecha_solicitud)
     SELECT 'empresa', e.id, 'pendiente', 'basico', NOW()
     FROM empresas e
     LEFT JOIN verificaciones_cuenta v
       ON v.cuenta_tipo = 'empresa'
      AND v.empresa_id = e.id
     WHERE e.deleted_at IS NULL
       AND v.id IS NULL`
  );

  await db.query(
    `INSERT INTO verificaciones_cuenta (cuenta_tipo, candidato_id, estado, nivel, fecha_solicitud)
     SELECT 'candidato', c.id, 'pendiente', 'basico', NOW()
     FROM candidatos c
     LEFT JOIN verificaciones_cuenta v
       ON v.cuenta_tipo = 'candidato'
      AND v.candidato_id = c.id
     WHERE c.deleted_at IS NULL
       AND v.id IS NULL`
  );
}

function buildCandidateEligibilityFromDocsRow(row) {
  const identidadAnverso = Number(row?.identidad_anverso || 0);
  const identidadReverso = Number(row?.identidad_reverso || 0);
  const identidadDocs = Number(row?.identidad_docs || 0);
  const licenciaDocs = Number(row?.licencia_docs || 0);
  const hasCedulaAmbosLados = identidadAnverso > 0 && identidadReverso > 0;
  const hasCedulaLegacy = identidadDocs >= 2;
  const hasLicencia = licenciaDocs >= 1;
  return hasCedulaAmbosLados || hasCedulaLegacy || hasLicencia;
}

async function syncCandidateApprovedVerificacionesByDocs({ candidateIds = null, connection = db } = {}) {
  await ensureVerificationSchema();

  const safeCandidateIds = Array.isArray(candidateIds)
    ? [...new Set(candidateIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    : null;

  if (Array.isArray(safeCandidateIds) && safeCandidateIds.length === 0) {
    return 0;
  }

  const whereParts = [`v.cuenta_tipo = 'candidato'`, `v.estado = 'aprobada'`];
  const whereParams = [];
  if (safeCandidateIds) {
    whereParts.push('v.candidato_id IN (?)');
    whereParams.push(safeCandidateIds);
  }

  const [approvedRows] = await connection.query(
    `SELECT v.id, v.candidato_id, v.estado
     FROM verificaciones_cuenta v
     WHERE ${whereParts.join(' AND ')}`,
    whereParams
  );
  if (!approvedRows.length) return 0;

  const approvedCandidateIds = approvedRows.map((row) => Number(row.candidato_id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!approvedCandidateIds.length) return 0;

  const [docsRows] = await connection.query(
    `SELECT
      candidato_id,
      MAX(
        CASE
          WHEN tipo_documento = 'documento_identidad'
            AND lado_documento = 'anverso'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
            AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())
          THEN 1
          ELSE 0
        END
      ) AS identidad_anverso,
      MAX(
        CASE
          WHEN tipo_documento = 'documento_identidad'
            AND lado_documento = 'reverso'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
            AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())
          THEN 1
          ELSE 0
        END
      ) AS identidad_reverso,
      SUM(
        CASE
          WHEN tipo_documento = 'documento_identidad'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
            AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())
          THEN 1
          ELSE 0
        END
      ) AS identidad_docs,
      SUM(
        CASE
          WHEN tipo_documento = 'licencia_conducir'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
            AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURDATE())
          THEN 1
          ELSE 0
        END
      ) AS licencia_docs
     FROM candidatos_documentos
     WHERE deleted_at IS NULL
       AND candidato_id IN (?)
     GROUP BY candidato_id`,
    [approvedCandidateIds]
  );

  const eligibilityByCandidateId = new Map();
  for (const row of docsRows) {
    eligibilityByCandidateId.set(Number(row.candidato_id), buildCandidateEligibilityFromDocsRow(row));
  }

  let changed = 0;
  for (const row of approvedRows) {
    const candidatoId = Number(row.candidato_id);
    if (!eligibilityByCandidateId.get(candidatoId)) {
      const [result] = await connection.query(
        `UPDATE verificaciones_cuenta
         SET estado = 'en_revision',
             motivo_rechazo = NULL,
             reviewed_by = NULL,
             reviewed_at = NULL,
             updated_at = NOW()
         WHERE id = ?
           AND estado = 'aprobada'`,
        [row.id]
      );

      if (Number(result?.affectedRows || 0) > 0) {
        changed += 1;
        await createEvento(
          {
            verificacionId: row.id,
            accion: 'en_revision',
            estadoAnterior: 'aprobada',
            estadoNuevo: 'en_revision',
            actorUsuarioId: null,
            actorRol: 'system',
            comentario: 'Cambio automatico: cedula y licencia vencidas o no vigentes.',
            metadata: { source: 'candidate_docs_expiry_sync', candidato_id: candidatoId }
          },
          connection
        );
      }
    }
  }

  return changed;
}

async function selectVerificacionByScope({ tipo, empresaId = null, candidatoId = null }, connection = db) {
  await ensureVerificationSchema();

  if (!VALID_VERIFICACION_TIPOS.includes(tipo)) return null;
  if (tipo === 'empresa' && !empresaId) return null;
  if (tipo === 'candidato' && !candidatoId) return null;

  if (tipo === 'candidato' && candidatoId) {
    await syncCandidateApprovedVerificacionesByDocs({ candidateIds: [candidatoId], connection });
  }

  const [rows] = await connection.query(
    `SELECT
      v.*,
      EXISTS(
        SELECT 1
        FROM verificaciones_cuenta_eventos ve
        WHERE ve.verificacion_id = v.id
          AND ve.accion = 'solicitada'
      ) AS has_solicitud,
      u.nombre_completo AS reviewed_by_nombre,
      e.nombre AS empresa_nombre,
      e.email AS empresa_email,
      CONCAT(c.nombres, ' ', c.apellidos) AS candidato_nombre,
      c.documento_identidad AS candidato_documento,
      cc.email AS candidato_email
     FROM verificaciones_cuenta v
     LEFT JOIN usuarios u
       ON u.id = v.reviewed_by
     LEFT JOIN empresas e
       ON v.cuenta_tipo = 'empresa'
      AND e.id = v.empresa_id
     LEFT JOIN candidatos c
       ON v.cuenta_tipo = 'candidato'
      AND c.id = v.candidato_id
      AND c.deleted_at IS NULL
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     WHERE v.cuenta_tipo = ?
       AND ((? = 'empresa' AND v.empresa_id = ?) OR (? = 'candidato' AND v.candidato_id = ?))
     LIMIT 1`,
    [tipo, tipo, empresaId, tipo, candidatoId]
  );

  return mapVerificacionRow(rows[0] || null);
}

async function ensureVerificacionByScope({ tipo, empresaId = null, candidatoId = null }, connection = db) {
  await ensureVerificationSchema();

  const existing = await selectVerificacionByScope({ tipo, empresaId, candidatoId }, connection);
  if (existing) return existing;

  await connection.query(
    `INSERT INTO verificaciones_cuenta (
      cuenta_tipo, empresa_id, candidato_id, estado, nivel, fecha_solicitud
    ) VALUES (?, ?, ?, 'pendiente', 'basico', NOW())`,
    [tipo, empresaId, candidatoId]
  );

  return selectVerificacionByScope({ tipo, empresaId, candidatoId }, connection);
}

async function createEvento(
  {
    verificacionId,
    accion,
    estadoAnterior = null,
    estadoNuevo = null,
    actorUsuarioId = null,
    actorRol = 'system',
    comentario = null,
    metadata = null
  },
  connection = db
) {
  if (!VALID_EVENTO_ACCIONES.includes(accion)) return;
  const safeActorRol = normalizeEventoActorRol(actorRol);

  await connection.query(
    `INSERT INTO verificaciones_cuenta_eventos (
      verificacion_id,
      accion,
      estado_anterior,
      estado_nuevo,
      actor_usuario_id,
      actor_rol,
      comentario,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      verificacionId,
      accion,
      estadoAnterior,
      estadoNuevo,
      actorUsuarioId,
      safeActorRol,
      comentario,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}

function getReviewActionByEstado(estadoAnterior, estadoNuevo) {
  if (estadoNuevo === 'pendiente') return 'reabierta';
  if (estadoNuevo === 'en_revision') return 'en_revision';
  if (estadoNuevo === 'aprobada') return 'aprobada';
  if (estadoNuevo === 'rechazada') return 'rechazada';
  if (estadoNuevo === 'suspendida') return 'suspendida';
  if (estadoNuevo === 'vencida') return 'vencida';
  if (estadoAnterior !== estadoNuevo) return 'reabierta';
  return 'en_revision';
}

async function requestVerificacionByScope(
  {
    tipo,
    empresaId = null,
    candidatoId = null,
    actorUsuarioId = null,
    actorRol = 'system',
    comentario = null
  }
) {
  await ensureVerificationSchema();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let verificacion = await ensureVerificacionByScope({ tipo, empresaId, candidatoId }, connection);
    if (!verificacion) {
      await connection.rollback();
      return null;
    }

    let nextEstado = verificacion.estado;
    if (['rechazada', 'vencida', 'suspendida'].includes(verificacion.estado)) {
      nextEstado = 'pendiente';
      await connection.query(
        `UPDATE verificaciones_cuenta
         SET estado = 'pendiente',
             motivo_rechazo = NULL,
             notas_admin = NULL,
             reviewed_by = NULL,
             reviewed_at = NULL,
             fecha_solicitud = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [verificacion.id]
      );
    }

    await createEvento(
      {
        verificacionId: verificacion.id,
        accion: 'solicitada',
        estadoAnterior: verificacion.estado,
        estadoNuevo: nextEstado,
        actorUsuarioId,
        actorRol,
        comentario
      },
      connection
    );

    await connection.commit();
    verificacion = await selectVerificacionByScope({ tipo, empresaId, candidatoId });
    return verificacion;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reviewVerificacionById(
  {
    verificacionId,
    estado,
    nivel = null,
    motivoRechazo = null,
    notasAdmin = null,
    expiresAt = null,
    actorUsuarioId = null,
    actorRol = 'system',
    comentario = null
  }
) {
  await ensureVerificationSchema();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, estado, nivel
       FROM verificaciones_cuenta
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [verificacionId]
    );

    const current = rows[0];
    if (!current) {
      await connection.rollback();
      return null;
    }

    const estadoAnterior = current.estado;
    const nextNivel = nivel || current.nivel;
    const nextExpiresAt = parseDateToMysqlOrNull(expiresAt);
    const reviewNow = toMysqlDateTime();
    const nextMotivo = estado === 'rechazada' ? motivoRechazo : null;

    if (estado === 'pendiente') {
      await connection.query(
        `UPDATE verificaciones_cuenta
         SET estado = ?,
             nivel = ?,
             motivo_rechazo = NULL,
             notas_admin = ?,
             reviewed_by = NULL,
             reviewed_at = NULL,
             expires_at = ?,
             fecha_solicitud = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [estado, nextNivel, notasAdmin, nextExpiresAt, verificacionId]
      );
    } else {
      await connection.query(
        `UPDATE verificaciones_cuenta
         SET estado = ?,
             nivel = ?,
             motivo_rechazo = ?,
             notas_admin = ?,
             reviewed_by = ?,
             reviewed_at = ?,
             expires_at = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [estado, nextNivel, nextMotivo, notasAdmin, actorUsuarioId, reviewNow, nextExpiresAt, verificacionId]
      );
    }

    await createEvento(
      {
        verificacionId,
        accion: getReviewActionByEstado(estadoAnterior, estado),
        estadoAnterior,
        estadoNuevo: estado,
        actorUsuarioId,
        actorRol,
        comentario: comentario || notasAdmin || null
      },
      connection
    );

    await connection.commit();
    return getVerificacionById(verificacionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listVerificacionEventos(verificacionId, { limit = 20 } = {}) {
  await ensureVerificationSchema();

  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.verificacion_id,
      e.accion,
      e.estado_anterior,
      e.estado_nuevo,
      e.actor_usuario_id,
      e.actor_rol,
      e.comentario,
      e.metadata,
      e.created_at,
      u.nombre_completo AS actor_nombre
     FROM verificaciones_cuenta_eventos e
     LEFT JOIN usuarios u
       ON u.id = e.actor_usuario_id
     WHERE e.verificacion_id = ?
     ORDER BY e.id DESC
     LIMIT ?`,
    [verificacionId, safeLimit]
  );

  return rows.map((row) => ({
    id: row.id,
    verificacion_id: row.verificacion_id,
    accion: row.accion,
    estado_anterior: row.estado_anterior,
    estado_nuevo: row.estado_nuevo,
    actor_usuario_id: row.actor_usuario_id,
    actor_rol: row.actor_rol,
    actor_nombre: row.actor_nombre || null,
    comentario: row.comentario || null,
    metadata: (() => {
      if (!row.metadata) return null;
      if (typeof row.metadata === 'object') return row.metadata;
      try {
        return JSON.parse(row.metadata);
      } catch (_error) {
        return null;
      }
    })(),
    created_at: row.created_at
  }));
}

async function getVerificacionById(verificacionId) {
  await ensureVerificationSchema();

  const selectSql = `SELECT
      v.*,
      EXISTS(
        SELECT 1
        FROM verificaciones_cuenta_eventos ve
        WHERE ve.verificacion_id = v.id
          AND ve.accion = 'solicitada'
      ) AS has_solicitud,
      u.nombre_completo AS reviewed_by_nombre,
      e.nombre AS empresa_nombre,
      e.email AS empresa_email,
      CONCAT(c.nombres, ' ', c.apellidos) AS candidato_nombre,
      c.documento_identidad AS candidato_documento,
      cc.email AS candidato_email
     FROM verificaciones_cuenta v
     LEFT JOIN usuarios u
       ON u.id = v.reviewed_by
     LEFT JOIN empresas e
       ON v.cuenta_tipo = 'empresa'
      AND e.id = v.empresa_id
     LEFT JOIN candidatos c
       ON v.cuenta_tipo = 'candidato'
      AND c.id = v.candidato_id
      AND c.deleted_at IS NULL
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     WHERE v.id = ?
     LIMIT 1`;

  const [rows] = await db.query(selectSql, [verificacionId]);
  const current = rows[0] || null;
  if (!current) return null;

  if (current.cuenta_tipo === 'candidato' && current.candidato_id) {
    const changed = await syncCandidateApprovedVerificacionesByDocs({
      candidateIds: [current.candidato_id]
    });
    if (changed > 0) {
      const [freshRows] = await db.query(selectSql, [verificacionId]);
      return mapVerificacionRow(freshRows[0] || null);
    }
  }

  return mapVerificacionRow(current);
}

async function listVerificaciones({ tipo = null, estado = null, hasSolicitud = null, q = '', page = 1, pageSize = 20 } = {}) {
  await ensureVerificationSchema();
  await ensureVerificacionDefaults();

  const safePage = Math.max(Number(page || 1), 1);
  const safePageSize = Math.min(Math.max(Number(pageSize || 20), 1), 100);
  const offset = (safePage - 1) * safePageSize;

  const where = [];
  const params = [];

  if (tipo && VALID_VERIFICACION_TIPOS.includes(tipo)) {
    where.push('v.cuenta_tipo = ?');
    params.push(tipo);
  }

  if (estado && VALID_VERIFICACION_ESTADOS.includes(estado)) {
    where.push('v.estado = ?');
    params.push(estado);
  }

  if (hasSolicitud === true) {
    where.push(`EXISTS(
      SELECT 1
      FROM verificaciones_cuenta_eventos ve
      WHERE ve.verificacion_id = v.id
        AND ve.accion = 'solicitada'
    )`);
  }

  const search = String(q || '').trim();
  if (search) {
    where.push(`(
      e.nombre LIKE ?
      OR e.email LIKE ?
      OR CONCAT(c.nombres, ' ', c.apellidos) LIKE ?
      OR c.documento_identidad LIKE ?
      OR cc.email LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM verificaciones_cuenta v
     LEFT JOIN empresas e
       ON v.cuenta_tipo = 'empresa'
      AND e.id = v.empresa_id
     LEFT JOIN candidatos c
       ON v.cuenta_tipo = 'candidato'
      AND c.id = v.candidato_id
      AND c.deleted_at IS NULL
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     ${whereSql}`,
    params
  );

  const listSql = `SELECT
      v.*,
      EXISTS(
        SELECT 1
        FROM verificaciones_cuenta_eventos ve
        WHERE ve.verificacion_id = v.id
          AND ve.accion = 'solicitada'
      ) AS has_solicitud,
      u.nombre_completo AS reviewed_by_nombre,
      e.nombre AS empresa_nombre,
      e.email AS empresa_email,
      CONCAT(c.nombres, ' ', c.apellidos) AS candidato_nombre,
      c.documento_identidad AS candidato_documento,
      cc.email AS candidato_email
     FROM verificaciones_cuenta v
     LEFT JOIN usuarios u
       ON u.id = v.reviewed_by
     LEFT JOIN empresas e
       ON v.cuenta_tipo = 'empresa'
      AND e.id = v.empresa_id
     LEFT JOIN candidatos c
       ON v.cuenta_tipo = 'candidato'
      AND c.id = v.candidato_id
      AND c.deleted_at IS NULL
     LEFT JOIN candidatos_contacto cc
       ON cc.candidato_id = c.id
      AND cc.deleted_at IS NULL
     ${whereSql}
     ORDER BY
       CASE v.estado
         WHEN 'pendiente' THEN 1
         WHEN 'en_revision' THEN 2
         WHEN 'rechazada' THEN 3
         WHEN 'suspendida' THEN 4
         WHEN 'aprobada' THEN 5
         WHEN 'vencida' THEN 6
         ELSE 7
       END ASC,
       v.updated_at DESC
     LIMIT ? OFFSET ?`;
  const listParams = [...params, safePageSize, offset];

  let [rows] = await db.query(listSql, listParams);
  const approvedCandidateIdsOnPage = [...new Set(
    rows
      .filter((row) => row.cuenta_tipo === 'candidato' && row.estado === 'aprobada' && row.candidato_id)
      .map((row) => Number(row.candidato_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (approvedCandidateIdsOnPage.length) {
    const changed = await syncCandidateApprovedVerificacionesByDocs({ candidateIds: approvedCandidateIdsOnPage });
    if (changed > 0) {
      [rows] = await db.query(listSql, listParams);
    }
  }

  return {
    items: rows.map((row) => mapVerificacionRow(row)),
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

module.exports = {
  VALID_VERIFICACION_TIPOS,
  VALID_VERIFICACION_ESTADOS,
  VALID_VERIFICACION_NIVELES,
  selectVerificacionByScope,
  ensureVerificacionByScope,
  requestVerificacionByScope,
  reviewVerificacionById,
  listVerificacionEventos,
  getVerificacionById,
  listVerificaciones
};
