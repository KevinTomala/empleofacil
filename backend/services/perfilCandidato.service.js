const db = require('../db');

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

  const formacionResultados = formacion
    .filter((item) => item.resultado)
    .map((item) => ({
      candidato_formacion_id: item.id,
      ...item.resultado
    }));

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
    formacion_detalle: formacion,
    formacion_resultados: formacionResultados
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
    } catch (fallbackError) {
      if (!isSchemaDriftError(fallbackError)) throw fallbackError;
      return [];
    }
  }
}

async function createExperiencia(candidatoId, payload) {
  const [result] = await db.query(
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
  return { id: result.insertId };
}

async function updateExperiencia(candidatoId, experienciaId, payload) {
  const keys = Object.keys(payload);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_experiencia
     SET ${setSql}
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => payload[key]), experienciaId, candidatoId]
  );
  return result.affectedRows;
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

async function listFormacion(candidatoId) {
  let rows = [];
  try {
    const [rowsFull] = await db.query(
      `SELECT
        f.id,
        f.candidato_id,
        f.fecha_aprobacion,
        f.activo,
        f.categoria_formacion,
        f.subtipo_formacion,
        f.institucion,
        f.nombre_programa,
        f.titulo_obtenido,
        f.entidad_emisora,
        f.numero_registro,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.created_at,
        f.updated_at,
        fr.id AS fr_id,
        fr.resultado_curso AS fr_resultado_curso,
        fr.nota_curso AS fr_nota_curso,
        fr.fuente_curso AS fr_fuente_curso,
        fr.fecha_cierre_curso AS fr_fecha_cierre_curso,
        fr.examen_estado AS fr_examen_estado,
        fr.nota_examen AS fr_nota_examen,
        fr.acreditado AS fr_acreditado,
        fr.fecha_examen AS fr_fecha_examen,
        fr.documento_url AS fr_documento_url,
        fr.created_at AS fr_created_at,
        fr.updated_at AS fr_updated_at,
        fc.id AS fc_id,
        fc.nombre_archivo AS fc_nombre_archivo,
        fc.nombre_original AS fc_nombre_original,
        fc.ruta_archivo AS fc_ruta_archivo,
        fc.tipo_mime AS fc_tipo_mime,
        fc.tamanio_kb AS fc_tamanio_kb,
        fc.fecha_emision AS fc_fecha_emision,
        fc.descripcion AS fc_descripcion,
        fc.estado AS fc_estado,
        fc.estado_extraccion AS fc_estado_extraccion,
        fc.datos_extraidos_json AS fc_datos_extraidos_json,
        fc.created_at AS fc_created_at,
        fc.updated_at AS fc_updated_at
       FROM candidatos_formaciones f
       LEFT JOIN candidatos_formacion_resultados fr
         ON fr.candidato_formacion_id = f.id
        AND fr.deleted_at IS NULL
       LEFT JOIN candidatos_formacion_certificados fc
         ON fc.candidato_formacion_id = f.id
        AND fc.deleted_at IS NULL
       WHERE f.candidato_id = ?
         AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
      [candidatoId]
    );
    rows = rowsFull;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    const [rowsFallback] = await db.query(
      `SELECT
        f.id,
        f.candidato_id,
        f.fecha_aprobacion,
        f.activo,
        f.categoria_formacion,
        f.subtipo_formacion,
        f.institucion,
        f.nombre_programa,
        f.titulo_obtenido,
        f.entidad_emisora,
        f.numero_registro,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.created_at,
        f.updated_at,
        fr.id AS fr_id,
        fr.resultado_curso AS fr_resultado_curso,
        fr.nota_curso AS fr_nota_curso,
        fr.fuente_curso AS fr_fuente_curso,
        fr.fecha_cierre_curso AS fr_fecha_cierre_curso,
        fr.examen_estado AS fr_examen_estado,
        fr.nota_examen AS fr_nota_examen,
        fr.acreditado AS fr_acreditado,
        fr.fecha_examen AS fr_fecha_examen,
        fr.documento_url AS fr_documento_url,
        fr.created_at AS fr_created_at,
        fr.updated_at AS fr_updated_at,
        NULL AS fc_id,
        NULL AS fc_nombre_archivo,
        NULL AS fc_nombre_original,
        NULL AS fc_ruta_archivo,
        NULL AS fc_tipo_mime,
        NULL AS fc_tamanio_kb,
        NULL AS fc_fecha_emision,
        NULL AS fc_descripcion,
        NULL AS fc_estado,
        NULL AS fc_estado_extraccion,
        NULL AS fc_datos_extraidos_json,
        NULL AS fc_created_at,
        NULL AS fc_updated_at
       FROM candidatos_formaciones f
       LEFT JOIN candidatos_formacion_resultados fr
         ON fr.candidato_formacion_id = f.id
        AND fr.deleted_at IS NULL
       WHERE f.candidato_id = ?
         AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
      [candidatoId]
    );
    rows = rowsFallback;
  }

  return rows.map((row) => {
    return {
      id: row.id,
      candidato_id: row.candidato_id,
      fecha_aprobacion: row.fecha_aprobacion,
      activo: row.activo,
      categoria_formacion: row.categoria_formacion,
      subtipo_formacion: row.subtipo_formacion,
      institucion: row.institucion,
      nombre_programa: row.nombre_programa,
      titulo_obtenido: row.titulo_obtenido,
      entidad_emisora: row.entidad_emisora,
      numero_registro: row.numero_registro,
      fecha_emision: row.fecha_emision,
      fecha_vencimiento: row.fecha_vencimiento,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resultado: row.fr_id
        ? {
            id: row.fr_id,
            resultado_curso: row.fr_resultado_curso,
            nota_curso: row.fr_nota_curso,
            fuente_curso: row.fr_fuente_curso,
            fecha_cierre_curso: row.fr_fecha_cierre_curso,
            examen_estado: row.fr_examen_estado,
            nota_examen: row.fr_nota_examen,
            acreditado: row.fr_acreditado,
            fecha_examen: row.fr_fecha_examen,
            documento_url: row.fr_documento_url,
            created_at: row.fr_created_at,
            updated_at: row.fr_updated_at
          }
        : null,
      certificado_curso: row.fc_id
        ? {
            id: row.fc_id,
            nombre_archivo: row.fc_nombre_archivo,
            nombre_original: row.fc_nombre_original,
            ruta_archivo: row.fc_ruta_archivo,
            tipo_mime: row.fc_tipo_mime,
            tamanio_kb: row.fc_tamanio_kb,
            fecha_emision: row.fc_fecha_emision,
            descripcion: row.fc_descripcion,
            estado: row.fc_estado,
            estado_extraccion: row.fc_estado_extraccion,
            datos_extraidos_json: row.fc_datos_extraidos_json,
            created_at: row.fc_created_at,
            updated_at: row.fc_updated_at
          }
        : null
    };
  });
}

async function createFormacion(candidatoId, payload) {
  const [result] = await db.query(
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
      payload.institucion ?? null,
      payload.nombre_programa ?? null,
      payload.titulo_obtenido ?? null,
      payload.entidad_emisora ?? null,
      payload.numero_registro ?? null,
      payload.fecha_emision ?? null,
      payload.fecha_vencimiento ?? null
    ]
  );
  return { id: result.insertId };
}

async function updateFormacion(candidatoId, formacionId, payload) {
  const keys = Object.keys(payload);
  if (!keys.length) return 0;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_formaciones
     SET ${setSql}
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => payload[key]), formacionId, candidatoId]
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

async function getFormacionResultado(candidatoId, formacionId) {
  const [rows] = await db.query(
    `SELECT
      fr.id,
      fr.candidato_formacion_id,
      fr.resultado_curso,
      fr.nota_curso,
      fr.fuente_curso,
      fr.fecha_cierre_curso,
      fr.examen_estado,
      fr.nota_examen,
      fr.acreditado,
      fr.fecha_examen,
      fr.documento_url,
      fr.created_at,
      fr.updated_at
     FROM candidatos_formaciones f
     LEFT JOIN candidatos_formacion_resultados fr
       ON fr.candidato_formacion_id = f.id
      AND fr.deleted_at IS NULL
     WHERE f.id = ?
       AND f.candidato_id = ?
       AND f.deleted_at IS NULL
     LIMIT 1`,
    [formacionId, candidatoId]
  );

  const row = rows[0];
  if (!row || !row.id) return null;

  return {
    id: row.id,
    candidato_formacion_id: row.candidato_formacion_id,
    resultado_curso: row.resultado_curso,
    nota_curso: row.nota_curso,
    fuente_curso: row.fuente_curso,
    fecha_cierre_curso: row.fecha_cierre_curso,
    examen_estado: row.examen_estado,
    nota_examen: row.nota_examen,
    acreditado: row.acreditado,
    fecha_examen: row.fecha_examen,
    documento_url: row.documento_url,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function canUseFormacionResultado(candidatoId, formacionId) {
  const [rows] = await db.query(
    `SELECT
      id,
      categoria_formacion
     FROM candidatos_formaciones
     WHERE id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [formacionId, candidatoId]
  );

  const row = rows[0];
  if (!row) return { exists: false, allowed: false };
  return { exists: true, allowed: row.categoria_formacion === 'externa' };
}

async function upsertFormacionResultado(candidatoId, formacionId, payload) {
  const state = await canUseFormacionResultado(candidatoId, formacionId);
  if (!state.exists) return 0;
  if (!state.allowed) return -1;

  const keys = Object.keys(payload);
  if (!keys.length) return 0;

  const columns = ['candidato_formacion_id', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [formacionId, ...keys.map((key) => payload[key])];
  const updateSql = [...keys.map((key) => `${key} = VALUES(${key})`), 'deleted_at = NULL'].join(', ');

  await db.query(
    `INSERT INTO candidatos_formacion_resultados (${columns.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    values
  );

  return 1;
}

async function getFormacionCertificado(candidatoId, formacionId) {
  let rows = [];
  try {
    const [rowsFull] = await db.query(
      `SELECT
        f.id AS formacion_id,
        f.categoria_formacion,
        fc.id,
        fc.candidato_formacion_id,
        fc.nombre_archivo,
        fc.nombre_original,
        fc.ruta_archivo,
        fc.tipo_mime,
        fc.tamanio_kb,
        fc.fecha_emision,
        fc.descripcion,
        fc.estado,
        fc.estado_extraccion,
        fc.datos_extraidos_json,
        fc.created_at,
        fc.updated_at
       FROM candidatos_formaciones f
       LEFT JOIN candidatos_formacion_certificados fc
         ON fc.candidato_formacion_id = f.id
        AND fc.deleted_at IS NULL
       WHERE f.id = ?
         AND f.candidato_id = ?
         AND f.deleted_at IS NULL
       LIMIT 1`,
      [formacionId, candidatoId]
    );
    rows = rowsFull;
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
    const [rowsFallback] = await db.query(
      `SELECT
        f.id AS formacion_id,
        f.categoria_formacion,
        NULL AS id,
        NULL AS candidato_formacion_id,
        NULL AS nombre_archivo,
        NULL AS nombre_original,
        NULL AS ruta_archivo,
        NULL AS tipo_mime,
        NULL AS tamanio_kb,
        NULL AS fecha_emision,
        NULL AS descripcion,
        NULL AS estado,
        NULL AS estado_extraccion,
        NULL AS datos_extraidos_json,
        NULL AS created_at,
        NULL AS updated_at
       FROM candidatos_formaciones f
       WHERE f.id = ?
         AND f.candidato_id = ?
         AND f.deleted_at IS NULL
       LIMIT 1`,
      [formacionId, candidatoId]
    );
    rows = rowsFallback;
  }

  const row = rows[0];
  if (!row) return { exists: false, allowed: false, certificado: null };
  if (row.categoria_formacion !== 'externa') return { exists: true, allowed: false, certificado: null };
  if (!row.id) return { exists: true, allowed: true, certificado: null };

  return {
    exists: true,
    allowed: true,
    certificado: {
      id: row.id,
      candidato_formacion_id: row.candidato_formacion_id,
      nombre_archivo: row.nombre_archivo,
      nombre_original: row.nombre_original,
      ruta_archivo: row.ruta_archivo,
      tipo_mime: row.tipo_mime,
      tamanio_kb: row.tamanio_kb,
      fecha_emision: row.fecha_emision,
      descripcion: row.descripcion,
      estado: row.estado,
      estado_extraccion: row.estado_extraccion,
      datos_extraidos_json: row.datos_extraidos_json,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  };
}

async function createFormacionCertificado(candidatoId, formacionId, payload) {
  const state = await canUseFormacionResultado(candidatoId, formacionId);
  if (!state.exists) return 0;
  if (!state.allowed) return -1;

  await db.query(
    `INSERT INTO candidatos_formacion_certificados (
      candidato_id,
      candidato_formacion_id,
      nombre_archivo,
      nombre_original,
      ruta_archivo,
      tipo_mime,
      tamanio_kb,
      fecha_emision,
      descripcion,
      estado,
      estado_extraccion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nombre_archivo = VALUES(nombre_archivo),
      nombre_original = VALUES(nombre_original),
      ruta_archivo = VALUES(ruta_archivo),
      tipo_mime = VALUES(tipo_mime),
      tamanio_kb = VALUES(tamanio_kb),
      fecha_emision = VALUES(fecha_emision),
      descripcion = VALUES(descripcion),
      estado = VALUES(estado),
      estado_extraccion = 'pendiente',
      datos_extraidos_json = NULL,
      deleted_at = NULL`,
    [
      candidatoId,
      formacionId,
      payload.nombre_archivo,
      payload.nombre_original,
      payload.ruta_archivo,
      payload.tipo_mime,
      payload.tamanio_kb,
      payload.fecha_emision ?? null,
      payload.descripcion ?? null,
      payload.estado ?? 'pendiente',
      'pendiente'
    ]
  );

  const cert = await getFormacionCertificado(candidatoId, formacionId);
  return cert.certificado;
}

async function updateFormacionCertificado(candidatoId, formacionId, patch) {
  const state = await canUseFormacionResultado(candidatoId, formacionId);
  if (!state.exists) return -1;
  if (!state.allowed) return -2;

  const keys = Object.keys(patch);
  if (!keys.length) return 0;

  if (keys.some((key) => ['nombre_archivo', 'nombre_original', 'ruta_archivo', 'tipo_mime', 'tamanio_kb'].includes(key))) {
    patch.estado_extraccion = 'pendiente';
    patch.datos_extraidos_json = null;
  }

  const setSql = Object.keys(patch).map((key) => `${key} = ?`).join(', ');
  const [result] = await db.query(
    `UPDATE candidatos_formacion_certificados
     SET ${setSql}
     WHERE candidato_formacion_id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [...Object.keys(patch).map((key) => patch[key]), formacionId, candidatoId]
  );
  return result.affectedRows;
}

async function deleteFormacionCertificado(candidatoId, formacionId) {
  const state = await canUseFormacionResultado(candidatoId, formacionId);
  if (!state.exists) return -1;
  if (!state.allowed) return -2;

  const [result] = await db.query(
    `UPDATE candidatos_formacion_certificados
     SET deleted_at = NOW()
     WHERE candidato_formacion_id = ?
       AND candidato_id = ?
       AND deleted_at IS NULL`,
    [formacionId, candidatoId]
  );
  return result.affectedRows;
}

async function listDocumentos(candidatoId) {
  const [rows] = await db.query(
    `SELECT
      id,
      candidato_id,
      tipo_documento,
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

async function createDocumento(candidatoId, payload) {
  const [result] = await db.query(
    `INSERT INTO candidatos_documentos (
      candidato_id,
      tipo_documento,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      candidatoId,
      payload.tipo_documento,
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

async function updateDocumento(candidatoId, documentoId, patch) {
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
  listFormacion,
  createFormacion,
  updateFormacion,
  deleteFormacion,
  existsFormacion,
  getFormacionResultado,
  canUseFormacionResultado,
  upsertFormacionResultado,
  getFormacionCertificado,
  createFormacionCertificado,
  updateFormacionCertificado,
  deleteFormacionCertificado,
  listDocumentos,
  createDocumento,
  updateDocumento,
  deleteDocumento
};


