const db = require('../db');

let ensuredMensajesSchema = false;

function createServiceError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
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

function isAdminRole(role) {
  return role === 'administrador' || role === 'superadmin';
}

const LATEST_CANDIDATO_FOTO_SQL = `(
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
)`;

async function ensureMensajesSchema() {
  if (ensuredMensajesSchema) return;

  await db.query(
    `CREATE TABLE IF NOT EXISTS mensajes_conversaciones (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      tipo ENUM('vacante','directa','soporte') NOT NULL DEFAULT 'vacante',
      direct_key VARCHAR(80) NULL,
      vacante_id BIGINT NULL,
      candidato_id BIGINT NULL,
      creada_por_usuario_id BIGINT NULL,
      estado ENUM('activa','archivada','cerrada') NOT NULL DEFAULT 'activa',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mensajes_conversaciones_vacante FOREIGN KEY (vacante_id) REFERENCES vacantes_publicadas(id) ON DELETE SET NULL,
      CONSTRAINT fk_mensajes_conversaciones_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE SET NULL,
      CONSTRAINT fk_mensajes_conversaciones_creada_por FOREIGN KEY (creada_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
      UNIQUE KEY uq_mensajes_conversaciones_direct_key (direct_key),
      UNIQUE KEY uq_mensajes_conversaciones_vacante_candidato (vacante_id, candidato_id),
      INDEX idx_mensajes_conversaciones_tipo (tipo),
      INDEX idx_mensajes_conversaciones_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS mensajes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      conversacion_id BIGINT NOT NULL,
      remitente_usuario_id BIGINT NULL,
      cuerpo TEXT NOT NULL,
      tipo ENUM('texto','sistema') NOT NULL DEFAULT 'texto',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME NULL,
      deleted_at DATETIME NULL,
      CONSTRAINT fk_mensajes_conversacion FOREIGN KEY (conversacion_id) REFERENCES mensajes_conversaciones(id) ON DELETE CASCADE,
      CONSTRAINT fk_mensajes_remitente FOREIGN KEY (remitente_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
      INDEX idx_mensajes_conversacion_created (conversacion_id, created_at),
      INDEX idx_mensajes_conversacion_id (conversacion_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS mensajes_conversacion_participantes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      conversacion_id BIGINT NOT NULL,
      usuario_id BIGINT NOT NULL,
      rol_contexto ENUM('candidato','contratante','admin','invitado') NOT NULL DEFAULT 'invitado',
      activo TINYINT UNSIGNED NOT NULL DEFAULT 1,
      ultimo_leido_mensaje_id BIGINT NULL,
      ultimo_leido_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mensajes_participante_conversacion FOREIGN KEY (conversacion_id) REFERENCES mensajes_conversaciones(id) ON DELETE CASCADE,
      CONSTRAINT fk_mensajes_participante_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE KEY uq_mensajes_participante (conversacion_id, usuario_id),
      INDEX idx_mensajes_participante_usuario (usuario_id),
      INDEX idx_mensajes_participante_ultimo (usuario_id, ultimo_leido_mensaje_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  ensuredMensajesSchema = true;
}

async function findVacanteContext(vacanteId) {
  const [rows] = await db.query(
    `SELECT
      v.id,
      v.titulo,
      v.empresa_id,
      v.contratante_tipo,
      v.contratante_candidato_id,
      v.estado,
      v.deleted_at,
      cp.usuario_id AS contratante_usuario_id
     FROM vacantes_publicadas v
     LEFT JOIN candidatos cp
       ON cp.id = v.contratante_candidato_id
      AND cp.deleted_at IS NULL
     WHERE v.id = ?
     LIMIT 1`,
    [vacanteId]
  );
  return rows[0] || null;
}

async function findCandidatoContext(candidatoId) {
  const [rows] = await db.query(
    `SELECT id, usuario_id, nombres, apellidos
     FROM candidatos
     WHERE id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [candidatoId]
  );
  return rows[0] || null;
}

async function listEmpresaUserIds(empresaId) {
  const [rows] = await db.query(
    `SELECT usuario_id
     FROM empresas_usuarios
     WHERE empresa_id = ?
       AND estado = 'activo'`,
    [empresaId]
  );
  return rows
    .map((row) => Number(row?.usuario_id || 0))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function existsPostulacionByVacanteAndCandidato(vacanteId, candidatoId) {
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

async function createOrReuseVacanteConversation(vacanteId, candidatoId, createdByUserId = null) {
  const [result] = await db.query(
    `INSERT INTO mensajes_conversaciones (tipo, vacante_id, candidato_id, creada_por_usuario_id, estado)
     VALUES ('vacante', ?, ?, ?, 'activa')
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       updated_at = NOW(),
       estado = IF(estado = 'cerrada', 'activa', estado)`,
    [vacanteId, candidatoId, createdByUserId]
  );
  return Number(result.insertId || 0);
}

async function createOrReuseDirectConversation(actorUserId, targetUserId) {
  const minId = Math.min(actorUserId, targetUserId);
  const maxId = Math.max(actorUserId, targetUserId);
  const directKey = `${minId}:${maxId}`;

  const [result] = await db.query(
    `INSERT INTO mensajes_conversaciones (tipo, direct_key, creada_por_usuario_id, estado)
     VALUES ('directa', ?, ?, 'activa')
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       updated_at = NOW(),
       estado = IF(estado = 'cerrada', 'activa', estado)`,
    [directKey, actorUserId]
  );
  return Number(result.insertId || 0);
}

async function upsertParticipants(conversationId, participants = []) {
  const unique = Array.from(
    new Map(
      (Array.isArray(participants) ? participants : [])
        .filter((item) => item?.usuario_id && item?.rol_contexto)
        .map((item) => [Number(item.usuario_id), { usuario_id: Number(item.usuario_id), rol_contexto: String(item.rol_contexto) }])
    ).values()
  );

  if (!unique.length) return;

  const values = unique.map(() => '(?, ?, ?, 1)').join(', ');
  const params = [];
  unique.forEach((item) => {
    params.push(conversationId, item.usuario_id, item.rol_contexto);
  });

  await db.query(
    `INSERT INTO mensajes_conversacion_participantes (conversacion_id, usuario_id, rol_contexto, activo)
     VALUES ${values}
     ON DUPLICATE KEY UPDATE
       activo = 1,
       rol_contexto = CASE
         WHEN mensajes_conversacion_participantes.rol_contexto = 'admin' THEN 'admin'
         ELSE VALUES(rol_contexto)
       END`,
    params
  );
}

async function syncVacanteParticipants(conversationId, vacante, candidato, adminUserId = null) {
  const ownerType = String(vacante?.contratante_tipo || (vacante?.empresa_id ? 'empresa' : 'persona'));
  const ownerUserIds = ownerType === 'empresa'
    ? await listEmpresaUserIds(vacante.empresa_id)
    : [Number(vacante.contratante_usuario_id || 0)].filter((id) => id > 0);

  const participants = [];
  ownerUserIds.forEach((usuarioId) => {
    participants.push({ usuario_id: usuarioId, rol_contexto: 'contratante' });
  });

  if (candidato?.usuario_id) {
    participants.push({ usuario_id: candidato.usuario_id, rol_contexto: 'candidato' });
  }

  if (adminUserId) {
    participants.push({ usuario_id: adminUserId, rol_contexto: 'admin' });
  }

  await upsertParticipants(conversationId, participants);
}

async function ensureConversationForVacanteCandidate({ vacanteId, candidatoId, actorUserId = null, includeAdmin = false } = {}) {
  await ensureMensajesSchema();
  const safeVacanteId = toPositiveIntOrNull(vacanteId);
  const safeCandidatoId = toPositiveIntOrNull(candidatoId);
  if (!safeVacanteId || !safeCandidatoId) {
    throw createServiceError('INVALID_IDS');
  }

  const vacante = await findVacanteContext(safeVacanteId);
  if (!vacante || vacante.deleted_at) throw createServiceError('VACANTE_NOT_FOUND');
  const candidato = await findCandidatoContext(safeCandidatoId);
  if (!candidato) throw createServiceError('CANDIDATO_NOT_FOUND');
  if (!candidato.usuario_id) throw createServiceError('CANDIDATO_USER_NOT_FOUND');

  const conversationId = await createOrReuseVacanteConversation(safeVacanteId, safeCandidatoId, actorUserId);
  await syncVacanteParticipants(conversationId, vacante, candidato, includeAdmin ? actorUserId : null);
  await ensureVacanteSystemSeedMessage({ conversationId, vacante, candidato });
  return conversationId;
}

async function ensureVacanteSystemSeedMessage({ conversationId, vacante, candidato } = {}) {
  const safeConversationId = toPositiveIntOrNull(conversationId);
  if (!safeConversationId) return;
  const senderUserId = toPositiveIntOrNull(candidato?.usuario_id);
  if (!senderUserId) return;

  const [rows] = await db.query(
    `SELECT id
     FROM mensajes
     WHERE conversacion_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [safeConversationId]
  );
  if (rows.length) return;

  const vacanteTitulo = String(vacante?.titulo || '').trim() || `#${vacante?.id || ''}`;
  const body = `He postulado para "${vacanteTitulo}". Estar\u00E9 atento al proceso.`;

  await db.query(
    `INSERT INTO mensajes (conversacion_id, remitente_usuario_id, cuerpo, tipo)
     VALUES (?, ?, ?, 'sistema')`,
    [safeConversationId, senderUserId, body]
  );

  await db.query(
    `UPDATE mensajes_conversaciones
     SET updated_at = NOW()
     WHERE id = ?`,
    [safeConversationId]
  );
}

async function createOrGetVacanteConversation({
  actorUserId,
  actorRole,
  vacanteId,
  candidatoId
} = {}) {
  await ensureMensajesSchema();
  const safeActorUserId = toPositiveIntOrNull(actorUserId);
  const safeVacanteId = toPositiveIntOrNull(vacanteId);
  const safeCandidatoId = toPositiveIntOrNull(candidatoId);
  if (!safeActorUserId || !safeVacanteId || !safeCandidatoId) {
    throw createServiceError('INVALID_PAYLOAD');
  }

  const vacante = await findVacanteContext(safeVacanteId);
  if (!vacante || vacante.deleted_at) throw createServiceError('VACANTE_NOT_FOUND');
  const candidato = await findCandidatoContext(safeCandidatoId);
  if (!candidato) throw createServiceError('CANDIDATO_NOT_FOUND');
  if (!candidato.usuario_id) throw createServiceError('CANDIDATO_USER_NOT_FOUND');

  const admin = isAdminRole(actorRole);
  if (!admin) {
    const ownerType = String(vacante?.contratante_tipo || (vacante?.empresa_id ? 'empresa' : 'persona'));
    const ownerUserIds = ownerType === 'empresa'
      ? await listEmpresaUserIds(vacante.empresa_id)
      : [Number(vacante.contratante_usuario_id || 0)].filter((id) => id > 0);
    const actorIsOwner = ownerUserIds.includes(safeActorUserId);
    const actorIsCandidate = Number(candidato.usuario_id) === safeActorUserId;

    if (!actorIsOwner && !actorIsCandidate) {
      throw createServiceError('FORBIDDEN');
    }

    const postulacionExists = await existsPostulacionByVacanteAndCandidato(safeVacanteId, safeCandidatoId);
    if (!postulacionExists) {
      throw createServiceError('POSTULACION_REQUIRED');
    }
  }

  const conversationId = await createOrReuseVacanteConversation(safeVacanteId, safeCandidatoId, safeActorUserId);
  await syncVacanteParticipants(conversationId, vacante, candidato, admin ? safeActorUserId : null);

  return getConversationByIdForUser({ conversationId, userId: safeActorUserId, isAdmin: admin });
}

async function createOrGetDirectConversation({
  actorUserId,
  actorRole,
  targetUserId
} = {}) {
  await ensureMensajesSchema();
  const safeActorUserId = toPositiveIntOrNull(actorUserId);
  const safeTargetUserId = toPositiveIntOrNull(targetUserId);
  if (!safeActorUserId || !safeTargetUserId) throw createServiceError('INVALID_PAYLOAD');
  if (!isAdminRole(actorRole)) throw createServiceError('FORBIDDEN');
  if (safeActorUserId === safeTargetUserId) throw createServiceError('INVALID_TARGET');

  const conversationId = await createOrReuseDirectConversation(safeActorUserId, safeTargetUserId);
  await upsertParticipants(conversationId, [
    { usuario_id: safeActorUserId, rol_contexto: 'admin' },
    { usuario_id: safeTargetUserId, rol_contexto: 'invitado' }
  ]);

  return getConversationByIdForUser({ conversationId, userId: safeActorUserId, isAdmin: true });
}

async function ensureConversationAccess({ conversationId, userId, isAdmin = false, autoJoinAdmin = false } = {}) {
  await ensureMensajesSchema();
  const safeConversationId = toPositiveIntOrNull(conversationId);
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeConversationId || !safeUserId) throw createServiceError('INVALID_PAYLOAD');

  const [rows] = await db.query(
    `SELECT
      c.id,
      c.tipo,
      c.vacante_id,
      c.candidato_id,
      c.estado,
      mp.id AS participante_id
     FROM mensajes_conversaciones c
     LEFT JOIN mensajes_conversacion_participantes mp
       ON mp.conversacion_id = c.id
      AND mp.usuario_id = ?
      AND mp.activo = 1
     WHERE c.id = ?
     LIMIT 1`,
    [safeUserId, safeConversationId]
  );

  const row = rows[0];
  if (!row) throw createServiceError('CONVERSACION_NOT_FOUND');

  if (!row.participante_id) {
    if (!isAdmin) throw createServiceError('FORBIDDEN');
    if (autoJoinAdmin) {
      await upsertParticipants(safeConversationId, [{ usuario_id: safeUserId, rol_contexto: 'admin' }]);
    } else {
      throw createServiceError('FORBIDDEN');
    }
  }

  return row;
}

async function listConversationsForUser({
  userId,
  page = 1,
  pageSize = 20,
  q = null,
  tipo = null
} = {}) {
  await ensureMensajesSchema();
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeUserId) throw createServiceError('INVALID_USER');

  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize);
  const offset = (safePage - 1) * safePageSize;
  const term = String(q || '').trim();
  const safeTipo = ['vacante', 'directa', 'soporte'].includes(String(tipo || '').trim()) ? String(tipo).trim() : null;

  const where = ['me.usuario_id = ?', 'me.activo = 1'];
  const params = [safeUserId];

  if (safeTipo) {
    where.push('c.tipo = ?');
    params.push(safeTipo);
  }

  if (term) {
    const like = `%${term}%`;
    where.push(`(
      v.titulo LIKE ?
      OR COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp_owner.nombres, cp_owner.apellidos)), '') LIKE ?
      OR TRIM(CONCAT_WS(' ', cp_candidato.nombres, cp_candidato.apellidos)) LIKE ?
      OR EXISTS (
        SELECT 1
        FROM mensajes_conversacion_participantes mp2
        INNER JOIN usuarios u2
          ON u2.id = mp2.usuario_id
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND u2.nombre_completo LIKE ?
      )
    )`);
    params.push(like, like, like, safeUserId, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM mensajes_conversaciones c
     INNER JOIN mensajes_conversacion_participantes me
       ON me.conversacion_id = c.id
     LEFT JOIN vacantes_publicadas v
       ON v.id = c.vacante_id
     LEFT JOIN empresas e
       ON e.id = v.empresa_id
     LEFT JOIN candidatos cp_owner
       ON cp_owner.id = v.contratante_candidato_id
     LEFT JOIN candidatos cp_candidato
       ON cp_candidato.id = c.candidato_id
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
      c.id,
      c.tipo,
      c.vacante_id,
      c.candidato_id,
      c.estado,
      c.updated_at,
      v.titulo AS vacante_titulo,
      COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp_owner.nombres, cp_owner.apellidos))) AS contratante_nombre,
      TRIM(CONCAT_WS(' ', cp_candidato.nombres, cp_candidato.apellidos)) AS candidato_nombre,
      ep.logo_url AS contratante_logo_url,
      f_owner.foto_url AS contratante_foto_url,
      f_candidato.foto_url AS candidato_foto_url,
      lm.id AS last_message_id,
      lm.cuerpo AS last_message_body,
      lm.created_at AS last_message_at,
      lm.remitente_usuario_id AS last_message_sender_id,
      u_sender.nombre_completo AS last_message_sender_nombre,
      (
        SELECT COUNT(*)
        FROM mensajes m2
        WHERE m2.conversacion_id = c.id
          AND m2.deleted_at IS NULL
          AND m2.id > COALESCE(me.ultimo_leido_mensaje_id, 0)
          AND (m2.remitente_usuario_id IS NULL OR m2.remitente_usuario_id <> ?)
      ) AS unread_count,
      (
        SELECT mp2.usuario_id
        FROM mensajes_conversacion_participantes mp2
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_user_id,
      (
        SELECT u2.nombre_completo
        FROM mensajes_conversacion_participantes mp2
        INNER JOIN usuarios u2
          ON u2.id = mp2.usuario_id
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_nombre,
      (
        SELECT COALESCE(
          f_counter.foto_url,
          (
            SELECT ep3.logo_url
            FROM empresas_usuarios eu3
            INNER JOIN empresas_perfil ep3
              ON ep3.empresa_id = eu3.empresa_id
            WHERE eu3.usuario_id = mp2.usuario_id
              AND eu3.estado = 'activo'
              AND COALESCE(TRIM(ep3.logo_url), '') <> ''
            ORDER BY eu3.principal DESC, eu3.id ASC
            LIMIT 1
          )
        )
        FROM mensajes_conversacion_participantes mp2
        INNER JOIN usuarios u2
          ON u2.id = mp2.usuario_id
        LEFT JOIN candidatos c2
          ON c2.usuario_id = u2.id
         AND c2.deleted_at IS NULL
        LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_counter
          ON f_counter.candidato_id = c2.id
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_avatar_url
     FROM mensajes_conversaciones c
     INNER JOIN mensajes_conversacion_participantes me
       ON me.conversacion_id = c.id
     LEFT JOIN vacantes_publicadas v
       ON v.id = c.vacante_id
     LEFT JOIN empresas e
       ON e.id = v.empresa_id
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     LEFT JOIN candidatos cp_owner
       ON cp_owner.id = v.contratante_candidato_id
     LEFT JOIN candidatos cp_candidato
       ON cp_candidato.id = c.candidato_id
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_owner
       ON f_owner.candidato_id = v.contratante_candidato_id
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_candidato
       ON f_candidato.candidato_id = c.candidato_id
     LEFT JOIN mensajes lm
       ON lm.id = (
         SELECT m1.id
         FROM mensajes m1
         WHERE m1.conversacion_id = c.id
           AND m1.deleted_at IS NULL
         ORDER BY m1.id DESC
         LIMIT 1
       )
     LEFT JOIN usuarios u_sender
       ON u_sender.id = lm.remitente_usuario_id
     ${whereSql}
     ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
     LIMIT ? OFFSET ?`,
    [safeUserId, safeUserId, safeUserId, safeUserId, ...params, safePageSize, offset]
  );

  return {
    items: rows.map((row) => ({
      ...row,
      unread_count: Number(row?.unread_count || 0)
    })),
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

async function getConversationListItemForUser({ conversationId, userId } = {}) {
  await ensureMensajesSchema();
  const safeConversationId = toPositiveIntOrNull(conversationId);
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeConversationId || !safeUserId) throw createServiceError('INVALID_PAYLOAD');

  const [rows] = await db.query(
    `SELECT
      c.id,
      c.tipo,
      c.vacante_id,
      c.candidato_id,
      c.estado,
      c.updated_at,
      v.titulo AS vacante_titulo,
      COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp_owner.nombres, cp_owner.apellidos))) AS contratante_nombre,
      TRIM(CONCAT_WS(' ', cp_candidato.nombres, cp_candidato.apellidos)) AS candidato_nombre,
      ep.logo_url AS contratante_logo_url,
      f_owner.foto_url AS contratante_foto_url,
      f_candidato.foto_url AS candidato_foto_url,
      lm.id AS last_message_id,
      lm.cuerpo AS last_message_body,
      lm.created_at AS last_message_at,
      lm.remitente_usuario_id AS last_message_sender_id,
      u_sender.nombre_completo AS last_message_sender_nombre,
      (
        SELECT COUNT(*)
        FROM mensajes m2
        WHERE m2.conversacion_id = c.id
          AND m2.deleted_at IS NULL
          AND m2.id > COALESCE(me.ultimo_leido_mensaje_id, 0)
          AND (m2.remitente_usuario_id IS NULL OR m2.remitente_usuario_id <> ?)
      ) AS unread_count,
      (
        SELECT mp2.usuario_id
        FROM mensajes_conversacion_participantes mp2
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_user_id,
      (
        SELECT u2.nombre_completo
        FROM mensajes_conversacion_participantes mp2
        INNER JOIN usuarios u2
          ON u2.id = mp2.usuario_id
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_nombre,
      (
        SELECT COALESCE(
          f_counter.foto_url,
          (
            SELECT ep3.logo_url
            FROM empresas_usuarios eu3
            INNER JOIN empresas_perfil ep3
              ON ep3.empresa_id = eu3.empresa_id
            WHERE eu3.usuario_id = mp2.usuario_id
              AND eu3.estado = 'activo'
              AND COALESCE(TRIM(ep3.logo_url), '') <> ''
            ORDER BY eu3.principal DESC, eu3.id ASC
            LIMIT 1
          )
        )
        FROM mensajes_conversacion_participantes mp2
        INNER JOIN usuarios u2
          ON u2.id = mp2.usuario_id
        LEFT JOIN candidatos c2
          ON c2.usuario_id = u2.id
         AND c2.deleted_at IS NULL
        LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_counter
          ON f_counter.candidato_id = c2.id
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_avatar_url
     FROM mensajes_conversaciones c
     INNER JOIN mensajes_conversacion_participantes me
       ON me.conversacion_id = c.id
      AND me.usuario_id = ?
      AND me.activo = 1
     LEFT JOIN vacantes_publicadas v
       ON v.id = c.vacante_id
     LEFT JOIN empresas e
       ON e.id = v.empresa_id
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     LEFT JOIN candidatos cp_owner
       ON cp_owner.id = v.contratante_candidato_id
     LEFT JOIN candidatos cp_candidato
       ON cp_candidato.id = c.candidato_id
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_owner
       ON f_owner.candidato_id = v.contratante_candidato_id
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_candidato
       ON f_candidato.candidato_id = c.candidato_id
     LEFT JOIN mensajes lm
       ON lm.id = (
         SELECT m1.id
         FROM mensajes m1
         WHERE m1.conversacion_id = c.id
           AND m1.deleted_at IS NULL
         ORDER BY m1.id DESC
         LIMIT 1
       )
     LEFT JOIN usuarios u_sender
       ON u_sender.id = lm.remitente_usuario_id
     WHERE c.id = ?
     LIMIT 1`,
    [safeUserId, safeUserId, safeUserId, safeUserId, safeUserId, safeConversationId]
  );

  const row = rows[0] || null;
  if (!row) return null;
  return {
    ...row,
    unread_count: Number(row?.unread_count || 0)
  };
}

async function getConversationByIdForUser({ conversationId, userId, isAdmin = false } = {}) {
  await ensureConversationAccess({ conversationId, userId, isAdmin, autoJoinAdmin: isAdmin });

  const [rows] = await db.query(
    `SELECT
      c.id,
      c.tipo,
      c.vacante_id,
      c.candidato_id,
      c.estado,
      c.created_at,
      c.updated_at,
      v.titulo AS vacante_titulo,
      COALESCE(e.nombre, TRIM(CONCAT_WS(' ', cp_owner.nombres, cp_owner.apellidos))) AS contratante_nombre,
      TRIM(CONCAT_WS(' ', cp_candidato.nombres, cp_candidato.apellidos)) AS candidato_nombre,
      ep.logo_url AS contratante_logo_url,
      f_owner.foto_url AS contratante_foto_url,
      f_candidato.foto_url AS candidato_foto_url,
      (
        SELECT COALESCE(
          f_counter.foto_url,
          (
            SELECT ep3.logo_url
            FROM empresas_usuarios eu3
            INNER JOIN empresas_perfil ep3
              ON ep3.empresa_id = eu3.empresa_id
            WHERE eu3.usuario_id = mp2.usuario_id
              AND eu3.estado = 'activo'
              AND COALESCE(TRIM(ep3.logo_url), '') <> ''
            ORDER BY eu3.principal DESC, eu3.id ASC
            LIMIT 1
          )
        )
        FROM mensajes_conversacion_participantes mp2
        INNER JOIN usuarios u2
          ON u2.id = mp2.usuario_id
        LEFT JOIN candidatos c2
          ON c2.usuario_id = u2.id
         AND c2.deleted_at IS NULL
        LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_counter
          ON f_counter.candidato_id = c2.id
        WHERE mp2.conversacion_id = c.id
          AND mp2.usuario_id <> ?
          AND mp2.activo = 1
        ORDER BY mp2.id ASC
        LIMIT 1
      ) AS counterpart_avatar_url
     FROM mensajes_conversaciones c
     LEFT JOIN vacantes_publicadas v
       ON v.id = c.vacante_id
     LEFT JOIN empresas e
       ON e.id = v.empresa_id
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     LEFT JOIN candidatos cp_owner
       ON cp_owner.id = v.contratante_candidato_id
     LEFT JOIN candidatos cp_candidato
       ON cp_candidato.id = c.candidato_id
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_owner
       ON f_owner.candidato_id = v.contratante_candidato_id
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_candidato
       ON f_candidato.candidato_id = c.candidato_id
     WHERE c.id = ?
     LIMIT 1`,
    [userId, conversationId]
  );

  const conversation = rows[0] || null;
  if (!conversation) throw createServiceError('CONVERSACION_NOT_FOUND');

  const [participants] = await db.query(
    `SELECT
      mp.usuario_id,
      mp.rol_contexto,
      mp.ultimo_leido_mensaje_id,
      mp.ultimo_leido_at,
      u.nombre_completo,
      u.email,
      u.rol,
      COALESCE(
        f_part.foto_url,
        (
          SELECT ep3.logo_url
          FROM empresas_usuarios eu3
          INNER JOIN empresas_perfil ep3
            ON ep3.empresa_id = eu3.empresa_id
          WHERE eu3.usuario_id = u.id
            AND eu3.estado = 'activo'
            AND COALESCE(TRIM(ep3.logo_url), '') <> ''
          ORDER BY eu3.principal DESC, eu3.id ASC
          LIMIT 1
        )
      ) AS avatar_url
     FROM mensajes_conversacion_participantes mp
     INNER JOIN usuarios u
       ON u.id = mp.usuario_id
     LEFT JOIN candidatos c_part
       ON c_part.usuario_id = u.id
      AND c_part.deleted_at IS NULL
     LEFT JOIN ${LATEST_CANDIDATO_FOTO_SQL} f_part
       ON f_part.candidato_id = c_part.id
     WHERE mp.conversacion_id = ?
       AND mp.activo = 1
     ORDER BY mp.id ASC`,
    [conversationId]
  );

  return {
    ...conversation,
    participantes: participants
  };
}

async function listMessagesByConversation({
  conversationId,
  userId,
  isAdmin = false,
  page = 1,
  pageSize = 50
} = {}) {
  await ensureConversationAccess({ conversationId, userId, isAdmin, autoJoinAdmin: false });
  const safePage = toPage(page);
  const safePageSize = toPageSize(pageSize, 50, 200);
  const offset = (safePage - 1) * safePageSize;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM mensajes
     WHERE conversacion_id = ?
       AND deleted_at IS NULL`,
    [conversationId]
  );

  const [rows] = await db.query(
    `SELECT
      m.id,
      m.conversacion_id,
      m.remitente_usuario_id,
      m.cuerpo,
      m.tipo,
      m.created_at,
      m.edited_at,
      u.nombre_completo AS remitente_nombre
     FROM mensajes m
     LEFT JOIN usuarios u
       ON u.id = m.remitente_usuario_id
     WHERE m.conversacion_id = ?
       AND m.deleted_at IS NULL
     ORDER BY m.id DESC
     LIMIT ? OFFSET ?`,
    [conversationId, safePageSize, offset]
  );

  return {
    items: rows.reverse(),
    page: safePage,
    page_size: safePageSize,
    total: Number(countRows[0]?.total || 0)
  };
}

async function sendMessageToConversation({
  conversationId,
  userId,
  userRole,
  body
} = {}) {
  const safeConversationId = toPositiveIntOrNull(conversationId);
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeConversationId || !safeUserId) throw createServiceError('INVALID_PAYLOAD');

  const text = String(body || '').trim();
  if (!text) throw createServiceError('MESSAGE_EMPTY');
  if (text.length > 4000) throw createServiceError('MESSAGE_TOO_LONG');

  const admin = isAdminRole(userRole);
  const conversation = await ensureConversationAccess({
    conversationId: safeConversationId,
    userId: safeUserId,
    isAdmin: admin,
    autoJoinAdmin: admin
  });

  const [result] = await db.query(
    `INSERT INTO mensajes (conversacion_id, remitente_usuario_id, cuerpo, tipo)
     VALUES (?, ?, ?, 'texto')`,
    [safeConversationId, safeUserId, text]
  );

  const messageId = Number(result.insertId || 0);

  await db.query(
    `UPDATE mensajes_conversaciones
     SET updated_at = NOW()
     WHERE id = ?`,
    [safeConversationId]
  );

  if (conversation.vacante_id && conversation.candidato_id) {
    await db.query(
      `UPDATE postulaciones
       SET ultima_actividad = NOW(),
           updated_at = NOW()
       WHERE vacante_id = ?
         AND candidato_id = ?
         AND deleted_at IS NULL`,
      [conversation.vacante_id, conversation.candidato_id]
    );
  }

  const [rows] = await db.query(
    `SELECT
      m.id,
      m.conversacion_id,
      m.remitente_usuario_id,
      m.cuerpo,
      m.tipo,
      m.created_at,
      m.edited_at,
      u.nombre_completo AS remitente_nombre
     FROM mensajes m
     LEFT JOIN usuarios u
       ON u.id = m.remitente_usuario_id
     WHERE m.id = ?
     LIMIT 1`,
    [messageId]
  );

  return rows[0] || null;
}

async function markConversationRead({
  conversationId,
  userId,
  userRole,
  messageId = null
} = {}) {
  const safeConversationId = toPositiveIntOrNull(conversationId);
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeConversationId || !safeUserId) throw createServiceError('INVALID_PAYLOAD');

  const admin = isAdminRole(userRole);
  await ensureConversationAccess({
    conversationId: safeConversationId,
    userId: safeUserId,
    isAdmin: admin,
    autoJoinAdmin: admin
  });

  let targetMessageId = toPositiveIntOrNull(messageId);
  if (targetMessageId) {
    const [rows] = await db.query(
      `SELECT id
       FROM mensajes
       WHERE id = ?
         AND conversacion_id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [targetMessageId, safeConversationId]
    );
    if (!rows.length) throw createServiceError('MESSAGE_NOT_FOUND');
  } else {
    const [rows] = await db.query(
      `SELECT id
       FROM mensajes
       WHERE conversacion_id = ?
         AND deleted_at IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [safeConversationId]
    );
    targetMessageId = rows[0]?.id || null;
  }

  await db.query(
    `UPDATE mensajes_conversacion_participantes
     SET ultimo_leido_mensaje_id = ?,
         ultimo_leido_at = NOW(),
         updated_at = NOW()
     WHERE conversacion_id = ?
       AND usuario_id = ?`,
    [targetMessageId, safeConversationId, safeUserId]
  );

  return { ok: true, ultimo_leido_mensaje_id: targetMessageId };
}

async function getUnreadSummaryByUser({ userId } = {}) {
  await ensureMensajesSchema();
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeUserId) throw createServiceError('INVALID_USER');

  const [rows] = await db.query(
    `SELECT COUNT(*) AS unread_total
     FROM mensajes m
     INNER JOIN mensajes_conversacion_participantes mp
       ON mp.conversacion_id = m.conversacion_id
      AND mp.usuario_id = ?
      AND mp.activo = 1
     WHERE m.deleted_at IS NULL
       AND (m.remitente_usuario_id IS NULL OR m.remitente_usuario_id <> ?)
       AND m.id > COALESCE(mp.ultimo_leido_mensaje_id, 0)`,
    [safeUserId, safeUserId]
  );

  return {
    unread_total: Number(rows[0]?.unread_total || 0)
  };
}

async function backfillVacanteSeedMessagesForUser({ userId, userRole, includeAll = false } = {}) {
  await ensureMensajesSchema();
  const safeUserId = toPositiveIntOrNull(userId);
  if (!safeUserId) throw createServiceError('INVALID_USER');

  const canAll = includeAll && isAdminRole(userRole);
  const scopeJoin = canAll
    ? ''
    : `INNER JOIN mensajes_conversacion_participantes me
         ON me.conversacion_id = c.id
        AND me.usuario_id = ?
        AND me.activo = 1`;

  const scopeParams = canAll ? [] : [safeUserId];

  await db.query(
    `UPDATE mensajes m
     INNER JOIN mensajes_conversaciones c
       ON c.id = m.conversacion_id
     ${scopeJoin}
     INNER JOIN candidatos cp_seed
       ON cp_seed.id = c.candidato_id
      AND cp_seed.deleted_at IS NULL
     SET m.remitente_usuario_id = cp_seed.usuario_id
     WHERE c.tipo = 'vacante'
       AND c.vacante_id IS NOT NULL
       AND c.candidato_id IS NOT NULL
       AND m.deleted_at IS NULL
       AND m.remitente_usuario_id IS NULL
       AND m.tipo = 'sistema'
       AND m.cuerpo LIKE 'He postulado para "%'
       AND cp_seed.usuario_id IS NOT NULL`,
    scopeParams
  );

  const [result] = await db.query(
    `INSERT INTO mensajes (conversacion_id, remitente_usuario_id, cuerpo, tipo)
     SELECT
       c.id,
       cp_seed.usuario_id,
       CONCAT(
         'He postulado para "',
         COALESCE(NULLIF(TRIM(v.titulo), ''), CONCAT('#', v.id)),
         '". Estar\u00E9 atento al proceso.'
       ) AS cuerpo,
       'sistema'
     FROM mensajes_conversaciones c
     ${scopeJoin}
     INNER JOIN vacantes_publicadas v
       ON v.id = c.vacante_id
     INNER JOIN candidatos cp_seed
       ON cp_seed.id = c.candidato_id
      AND cp_seed.deleted_at IS NULL
     LEFT JOIN mensajes m
       ON m.conversacion_id = c.id
      AND m.deleted_at IS NULL
     WHERE c.tipo = 'vacante'
       AND c.vacante_id IS NOT NULL
       AND c.candidato_id IS NOT NULL
       AND m.id IS NULL
       AND cp_seed.usuario_id IS NOT NULL`,
    scopeParams
  );

  return {
    seeded_count: Number(result?.affectedRows || 0)
  };
}

module.exports = {
  createServiceError,
  toPositiveIntOrNull,
  ensureMensajesSchema,
  ensureConversationAccess,
  ensureConversationForVacanteCandidate,
  createOrGetVacanteConversation,
  createOrGetDirectConversation,
  listConversationsForUser,
  getConversationListItemForUser,
  getConversationByIdForUser,
  listMessagesByConversation,
  sendMessageToConversation,
  markConversationRead,
  getUnreadSummaryByUser,
  backfillVacanteSeedMessagesForUser
};

