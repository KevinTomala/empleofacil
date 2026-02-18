const db = require('../db');

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
     LEFT JOIN candidatos_educacion_general ce
       ON ce.candidato_id = c.id
      AND ce.deleted_at IS NULL
     WHERE c.id = ?
       AND c.deleted_at IS NULL
     LIMIT 1`,
    [candidatoId]
  );

  const row = rows[0];
  if (!row) return null;

  const [idiomas, experiencia, documentos] = await Promise.all([
    listIdiomas(candidatoId),
    listExperiencias(candidatoId),
    listDocumentos(candidatoId)
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
    idiomas,
    experiencia,
    documentos
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
  if (!keys.length) return;

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
  const [rows] = await db.query(
    `SELECT
      id,
      candidato_id,
      empresa_id,
      cargo,
      fecha_inicio,
      fecha_fin,
      actualmente_trabaja,
      tipo_contrato,
      descripcion,
      created_at,
      updated_at
     FROM candidatos_experiencia
     WHERE candidato_id = ?
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [candidatoId]
  );
  return rows;
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
  if (!keys.length) return;

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
  if (!keys.length) return;

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
  listIdiomas,
  createIdioma,
  updateIdioma,
  deleteIdioma,
  listExperiencias,
  createExperiencia,
  updateExperiencia,
  deleteExperiencia,
  listDocumentos,
  createDocumento,
  updateDocumento,
  deleteDocumento
};
