const db = require('../db');
let candidateDocumentsSchemaReadyPromise = null;

async function ensureCandidateDocumentsSchema() {
  if (candidateDocumentsSchemaReadyPromise) return candidateDocumentsSchemaReadyPromise;

  candidateDocumentsSchemaReadyPromise = (async () => {
    try {
      await db.query(
        `ALTER TABLE candidatos_documentos
         ADD COLUMN lado_documento ENUM('anverso','reverso') NULL AFTER tipo_documento`
      );
    } catch (error) {
      if (String(error?.code || '') !== 'ER_DUP_FIELDNAME') throw error;
    }

    try {
      await db.query(
        `ALTER TABLE candidatos_documentos
         DROP INDEX uk_candidato_tipo_doc`
      );
    } catch (error) {
      const code = String(error?.code || '');
      if (code !== 'ER_CANT_DROP_FIELD_OR_KEY' && code !== 'ER_DROP_INDEX_FK') throw error;
    }

    try {
      await db.query(
        `ALTER TABLE candidatos_documentos
         ADD INDEX idx_candidatos_documentos_lado (lado_documento)`
      );
    } catch (error) {
      if (String(error?.code || '') !== 'ER_DUP_KEYNAME') throw error;
    }
  })();

  try {
    await candidateDocumentsSchemaReadyPromise;
  } catch (error) {
    candidateDocumentsSchemaReadyPromise = null;
    throw error;
  }

  return candidateDocumentsSchemaReadyPromise;
}

function isSchemaDriftError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const errno = Number(error.errno || 0);
  return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE' || errno === 1054 || errno === 1146;
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

async function existsCandidato(candidatoId) {
  const [rows] = await db.query(
    `SELECT id
     FROM candidatos
     WHERE id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [candidatoId]
  );
  return Boolean(rows.length);
}

async function getPerfilByCandidatoId(candidatoId) {
  const [rows] = await db.query(
    `SELECT
      c.id AS c_id,
      c.usuario_id AS c_usuario_id,
      c.centro_id AS c_centro_id,
      c.interesado_id AS c_interesado_id,
      c.referente_id AS c_referente_id,
      c.nombres AS c_nombres,
      c.apellidos AS c_apellidos,
      c.documento_identidad AS c_documento_identidad,
      c.nacionalidad AS c_nacionalidad,
      c.fecha_nacimiento AS c_fecha_nacimiento,
      c.sexo AS c_sexo,
      c.estado_civil AS c_estado_civil,
      c.estado_academico AS c_estado_academico,
      c.activo AS c_activo,
      cc.email AS cc_email,
      cc.telefono_fijo AS cc_telefono_fijo,
      cc.telefono_celular AS cc_telefono_celular,
      cc.contacto_emergencia_nombre AS cc_contacto_emergencia_nombre,
      cc.contacto_emergencia_telefono AS cc_contacto_emergencia_telefono,
      cd.pais AS cd_pais,
      cd.provincia AS cd_provincia,
      cd.canton AS cd_canton,
      cd.parroquia AS cd_parroquia,
      cd.direccion AS cd_direccion,
      cd.codigo_postal AS cd_codigo_postal,
      cs.tipo_sangre AS cs_tipo_sangre,
      cs.estatura AS cs_estatura,
      cs.peso AS cs_peso,
      cs.tatuaje AS cs_tatuaje,
      cl.movilizacion AS cl_movilizacion,
      cl.tipo_vehiculo AS cl_tipo_vehiculo,
      cl.licencia AS cl_licencia,
      cl.disp_viajar AS cl_disp_viajar,
      cl.disp_turnos AS cl_disp_turnos,
      cl.disp_fines_semana AS cl_disp_fines_semana,
      ce.nivel_estudio AS ce_nivel_estudio,
      ce.institucion AS ce_institucion,
      ce.titulo_obtenido AS ce_titulo_obtenido
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
  if (!row) return null;

  const [educacionGeneralItems, idiomas, experiencia, documentos, formacion] = await Promise.all([
    listEducacionGeneralItems(candidatoId),
    listIdiomas(candidatoId),
    listExperiencias(candidatoId),
    listDocumentos(candidatoId),
    listFormacion(candidatoId)
  ]);

  return {
    datos_basicos: {
      id: row.c_id,
      usuario_id: row.c_usuario_id,
      centro_id: row.c_centro_id,
      interesado_id: row.c_interesado_id,
      referente_id: row.c_referente_id,
      nombres: row.c_nombres,
      apellidos: row.c_apellidos,
      documento_identidad: row.c_documento_identidad,
      nacionalidad: row.c_nacionalidad,
      fecha_nacimiento: row.c_fecha_nacimiento,
      sexo: row.c_sexo,
      estado_civil: row.c_estado_civil,
      estado_academico: row.c_estado_academico,
      activo: row.c_activo
    },
    contacto: {
      email: row.cc_email,
      telefono_fijo: row.cc_telefono_fijo,
      telefono_celular: row.cc_telefono_celular,
      contacto_emergencia_nombre: row.cc_contacto_emergencia_nombre,
      contacto_emergencia_telefono: row.cc_contacto_emergencia_telefono
    },
    domicilio: {
      pais: row.cd_pais,
      provincia: row.cd_provincia,
      canton: row.cd_canton,
      parroquia: row.cd_parroquia,
      direccion: row.cd_direccion,
      codigo_postal: row.cd_codigo_postal
    },
    salud: {
      tipo_sangre: row.cs_tipo_sangre,
      estatura: row.cs_estatura,
      peso: row.cs_peso,
      tatuaje: row.cs_tatuaje
    },
    logistica: {
      movilizacion: row.cl_movilizacion,
      tipo_vehiculo: row.cl_tipo_vehiculo,
      licencia: row.cl_licencia,
      disp_viajar: row.cl_disp_viajar,
      disp_turnos: row.cl_disp_turnos,
      disp_fines_semana: row.cl_disp_fines_semana
    },
    educacion: {
      nivel_estudio: row.ce_nivel_estudio,
      institucion: row.ce_institucion,
      titulo_obtenido: row.ce_titulo_obtenido
    },
    educacion_general_items: educacionGeneralItems,
    idiomas,
    experiencia,
    documentos,
    formacion_detalle: formacion
  };
}

async function updateDatosBasicos(candidatoId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  await db.query(
    `UPDATE candidatos
     SET ${setSql}
     WHERE id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => patch[key]), candidatoId]
  );
}

async function upsertByCandidatoIdPk(table, candidatoId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const columns = ['candidato_id', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [candidatoId, ...keys.map((key) => patch[key])];
  const updateSql = keys.map((key) => `${key} = VALUES(${key})`).join(', ');

  await db.query(
    `INSERT INTO ${table} (${columns.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    values
  );
}

async function listEducacionGeneralItems(candidatoId) {
  try {
    const [rows] = await db.query(
      `SELECT id, candidato_id, nivel_estudio, institucion, titulo_obtenido, created_at, updated_at
       FROM candidatos_educacion_general
       WHERE candidato_id = ?
         AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC`,
      [candidatoId]
    );
    return rows;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    try {
      const [rows] = await db.query(
        `SELECT
           candidato_id AS id,
           candidato_id,
           nivel_estudio,
           institucion,
           titulo_obtenido,
           created_at,
           updated_at
         FROM candidatos_educacion_general
         WHERE candidato_id = ?
           AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [candidatoId]
      );
      return rows;
    } catch (fallbackError) {
      if (!isSchemaDriftError(fallbackError)) throw fallbackError;
      return [];
    }
  }
}

async function createEducacionGeneralItem(candidatoId, payload) {
  const [result] = await db.query(
    `INSERT INTO candidatos_educacion_general (candidato_id, nivel_estudio, institucion, titulo_obtenido)
     VALUES (?, ?, ?, ?)`,
    [candidatoId, payload.nivel_estudio, payload.institucion ?? null, payload.titulo_obtenido ?? null]
  );
  return { id: result.insertId };
}

async function updateEducacionGeneralItem(candidatoId, itemId, payload) {
  const keys = Object.keys(payload);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_educacion_general
     SET ${setSql}
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => payload[key]), itemId, candidatoId]
  );
  return result.affectedRows;
}

async function deleteEducacionGeneralItem(candidatoId, itemId) {
  const [result] = await db.query(
    `UPDATE candidatos_educacion_general
     SET deleted_at = NOW()
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [itemId, candidatoId]
  );
  return result.affectedRows;
}

async function upsertEducacionGeneralSummary(candidatoId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const [rows] = await db.query(
    `SELECT id
     FROM candidatos_educacion_general
     WHERE candidato_id = ?
       AND deleted_at IS NULL
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [candidatoId]
  );

  const latestId = rows[0]?.id || null;
  if (!latestId) {
    const columns = ['candidato_id', ...keys];
    const placeholders = columns.map(() => '?').join(', ');
    await db.query(
      `INSERT INTO candidatos_educacion_general (${columns.join(', ')})
       VALUES (${placeholders})`,
      [candidatoId, ...keys.map((key) => patch[key])]
    );
    return;
  }

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  await db.query(
    `UPDATE candidatos_educacion_general
     SET ${setSql}
     WHERE id = ?`,
    [...keys.map((key) => patch[key]), latestId]
  );
}

async function listIdiomas(candidatoId) {
  const [rows] = await db.query(
    `SELECT id, candidato_id, idioma, nivel, created_at, updated_at
     FROM candidatos_idiomas
     WHERE candidato_id = ?
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [candidatoId]
  );
  return rows;
}

async function createIdioma(candidatoId, payload) {
  const [result] = await db.query(
    `INSERT INTO candidatos_idiomas (candidato_id, idioma, nivel)
     VALUES (?, ?, ?)`,
    [candidatoId, payload.idioma, payload.nivel]
  );
  return { id: result.insertId };
}

async function updateIdioma(candidatoId, idiomaId, payload) {
  const keys = Object.keys(payload);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_idiomas
     SET ${setSql}
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => payload[key]), idiomaId, candidatoId]
  );
  return result.affectedRows;
}

async function deleteIdioma(candidatoId, idiomaId) {
  const [result] = await db.query(
    `UPDATE candidatos_idiomas
     SET deleted_at = NOW()
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [idiomaId, candidatoId]
  );
  return result.affectedRows;
}

async function listExperiencias(candidatoId) {
  try {
    const [rows] = await db.query(
      `SELECT
        e.id,
        e.candidato_id,
        e.empresa_id,
        e.empresa_origen,
        e.empresa_origen_id,
        e.empresa_nombre,
        em.nombre AS empresa_local_nombre,
        e.cargo,
        e.fecha_inicio,
        e.fecha_fin,
        e.actualmente_trabaja,
        e.tipo_contrato,
        e.descripcion,
        e.created_at,
        e.updated_at,
        ec.id AS cert_id,
        ec.nombre_archivo AS cert_nombre_archivo,
        ec.nombre_original AS cert_nombre_original,
        ec.ruta_archivo AS cert_ruta_archivo,
        ec.tipo_mime AS cert_tipo_mime,
        ec.tamanio_kb AS cert_tamanio_kb,
        ec.fecha_emision AS cert_fecha_emision,
        ec.descripcion AS cert_descripcion,
        ec.estado AS cert_estado,
        ec.created_at AS cert_created_at,
        ec.updated_at AS cert_updated_at
       FROM candidatos_experiencia e
       LEFT JOIN empresas em
         ON em.id = e.empresa_id
        AND em.deleted_at IS NULL
       LEFT JOIN candidatos_experiencia_certificados ec
         ON ec.experiencia_id = e.id
        AND ec.deleted_at IS NULL
       WHERE e.candidato_id = ?
         AND e.deleted_at IS NULL
       ORDER BY e.created_at DESC`,
      [candidatoId]
    );

    return rows.map((row) => ({
      id: row.id,
      candidato_id: row.candidato_id,
      empresa_id: row.empresa_id,
      empresa_origen: row.empresa_origen,
      empresa_origen_id: row.empresa_origen_id,
      empresa_nombre: row.empresa_nombre,
      empresa_local_nombre: row.empresa_local_nombre || null,
      cargo: row.cargo,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      actualmente_trabaja: row.actualmente_trabaja,
      tipo_contrato: row.tipo_contrato,
      descripcion: row.descripcion,
      created_at: row.created_at,
      updated_at: row.updated_at,
      certificado_laboral: row.cert_id
        ? {
            id: row.cert_id,
            nombre_archivo: row.cert_nombre_archivo,
            nombre_original: row.cert_nombre_original,
            ruta_archivo: row.cert_ruta_archivo,
            tipo_mime: row.cert_tipo_mime,
            tamanio_kb: row.cert_tamanio_kb,
            fecha_emision: row.cert_fecha_emision,
            descripcion: row.cert_descripcion,
            estado: row.cert_estado,
            created_at: row.cert_created_at,
            updated_at: row.cert_updated_at
          }
        : null
    }));
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    try {
      const [rows] = await db.query(
        `SELECT
          e.id,
          e.candidato_id,
          e.empresa_id,
          e.empresa_origen,
          e.empresa_origen_id,
          e.empresa_nombre,
          em.nombre AS empresa_local_nombre,
          e.cargo,
          e.fecha_inicio,
          e.fecha_fin,
          e.actualmente_trabaja,
          e.tipo_contrato,
          e.descripcion,
          e.created_at,
          e.updated_at
         FROM candidatos_experiencia e
         LEFT JOIN empresas em
           ON em.id = e.empresa_id
          AND em.deleted_at IS NULL
         WHERE e.candidato_id = ?
           AND e.deleted_at IS NULL
         ORDER BY e.created_at DESC`,
        [candidatoId]
      );
      return rows.map((row) => ({
        ...row,
        certificado_laboral: null
      }));
    } catch (fallbackError) {
      if (!isSchemaDriftError(fallbackError)) throw fallbackError;
      try {
        const [rows] = await db.query(
          `SELECT
            e.id,
            e.candidato_id,
            e.empresa_id,
            NULL AS empresa_origen,
            NULL AS empresa_origen_id,
            NULL AS empresa_nombre,
            NULL AS empresa_local_nombre,
            e.cargo,
            e.fecha_inicio,
            e.fecha_fin,
            e.actualmente_trabaja,
            e.tipo_contrato,
            e.descripcion,
            e.created_at,
            e.updated_at
           FROM candidatos_experiencia e
           WHERE e.candidato_id = ?
             AND e.deleted_at IS NULL
           ORDER BY e.created_at DESC`,
          [candidatoId]
        );
        return rows.map((row) => ({
          ...row,
          certificado_laboral: null
        }));
      } catch (legacyError) {
        if (!isSchemaDriftError(legacyError)) throw legacyError;
        return [];
      }
    }
  }
}

async function findEmpresaNombreById(empresaId) {
  const normalizedId = normalizePositiveInt(empresaId);
  if (!normalizedId) return null;
  const [rows] = await db.query(
    `SELECT nombre
     FROM empresas
     WHERE id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [normalizedId]
  );
  return rows[0]?.nombre || null;
}

async function createExperiencia(candidatoId, payload) {
  let empresaNombre = payload.empresa_nombre ?? null;
  if (payload.empresa_id) {
    const nombreLocal = await findEmpresaNombreById(payload.empresa_id);
    if (nombreLocal) empresaNombre = nombreLocal;
  }

  let result;
  try {
    [result] = await db.query(
      `INSERT INTO candidatos_experiencia (
        candidato_id, empresa_id, empresa_nombre, cargo, fecha_inicio, fecha_fin, actualmente_trabaja, tipo_contrato, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidatoId,
        payload.empresa_id ?? null,
        empresaNombre,
        payload.cargo ?? null,
        payload.fecha_inicio ?? null,
        payload.fecha_fin ?? null,
        payload.actualmente_trabaja ?? 0,
        payload.tipo_contrato ?? null,
        payload.descripcion ?? null
      ]
    );
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    [result] = await db.query(
      `INSERT INTO candidatos_experiencia (
        candidato_id, empresa_id, cargo, fecha_inicio, fecha_fin, actualmente_trabaja, tipo_contrato, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidatoId,
        payload.empresa_id ?? null,
        payload.cargo ?? null,
        payload.fecha_inicio ?? null,
        payload.fecha_fin ?? null,
        payload.actualmente_trabaja ?? 0,
        payload.tipo_contrato ?? null,
        payload.descripcion ?? null
      ]
    );
  }
  return { id: result.insertId };
}

async function updateExperiencia(candidatoId, experienciaId, payload) {
  const normalizedPayload = { ...payload };
  if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'empresa_id')) {
    if (normalizedPayload.empresa_id) {
      const nombreLocal = await findEmpresaNombreById(normalizedPayload.empresa_id);
      if (nombreLocal) normalizedPayload.empresa_nombre = nombreLocal;
    } else if (!Object.prototype.hasOwnProperty.call(normalizedPayload, 'empresa_nombre')) {
      normalizedPayload.empresa_nombre = null;
    }
  }

  const keys = Object.keys(normalizedPayload);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  try {
    const [result] = await db.query(
      `UPDATE candidatos_experiencia
       SET ${setSql}
       WHERE id = ?
         AND candidato_id = ?
         AND deleted_at IS NULL`,
      [...keys.map((key) => normalizedPayload[key]), experienciaId, candidatoId]
    );
    return result.affectedRows;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;

    const fallbackPayload = { ...normalizedPayload };
    delete fallbackPayload.empresa_nombre;
    const fallbackKeys = Object.keys(fallbackPayload);
    if (!fallbackKeys.length) return 0;
    const fallbackSetSql = fallbackKeys.map((key) => `${key} = ?`).join(', ');
    const [result] = await db.query(
      `UPDATE candidatos_experiencia
       SET ${fallbackSetSql}
       WHERE id = ?
         AND candidato_id = ?
         AND deleted_at IS NULL`,
      [...fallbackKeys.map((key) => fallbackPayload[key]), experienciaId, candidatoId]
    );
    return result.affectedRows;
  }
}

async function deleteExperiencia(candidatoId, experienciaId) {
  const [result] = await db.query(
    `UPDATE candidatos_experiencia
     SET deleted_at = NOW()
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [experienciaId, candidatoId]
  );
  return result.affectedRows;
}

async function existsExperiencia(candidatoId, experienciaId) {
  const [rows] = await db.query(
    `SELECT id
     FROM candidatos_experiencia
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [experienciaId, candidatoId]
  );
  return Boolean(rows.length);
}

async function getExperienciaCertificado(candidatoId, experienciaId) {
  const [rows] = await db.query(
    `SELECT
      e.id AS experiencia_id,
      ec.id,
      ec.candidato_id,
      ec.experiencia_id AS cert_experiencia_id,
      ec.nombre_archivo,
      ec.nombre_original,
      ec.ruta_archivo,
      ec.tipo_mime,
      ec.tamanio_kb,
      ec.fecha_emision,
      ec.descripcion,
      ec.estado,
      ec.created_at,
      ec.updated_at
     FROM candidatos_experiencia e
     LEFT JOIN candidatos_experiencia_certificados ec
       ON ec.experiencia_id = e.id
      AND ec.deleted_at IS NULL
     WHERE e.id = ?
       AND e.candidato_id = ?
       AND e.deleted_at IS NULL
     LIMIT 1`,
    [experienciaId, candidatoId]
  );

  const row = rows[0];
  if (!row) return { exists: false, certificado: null };
  if (!row.id) return { exists: true, certificado: null };

  return {
    exists: true,
    certificado: {
      id: row.id,
      candidato_id: row.candidato_id,
      experiencia_id: row.cert_experiencia_id,
      nombre_archivo: row.nombre_archivo,
      nombre_original: row.nombre_original,
      ruta_archivo: row.ruta_archivo,
      tipo_mime: row.tipo_mime,
      tamanio_kb: row.tamanio_kb,
      fecha_emision: row.fecha_emision,
      descripcion: row.descripcion,
      estado: row.estado,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  };
}

async function createExperienciaCertificado(candidatoId, experienciaId, payload) {
  const exists = await existsExperiencia(candidatoId, experienciaId);
  if (!exists) return null;

  await db.query(
    `INSERT INTO candidatos_experiencia_certificados (
      candidato_id,
      experiencia_id,
      nombre_archivo,
      nombre_original,
      ruta_archivo,
      tipo_mime,
      tamanio_kb,
      fecha_emision,
      descripcion,
      estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nombre_archivo = VALUES(nombre_archivo),
      nombre_original = VALUES(nombre_original),
      ruta_archivo = VALUES(ruta_archivo),
      tipo_mime = VALUES(tipo_mime),
      tamanio_kb = VALUES(tamanio_kb),
      fecha_emision = VALUES(fecha_emision),
      descripcion = VALUES(descripcion),
      estado = VALUES(estado),
      deleted_at = NULL`,
    [
      candidatoId,
      experienciaId,
      payload.nombre_archivo,
      payload.nombre_original,
      payload.ruta_archivo,
      payload.tipo_mime,
      payload.tamanio_kb,
      payload.fecha_emision ?? null,
      payload.descripcion ?? null,
      payload.estado ?? 'pendiente'
    ]
  );

  const cert = await getExperienciaCertificado(candidatoId, experienciaId);
  return cert.certificado;
}

async function updateExperienciaCertificado(candidatoId, experienciaId, patch) {
  const experienciaExiste = await existsExperiencia(candidatoId, experienciaId);
  if (!experienciaExiste) return -1;

  const keys = Object.keys(patch);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_experiencia_certificados
     SET ${setSql}
     WHERE experiencia_id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => patch[key]), experienciaId, candidatoId]
  );
  return result.affectedRows;
}

async function deleteExperienciaCertificado(candidatoId, experienciaId) {
  const experienciaExiste = await existsExperiencia(candidatoId, experienciaId);
  if (!experienciaExiste) return -1;

  const [result] = await db.query(
    `UPDATE candidatos_experiencia_certificados
     SET deleted_at = NOW()
     WHERE experiencia_id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [experienciaId, candidatoId]
  );
  return result.affectedRows;
}

function buildServiceError(code, status) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeCenterName(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function toTextOrNull(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function mergeCenterOrigin(currentOrigin, incomingOrigin) {
  if (!currentOrigin) return incomingOrigin;
  if (currentOrigin === incomingOrigin) return currentOrigin;
  return 'mixto';
}

async function findCentroCapacitacionById(centroId) {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, origen, activo
       FROM centros_capacitacion
       WHERE id = ?
       LIMIT 1`,
      [centroId]
    );
    return rows[0] || null;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    return null;
  }
}

async function findCentroCapacitacionByNombre(nombre) {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, origen, activo
       FROM centros_capacitacion
       WHERE nombre = ?
       LIMIT 1`,
      [nombre]
    );
    return rows[0] || null;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    return null;
  }
}

async function findOrCreateCentroCapacitacionByNombre(nombre, origen = 'externo') {
  const existing = await findCentroCapacitacionByNombre(nombre);
  if (existing) {
    const mergedOrigin = mergeCenterOrigin(existing.origen, origen);
    if (mergedOrigin !== existing.origen) {
      await db.query(
        `UPDATE centros_capacitacion
         SET origen = ?, updated_at = NOW()
         WHERE id = ?`,
        [mergedOrigin, existing.id]
      );
      existing.origen = mergedOrigin;
    }
    return existing;
  }

  try {
    const [insert] = await db.query(
      `INSERT INTO centros_capacitacion (nombre, origen, activo)
       VALUES (?, ?, 1)`,
      [nombre, origen]
    );
    return {
      id: insert.insertId,
      nombre,
      origen,
      activo: 1
    };
  } catch (error) {
    if (isSchemaDriftError(error)) {
      return {
        id: null,
        nombre,
        origen,
        activo: 1
      };
    }
    if (String(error.code || '') !== 'ER_DUP_ENTRY') throw error;
    const duplicate = await findCentroCapacitacionByNombre(nombre);
    if (!duplicate) throw error;
    const mergedOrigin = mergeCenterOrigin(duplicate.origen, origen);
    if (mergedOrigin !== duplicate.origen) {
      await db.query(
        `UPDATE centros_capacitacion
         SET origen = ?, updated_at = NOW()
         WHERE id = ?`,
        [mergedOrigin, duplicate.id]
      );
      duplicate.origen = mergedOrigin;
    }
    return duplicate;
  }
}

async function resolveCentroCapacitacionForFormacion({
  categoriaFormacion,
  centroClienteId,
  institucion,
  allowCenterCreate = true,
  centerOrigin = 'externo'
}) {
  if (categoriaFormacion !== 'externa') {
    return {
      centro_cliente_id: centroClienteId ?? null,
      institucion: normalizeCenterName(institucion)
    };
  }

  const centroId = normalizePositiveInt(centroClienteId);
  if (centroId) {
    const centro = await findCentroCapacitacionById(centroId);
    if (centro) {
      return {
        centro_cliente_id: centro.id,
        institucion: centro.nombre
      };
    }
  }

  const institucionNorm = normalizeCenterName(institucion);
  if (!institucionNorm && centroId) {
    throw buildServiceError('CENTRO_CAPACITACION_NOT_FOUND', 400);
  }
  if (institucionNorm) {
    if (!allowCenterCreate) {
      return {
        centro_cliente_id: null,
        institucion: institucionNorm
      };
    }
    const centro = await findOrCreateCentroCapacitacionByNombre(institucionNorm, centerOrigin);
    return {
      centro_cliente_id: centro.id,
      institucion: centro.nombre
    };
  }

  throw buildServiceError('FORMACION_INSTITUCION_REQUIRED', 422);
}

async function listCentrosCapacitacion({ search = null, limit = 20 } = {}) {
  const term = normalizeCenterName(search);
  const safeLimit = Math.min(Math.max(Number(limit || 20), 1), 100);
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, origen, activo
       FROM centros_capacitacion
       WHERE activo = 1
         AND (? IS NULL OR nombre LIKE ?)
       ORDER BY nombre ASC
       LIMIT ?`,
      [term, term ? `%${term}%` : null, safeLimit]
    );
    return rows;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    return [];
  }
}

async function listEmpresasExperiencia({ search = null, limit = 30 } = {}) {
  const term = toTextOrNull(search);
  const safeLimit = Math.min(Math.max(Number(limit || 30), 1), 100);
  const like = term ? `%${term}%` : null;
  const [rows] = await db.query(
    `SELECT id, nombre, ruc, email, tipo
     FROM empresas
     WHERE deleted_at IS NULL
       AND activo = 1
       AND (? IS NULL OR nombre LIKE ? OR ruc LIKE ? OR email LIKE ?)
     ORDER BY
       CASE
         WHEN ? IS NOT NULL AND nombre = ? THEN 0
         WHEN ? IS NOT NULL AND nombre LIKE ? THEN 1
         ELSE 2
       END,
       nombre ASC
     LIMIT ?`,
    [term, like, like, like, term, term, term, term ? `${term}%` : null, safeLimit]
  );
  return rows;
}

async function listFormacion(candidatoId) {
  let rows = [];
  try {
    const [queryRows] = await db.query(
      `SELECT
        f.id,
        f.candidato_id,
        f.fecha_aprobacion,
        f.activo,
        f.categoria_formacion,
        f.subtipo_formacion,
        f.centro_cliente_id,
        f.institucion,
        cc.nombre AS centro_cliente_nombre,
        f.nombre_programa,
        f.titulo_obtenido,
        f.entidad_emisora,
        f.numero_registro,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.created_at,
        f.updated_at
       FROM candidatos_formaciones f
       LEFT JOIN centros_capacitacion cc
         ON cc.id = f.centro_cliente_id
       WHERE f.candidato_id = ?
         AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
      [candidatoId]
    );
    rows = queryRows;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    const [queryRows] = await db.query(
      `SELECT
        f.id,
        f.candidato_id,
        f.fecha_aprobacion,
        f.activo,
        f.categoria_formacion,
        f.subtipo_formacion,
        NULL AS centro_cliente_id,
        f.institucion,
        NULL AS centro_cliente_nombre,
        f.nombre_programa,
        f.titulo_obtenido,
        f.entidad_emisora,
        f.numero_registro,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.created_at,
        f.updated_at
       FROM candidatos_formaciones f
       WHERE f.candidato_id = ?
         AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
      [candidatoId]
    );
    rows = queryRows;
  }

  return rows.map((row) => {
    return {
      id: row.id,
      candidato_id: row.candidato_id,
      fecha_aprobacion: row.fecha_aprobacion,
      activo: row.activo,
      categoria_formacion: row.categoria_formacion,
      subtipo_formacion: row.subtipo_formacion,
      centro_cliente_id: row.centro_cliente_id,
      centro_cliente_nombre: row.centro_cliente_nombre,
      institucion: row.institucion,
      nombre_programa: row.nombre_programa,
      titulo_obtenido: row.titulo_obtenido,
      entidad_emisora: row.entidad_emisora,
      numero_registro: row.numero_registro,
      fecha_emision: row.fecha_emision,
      fecha_vencimiento: row.fecha_vencimiento,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  });
}

async function createFormacion(candidatoId, payload) {
  const resolvedCenter = await resolveCentroCapacitacionForFormacion({
    categoriaFormacion: payload.categoria_formacion,
    centroClienteId: payload.centro_cliente_id,
    institucion: payload.institucion,
    allowCenterCreate: true,
    centerOrigin: 'externo'
  });

  let result;
  try {
    [result] = await db.query(
      `INSERT INTO candidatos_formaciones (
        candidato_id,
        fecha_aprobacion,
        activo,
        categoria_formacion,
        subtipo_formacion,
        centro_cliente_id,
        institucion,
        nombre_programa,
        titulo_obtenido,
        entidad_emisora,
        numero_registro,
        fecha_emision,
        fecha_vencimiento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidatoId,
        payload.fecha_aprobacion ?? null,
        payload.activo ?? 1,
        payload.categoria_formacion,
        payload.subtipo_formacion,
        resolvedCenter.centro_cliente_id,
        resolvedCenter.institucion,
        payload.nombre_programa ?? null,
        payload.titulo_obtenido ?? null,
        payload.entidad_emisora ?? null,
        payload.numero_registro ?? null,
        payload.fecha_emision ?? null,
        payload.fecha_vencimiento ?? null
      ]
    );
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    [result] = await db.query(
      `INSERT INTO candidatos_formaciones (
        candidato_id,
        fecha_aprobacion,
        activo,
        categoria_formacion,
        subtipo_formacion,
        institucion,
        nombre_programa,
        titulo_obtenido,
        entidad_emisora,
        numero_registro,
        fecha_emision,
        fecha_vencimiento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidatoId,
        payload.fecha_aprobacion ?? null,
        payload.activo ?? 1,
        payload.categoria_formacion,
        payload.subtipo_formacion,
        resolvedCenter.institucion,
        payload.nombre_programa ?? null,
        payload.titulo_obtenido ?? null,
        payload.entidad_emisora ?? null,
        payload.numero_registro ?? null,
        payload.fecha_emision ?? null,
        payload.fecha_vencimiento ?? null
      ]
    );
  }
  return { id: result.insertId };
}

async function updateFormacion(candidatoId, formacionId, payload) {
  let rows = [];
  let hasCenterColumn = true;
  try {
    const [queryRows] = await db.query(
      `SELECT id, categoria_formacion, centro_cliente_id, institucion
       FROM candidatos_formaciones
       WHERE id = ?
         AND candidato_id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [formacionId, candidatoId]
    );
    rows = queryRows;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    hasCenterColumn = false;
    const [queryRows] = await db.query(
      `SELECT id, categoria_formacion, institucion
       FROM candidatos_formaciones
       WHERE id = ?
         AND candidato_id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [formacionId, candidatoId]
    );
    rows = queryRows.map((row) => ({
      ...row,
      centro_cliente_id: null
    }));
  }
  if (!rows.length) return 0;

  const current = rows[0];
  const keys = Object.keys(payload);
  if (!keys.length) return 0;

  const hasCategoria = Object.prototype.hasOwnProperty.call(payload, 'categoria_formacion');
  const hasCentroClienteId = Object.prototype.hasOwnProperty.call(payload, 'centro_cliente_id');
  const hasInstitucion = Object.prototype.hasOwnProperty.call(payload, 'institucion');
  const mustResolveCenter = hasCategoria || hasCentroClienteId || hasInstitucion;

  if (mustResolveCenter) {
    const categoriaFormacion = hasCategoria ? payload.categoria_formacion : current.categoria_formacion;
    const centroClienteId = hasCentroClienteId ? payload.centro_cliente_id : current.centro_cliente_id;
    const institucion = hasInstitucion ? payload.institucion : current.institucion;
    const resolvedCenter = await resolveCentroCapacitacionForFormacion({
      categoriaFormacion,
      centroClienteId,
      institucion,
      allowCenterCreate: true,
      centerOrigin: 'externo'
    });
    payload.centro_cliente_id = resolvedCenter.centro_cliente_id;
    payload.institucion = resolvedCenter.institucion;
  }

  if (!hasCenterColumn) {
    delete payload.centro_cliente_id;
  }

  const payloadKeys = Object.keys(payload);
  if (!payloadKeys.length) return 0;
  const setSql = payloadKeys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_formaciones
     SET ${setSql}
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...payloadKeys.map((key) => payload[key]), formacionId, candidatoId]
  );
  return result.affectedRows;
}

async function deleteFormacion(candidatoId, formacionId) {
  const [result] = await db.query(
    `UPDATE candidatos_formaciones
     SET deleted_at = NOW()
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [formacionId, candidatoId]
  );
  return result.affectedRows;
}

async function existsFormacion(candidatoId, formacionId) {
  const [rows] = await db.query(
    `SELECT id
     FROM candidatos_formaciones
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [formacionId, candidatoId]
  );
  return Boolean(rows.length);
}

async function listDocumentos(candidatoId) {
  await ensureCandidateDocumentsSchema();

  const [rows] = await db.query(
    `SELECT
      id,
      candidato_id,
      tipo_documento,
      lado_documento,
      nombre_archivo,
      nombre_original,
      ruta_archivo,
      tipo_mime,
      tamanio_kb,
      fecha_emision,
      fecha_vencimiento,
      numero_documento,
      descripcion,
      estado,
      observaciones,
      subido_por,
      verificado_por,
      fecha_verificacion,
      created_at,
      updated_at
     FROM candidatos_documentos
     WHERE candidato_id = ?
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [candidatoId]
  );
  return rows;
}

async function hasCandidateVerificationSupportDocuments(candidatoId) {
  await ensureCandidateDocumentsSchema();

  const [rows] = await db.query(
    `SELECT
      MAX(
        CASE
          WHEN tipo_documento = 'documento_identidad'
            AND lado_documento = 'anverso'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
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
          THEN 1
          ELSE 0
        END
      ) AS identidad_reverso,
      SUM(
        CASE
          WHEN tipo_documento = 'documento_identidad'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
          THEN 1
          ELSE 0
        END
      ) AS identidad_docs,
      SUM(
        CASE
          WHEN tipo_documento = 'licencia_conducir'
            AND COALESCE(TRIM(ruta_archivo), '') <> ''
            AND (estado IS NULL OR estado NOT IN ('rechazado', 'vencido'))
          THEN 1
          ELSE 0
        END
      ) AS licencia_docs
     FROM candidatos_documentos
     WHERE candidato_id = ?
       AND deleted_at IS NULL`,
    [candidatoId]
  );

  const row = rows[0] || {};
  const identidadAnverso = Number(row.identidad_anverso || 0);
  const identidadReverso = Number(row.identidad_reverso || 0);
  const identidadDocs = Number(row.identidad_docs || 0);
  const licenciaDocs = Number(row.licencia_docs || 0);
  const hasCedulaAmbosLados = identidadAnverso > 0 && identidadReverso > 0;
  const hasCedulaLegacy = identidadDocs >= 2;
  const hasLicencia = licenciaDocs >= 1;

  return {
    identidad_anverso: identidadAnverso,
    identidad_reverso: identidadReverso,
    identidad_docs: identidadDocs,
    licencia_docs: licenciaDocs,
    has_cedula_ambos_lados: hasCedulaAmbosLados,
    has_cedula_legacy: hasCedulaLegacy,
    has_licencia: hasLicencia,
    is_eligible: hasCedulaAmbosLados || hasCedulaLegacy || hasLicencia
  };
}

async function createDocumento(candidatoId, payload) {
  await ensureCandidateDocumentsSchema();

  const [result] = await db.query(
    `INSERT INTO candidatos_documentos (
      candidato_id,
      tipo_documento,
      lado_documento,
      nombre_archivo,
      nombre_original,
      ruta_archivo,
      tipo_mime,
      tamanio_kb,
      fecha_emision,
      fecha_vencimiento,
      numero_documento,
      descripcion,
      estado,
      observaciones,
      subido_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      candidatoId,
      payload.tipo_documento,
      payload.lado_documento ?? null,
      payload.nombre_archivo,
      payload.nombre_original,
      payload.ruta_archivo,
      payload.tipo_mime,
      payload.tamanio_kb,
      payload.fecha_emision ?? null,
      payload.fecha_vencimiento ?? null,
      payload.numero_documento ?? null,
      payload.descripcion ?? null,
      payload.estado ?? 'pendiente',
      payload.observaciones ?? null,
      payload.subido_por ?? null
    ]
  );
  return { id: result.insertId };
}

async function existsDocumentoByTipoLado(candidatoId, { tipoDocumento, ladoDocumento, excludeId = null } = {}) {
  await ensureCandidateDocumentsSchema();

  const safeTipo = String(tipoDocumento || '').trim();
  const safeLado = ladoDocumento ? String(ladoDocumento).trim() : null;
  if (!safeTipo) return false;

  const params = [candidatoId, safeTipo, safeLado];
  let sql = `SELECT id
             FROM candidatos_documentos
             WHERE candidato_id = ?
               AND tipo_documento = ?
               AND lado_documento <=> ?
               AND deleted_at IS NULL`;

  if (excludeId && Number.isInteger(Number(excludeId))) {
    sql += ' AND id <> ?';
    params.push(Number(excludeId));
  }

  sql += ' LIMIT 1';

  const [rows] = await db.query(sql, params);
  return Boolean(rows.length);
}

async function updateDocumento(candidatoId, documentoId, patch) {
  await ensureCandidateDocumentsSchema();

  const keys = Object.keys(patch);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_documentos
     SET ${setSql}
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => patch[key]), documentoId, candidatoId]
  );
  return result.affectedRows;
}

async function deleteDocumento(candidatoId, documentoId) {
  await ensureCandidateDocumentsSchema();

  const [result] = await db.query(
    `UPDATE candidatos_documentos
     SET deleted_at = NOW()
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [documentoId, candidatoId]
  );
  return result.affectedRows;
}

module.exports = {
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
  existsFormacion,
  listDocumentos,
  hasCandidateVerificationSupportDocuments,
  createDocumento,
  existsDocumentoByTipoLado,
  updateDocumento,
  deleteDocumento
};


