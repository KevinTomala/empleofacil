const db = require('../db');
const bcrypt = require('bcryptjs');
const {
  fetchAcreditados,
  fetchConvocatorias,
  fetchCursosPorConvocatoria,
  fetchPromocionesPorConvocatoriaCurso
} = require('../services/ademy.service');

const ORIGEN = 'ademy';
const SYNC_LOCK_NAME = `integracion:${ORIGEN}:acreditados`;

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

function buildPatch(source, allowedKeys) {
  const patch = {};
  allowedKeys.forEach((key) => {
    if (isPresent(source[key])) patch[key] = source[key];
  });
  return patch;
}

function normalizeDocumento(value) {
  return String(value || '').trim().replace(/[^0-9A-Za-z]/g, '');
}

function toDateOnly(value) {
  if (!isPresent(value)) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function toTinyInt(value) {
  return value === 1 || value === '1' || value === true ? 1 : 0;
}

function toPositiveIntOrNull(value) {
  if (!isPresent(value)) return null;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function resolveCandidatoIdentity(item) {
  const emailRaw = String(item?.email || item?.contacto?.email || '').trim();
  const documento = normalizeDocumento(item?.documento_identidad);
  const email = emailRaw
    ? emailRaw.toLowerCase()
    : (documento ? `${documento}@candidato.ademy.local` : '');
  const nombreCompleto = `${String(item?.nombres || '').trim()} ${String(item?.apellidos || '').trim()}`.trim() || 'Candidato';
  return { email, documento, nombreCompleto };
}

async function upsertEstudiante(conn, item) {
  const documento = item.documento_identidad || null;
  const email = item.email || item?.contacto?.email || null;

  let estudianteId = null;
  if (documento) {
    const [rows] = await conn.query(
      'SELECT id FROM candidatos WHERE documento_identidad = ? LIMIT 1',
      [documento]
    );
    estudianteId = rows[0]?.id || null;
  } else if (email) {
    const [rows] = await conn.query(
      'SELECT e.id FROM candidatos e INNER JOIN candidatos_contacto c ON c.candidato_id = e.id WHERE c.email = ? LIMIT 1',
      [email]
    );
    estudianteId = rows[0]?.id || null;
  }

  const allowed = [
    'nombres',
    'apellidos',
    'documento_identidad',
    'nacionalidad',
    'fecha_nacimiento',
    'sexo',
    'estado_civil',
    'estado_academico',
    'activo'
  ];

  if (estudianteId) {
    const patch = buildPatch(item, allowed);
    const keys = Object.keys(patch);
    if (keys.length) {
      const setSql = keys.map((k) => `${k} = ?`).join(', ');
      await conn.query(`UPDATE candidatos SET ${setSql} WHERE id = ?`, [
        ...keys.map((k) => patch[k]),
        estudianteId
      ]);
    }
    return { estudianteId, created: false };
  }

  const insert = buildPatch(item, allowed);
  if (!insert.nombres || !insert.apellidos) {
    throw new Error('Missing nombres/apellidos for estudiante');
  }
  const columns = Object.keys(insert);
  const values = columns.map((k) => insert[k]);
  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await conn.query(
    `INSERT INTO candidatos (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  return { estudianteId: result.insertId, created: true };
}

async function upsertContacto(conn, estudianteId, item) {
  const contacto = item.contacto || {};
  const payload = {
    email: item.email || contacto.email || null,
    telefono_fijo: contacto.telefono_fijo || null,
    telefono_celular: contacto.telefono_celular || null,
    contacto_emergencia_nombre: contacto.contacto_emergencia_nombre || null,
    contacto_emergencia_telefono: contacto.contacto_emergencia_telefono || null
  };

  if (!Object.values(payload).some(isPresent)) return;

  await conn.query(
    `INSERT INTO candidatos_contacto (
      candidato_id, email, telefono_fijo, telefono_celular, contacto_emergencia_nombre, contacto_emergencia_telefono
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      email = COALESCE(VALUES(email), email),
      telefono_fijo = COALESCE(VALUES(telefono_fijo), telefono_fijo),
      telefono_celular = COALESCE(VALUES(telefono_celular), telefono_celular),
      contacto_emergencia_nombre = COALESCE(VALUES(contacto_emergencia_nombre), contacto_emergencia_nombre),
      contacto_emergencia_telefono = COALESCE(VALUES(contacto_emergencia_telefono), contacto_emergencia_telefono)`,
    [
      estudianteId,
      payload.email,
      payload.telefono_fijo,
      payload.telefono_celular,
      payload.contacto_emergencia_nombre,
      payload.contacto_emergencia_telefono
    ]
  );
}

async function ensureCandidateUserForEstudiante(conn, estudianteId, item) {
  const { email, documento, nombreCompleto } = resolveCandidatoIdentity(item);
  if (!email && !documento) return;

  const [linkedRows] = await conn.query(
    `SELECT u.id, u.rol
     FROM candidatos e
     INNER JOIN usuarios u ON u.id = e.usuario_id
     WHERE e.id = ?
     LIMIT 1`,
    [estudianteId]
  );
  const linkedUser = linkedRows[0] || null;

  let userId = linkedUser?.id || null;
  let userRol = linkedUser?.rol || null;

  if (!userId && email) {
    const [userByEmailRows] = await conn.query(
      'SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    if (userByEmailRows.length) {
      userId = userByEmailRows[0].id;
      userRol = userByEmailRows[0].rol;
    }
  }

  if (!userId && documento) {
    const [userByDocumentoRows] = await conn.query(
      `SELECT u.id, u.rol
       FROM usuarios u
       INNER JOIN candidatos e ON e.usuario_id = u.id
       WHERE REPLACE(REPLACE(REPLACE(COALESCE(e.documento_identidad, ''), '.', ''), '-', ''), ' ', '') = ?
       LIMIT 1`,
      [documento]
    );
    if (userByDocumentoRows.length) {
      userId = userByDocumentoRows[0].id;
      userRol = userByDocumentoRows[0].rol;
    }
  }

  if (userId && userRol && userRol !== 'candidato') {
    return;
  }

  if (!userId) {
    const defaultPassword = documento || email;
    const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);

    const [insertUser] = await conn.query(
      `INSERT INTO usuarios (
        email, password_hash, nombre_completo, rol, estado, activo, must_change_password
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, defaultPasswordHash, nombreCompleto, 'candidato', 'activo', 1, 1]
    );
    userId = insertUser.insertId;
  } else {
    await conn.query(
      `UPDATE usuarios
       SET nombre_completo = COALESCE(NULLIF(?, ''), nombre_completo),
           email = COALESCE(NULLIF(?, ''), email)
       WHERE id = ?`,
      [nombreCompleto, email, userId]
    );
  }

  await conn.query(
    'UPDATE candidatos SET usuario_id = ? WHERE id = ? AND usuario_id IS NULL',
    [userId, estudianteId]
  );
}

async function upsertSimpleByPk(conn, table, estudianteId, data, allowedKeys) {
  if (!data) return;
  const payload = buildPatch(data, allowedKeys);
  if (!Object.keys(payload).length) return;

  const columns = ['candidato_id', ...Object.keys(payload)];
  const values = [estudianteId, ...Object.keys(payload).map((k) => payload[k])];
  const updateSql = Object.keys(payload)
    .map((key) => `${key} = COALESCE(VALUES(${key}), ${key})`)
    .join(', ');

  await conn.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    values
  );
}

async function upsertSimpleByLatest(conn, table, estudianteId, data, allowedKeys) {
  if (!data) return;
  const payload = buildPatch(data, allowedKeys);
  const keys = Object.keys(payload);
  if (!keys.length) return;

  const [rows] = await conn.query(
    `SELECT id
     FROM ${table}
     WHERE candidato_id = ?
       AND deleted_at IS NULL
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [estudianteId]
  );

  const latestId = rows[0]?.id || null;
  if (!latestId) {
    const columns = ['candidato_id', ...keys];
    const values = [estudianteId, ...keys.map((k) => payload[k])];
    await conn.query(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
    return;
  }

  const setSql = keys.map((key) => `${key} = COALESCE(?, ${key})`).join(', ');
  await conn.query(
    `UPDATE ${table}
     SET ${setSql}
     WHERE id = ?`,
    [...keys.map((k) => payload[k]), latestId]
  );
}

async function replaceEducacionGeneral(conn, estudianteId, educacionItems) {
  if (!Array.isArray(educacionItems)) return;
  await conn.query('DELETE FROM candidatos_educacion_general WHERE candidato_id = ?', [estudianteId]);
  for (const edu of educacionItems) {
    const nivelEstudio = isPresent(edu?.nivel_estudio) ? String(edu.nivel_estudio).trim() : null;
    const institucion = isPresent(edu?.institucion) ? String(edu.institucion).trim() : null;
    const tituloObtenido = isPresent(edu?.titulo_obtenido) ? String(edu.titulo_obtenido).trim() : null;

    if (!nivelEstudio && !institucion && !tituloObtenido) continue;

    await conn.query(
      `INSERT INTO candidatos_educacion_general (
        candidato_id, nivel_estudio, institucion, titulo_obtenido
      ) VALUES (?, ?, ?, ?)`,
      [estudianteId, nivelEstudio, institucion, tituloObtenido]
    );
  }
}

async function replaceExperiencias(conn, estudianteId, experiencias) {
  if (!Array.isArray(experiencias)) return;
  await conn.query('DELETE FROM candidatos_experiencia WHERE candidato_id = ?', [estudianteId]);
  for (const exp of experiencias) {
    const empresaId = toPositiveIntOrNull(exp?.empresa_id ?? exp?.empresaId ?? null);
    const cargo = isPresent(exp?.cargo) ? String(exp.cargo).trim() : null;
    const fechaInicio = toDateOnly(exp?.fecha_inicio ?? exp?.fechaInicio ?? null);
    const fechaFin = toDateOnly(exp?.fecha_fin ?? exp?.fechaFin ?? null);
    const actualmenteTrabaja = toTinyInt(exp?.actualmente_trabaja ?? exp?.actualmenteTrabaja ?? 0);
    const tipoContrato = isPresent(exp?.tipo_contrato) ? String(exp.tipo_contrato).trim() : null;
    const descripcion = isPresent(exp?.descripcion) ? String(exp.descripcion).trim() : null;

    if (!empresaId && !cargo && !fechaInicio && !fechaFin && !tipoContrato && !descripcion && !actualmenteTrabaja) {
      continue;
    }

    await conn.query(
      `INSERT INTO candidatos_experiencia (
        candidato_id, empresa_id, cargo, fecha_inicio, fecha_fin, actualmente_trabaja, tipo_contrato, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estudianteId,
        empresaId,
        cargo,
        fechaInicio,
        fechaFin,
        actualmenteTrabaja,
        tipoContrato,
        descripcion
      ]
    );
  }
}

async function upsertDocumentos(conn, estudianteId, documentos) {
  if (!Array.isArray(documentos)) return;
  for (const doc of documentos) {
    if (!doc.tipo_documento || !doc.nombre_archivo || !doc.nombre_original || !doc.ruta_archivo || !doc.tipo_mime) {
      continue;
    }
    await conn.query(
      `INSERT INTO candidatos_documentos (
        candidato_id, tipo_documento, nombre_archivo, nombre_original, ruta_archivo, tipo_mime, tamanio_kb,
        fecha_emision, fecha_vencimiento, numero_documento, descripcion, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre_archivo = VALUES(nombre_archivo),
        nombre_original = VALUES(nombre_original),
        ruta_archivo = VALUES(ruta_archivo),
        tipo_mime = VALUES(tipo_mime),
        tamanio_kb = VALUES(tamanio_kb),
        fecha_emision = VALUES(fecha_emision),
        fecha_vencimiento = VALUES(fecha_vencimiento),
        numero_documento = VALUES(numero_documento),
        descripcion = VALUES(descripcion),
        estado = VALUES(estado),
        observaciones = VALUES(observaciones)`,
      [
        estudianteId,
        doc.tipo_documento,
        doc.nombre_archivo,
        doc.nombre_original,
        doc.ruta_archivo,
        doc.tipo_mime,
        doc.tamanio_kb || 0,
        doc.fecha_emision || null,
        doc.fecha_vencimiento || null,
        doc.numero_documento || null,
        doc.descripcion || null,
        doc.estado || 'pendiente',
        doc.observaciones || null
      ]
    );
  }
}

async function upsertFormaciones(conn, estudianteId, item) {
  const formaciones = item.formaciones || (item.formacion ? [item.formacion] : []);
  for (const formacion of formaciones) {
    const origenFormacionId = formacion.formacion_id || formacion.id || item.formacion_id;
    if (!origenFormacionId) continue;

    const [mapping] = await conn.query(
      'SELECT candidato_formacion_id FROM candidatos_formaciones_origen WHERE origen = ? AND origen_formacion_id = ? LIMIT 1',
      [ORIGEN, origenFormacionId]
    );

    if (mapping.length) {
      const localId = mapping[0].candidato_formacion_id;
      await conn.query(
        `UPDATE candidatos_formaciones SET
          categoria_formacion = COALESCE(?, categoria_formacion),
          subtipo_formacion = COALESCE(?, subtipo_formacion),
          institucion = COALESCE(?, institucion),
          nombre_programa = COALESCE(?, nombre_programa),
          titulo_obtenido = COALESCE(?, titulo_obtenido),
          fecha_aprobacion = COALESCE(?, fecha_aprobacion),
          activo = COALESCE(?, activo),
          updated_at = NOW()
        WHERE id = ?`,
        [
          'externa',
          formacion.subtipo_formacion || 'curso',
          formacion.institucion || formacion.entidad || null,
          formacion.nombre_programa || formacion.nombre || formacion.curso_nombre || null,
          formacion.titulo_obtenido || formacion.certificado || null,
          formacion.fecha_aprobacion || null,
          formacion.activo !== undefined ? (formacion.activo ? 1 : 0) : null,
          localId
        ]
      );

      await conn.query(
        `UPDATE candidatos_formaciones_origen SET origen_updated_at = ? WHERE origen = ? AND origen_formacion_id = ?`,
        [formacion.updated_at || null, ORIGEN, origenFormacionId]
      );
      continue;
    }

    const [insert] = await conn.query(
      `INSERT INTO candidatos_formaciones (
        candidato_id, categoria_formacion, subtipo_formacion, institucion, nombre_programa, titulo_obtenido, fecha_aprobacion, activo, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        estudianteId,
        'externa',
        formacion.subtipo_formacion || 'curso',
        formacion.institucion || formacion.entidad || null,
        formacion.nombre_programa || formacion.nombre || formacion.curso_nombre || null,
        formacion.titulo_obtenido || formacion.certificado || null,
        formacion.fecha_aprobacion || null,
        formacion.activo !== undefined ? (formacion.activo ? 1 : 0) : 1,
        formacion.updated_at || null
      ]
    );

    await conn.query(
      `INSERT INTO candidatos_formaciones_origen (
        candidato_formacion_id, origen, origen_formacion_id, origen_candidato_id, origen_updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        insert.insertId,
        ORIGEN,
        origenFormacionId,
        item.estudiante_id || null,
        formacion.updated_at || null
      ]
    );
  }
}

async function upsertOrigenEstudiante(conn, estudianteId, item) {
  const origenEstudianteId = item.estudiante_id || null;
  if (!origenEstudianteId) return;

  await conn.query(
    `INSERT INTO candidatos_origen (candidato_id, origen, origen_candidato_id, origen_updated_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       candidato_id = VALUES(candidato_id),
       origen_updated_at = COALESCE(VALUES(origen_updated_at), origen_updated_at)`,
    [estudianteId, ORIGEN, origenEstudianteId, item.updated_at || null]
  );
}

async function withSyncLock(task) {
  const lockConn = await db.getConnection();
  let lockAcquired = false;
  try {
    const [lockRows] = await lockConn.query('SELECT GET_LOCK(?, 0) AS acquired', [SYNC_LOCK_NAME]);
    lockAcquired = Number(lockRows?.[0]?.acquired || 0) === 1;
    if (!lockAcquired) {
      const err = new Error('SYNC_ALREADY_RUNNING');
      err.code = 'SYNC_ALREADY_RUNNING';
      throw err;
    }

    return await task();
  } finally {
    if (lockAcquired) {
      try {
        await lockConn.query('SELECT RELEASE_LOCK(?)', [SYNC_LOCK_NAME]);
      } catch (_releaseErr) {
        // Ignore release failures to avoid masking the original error.
      }
    }
    lockConn.release();
  }
}

function normalizeImportParams(rawParams = {}) {
  const pageSize = Math.min(Math.max(Number(rawParams.page_size || 100), 1), 500);
  const params = {
    promocion_id: rawParams.promocion_id,
    curso_id: rawParams.curso_id,
    fecha_desde: rawParams.fecha_desde,
    fecha_hasta: rawParams.fecha_hasta,
    updated_since: rawParams.updated_since,
    page_size: pageSize
  };

  return { pageSize, params };
}

async function runAcreditadosImport(rawParams = {}) {
  return withSyncLock(async () => {
    const { pageSize, params } = normalizeImportParams(rawParams);
    const [logRow] = await db.query(
      'INSERT INTO integracion_sync_logs (origen, status) VALUES (?, ?) ',
      [ORIGEN, 'running']
    );
    const logId = logRow.insertId;

    let totals = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { items, nextPage } = await fetchAcreditados({ ...params, page });
        if (!items.length) break;

        for (const item of items) {
          totals.total += 1;
          const documento = item.documento_identidad || null;
          const email = item.email || item?.contacto?.email || null;
          if (!documento && !email) {
            totals.skipped += 1;
            continue;
          }

          const conn = await db.getConnection();
          try {
            await conn.beginTransaction();

            const { estudianteId, created } = await upsertEstudiante(conn, item);
            if (created) totals.created += 1; else totals.updated += 1;

            await upsertOrigenEstudiante(conn, estudianteId, item);
            await upsertContacto(conn, estudianteId, item);
            await ensureCandidateUserForEstudiante(conn, estudianteId, item);

            await upsertSimpleByPk(conn, 'candidatos_domicilio', estudianteId, item.domicilio, [
              'pais', 'provincia', 'canton', 'parroquia', 'direccion', 'codigo_postal'
            ]);

            await upsertSimpleByPk(conn, 'candidatos_salud', estudianteId, item.salud, [
              'tipo_sangre', 'estatura', 'peso', 'tatuaje'
            ]);

            await upsertSimpleByPk(conn, 'candidatos_logistica', estudianteId, item.logistica, [
              'movilizacion', 'tipo_vehiculo', 'licencia', 'disp_viajar', 'disp_turnos', 'disp_fines_semana'
            ]);

            const educacionHistorial = Array.isArray(item.educacion_general_historial)
              ? item.educacion_general_historial
              : (item.educacion_general ? [item.educacion_general] : null);
            await replaceEducacionGeneral(conn, estudianteId, educacionHistorial);

            const experienciaHistorial = Array.isArray(item.experiencia)
              ? item.experiencia
              : (Array.isArray(item.experiencia_historial)
                ? item.experiencia_historial
                : (item.experiencia ? [item.experiencia] : null));
            await replaceExperiencias(conn, estudianteId, experienciaHistorial);
            await upsertDocumentos(conn, estudianteId, item.documentos);
            await upsertFormaciones(conn, estudianteId, item);

            await conn.commit();
          } catch (err) {
            await conn.rollback();
            totals.errors += 1;
          } finally {
            conn.release();
          }
        }

        if (nextPage) {
          page = nextPage;
        } else if (items.length < pageSize) {
          hasMore = false;
        } else {
          page += 1;
        }
      }

      const now = new Date();
      await db.query(
        `INSERT INTO integracion_sync_state (origen, last_sync_at, last_success_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE last_sync_at = VALUES(last_sync_at), last_success_at = VALUES(last_success_at)`,
        [ORIGEN, now, now]
      );

      await db.query(
        `UPDATE integracion_sync_logs
         SET finished_at = NOW(), status = ?, total = ?, created_count = ?, updated_count = ?, skipped_count = ?, error_count = ?
         WHERE id = ?`,
        ['success', totals.total, totals.created, totals.updated, totals.skipped, totals.errors, logId]
      );

      return { ok: true, ...totals };
    } catch (err) {
      await db.query(
        `UPDATE integracion_sync_logs
         SET finished_at = NOW(), status = ?, total = ?, created_count = ?, updated_count = ?, skipped_count = ?, error_count = ?, message = ?
         WHERE id = ?`,
        ['failed', totals.total, totals.created, totals.updated, totals.skipped, totals.errors, String(err.message || err), logId]
      );
      throw err;
    }
  });
}

async function importAcreditados(req, res) {
  try {
    const result = await runAcreditadosImport(req.body || {});
    return res.json(result);
  } catch (err) {
    if (err?.code === 'SYNC_ALREADY_RUNNING') {
      return res.status(409).json({ error: 'SYNC_ALREADY_RUNNING' });
    }
    return res.status(500).json({ error: 'SYNC_FAILED', details: String(err.message || err) });
  }
}

module.exports = {
  importAcreditados,
  runAcreditadosImport,
  listarConvocatorias: async (_req, res) => {
    try {
      const items = await fetchConvocatorias();
      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: 'CATALOGO_ERROR', details: error.message });
    }
  },
  listarCursosPorConvocatoria: async (req, res) => {
    try {
      const { id } = req.params;
      const items = await fetchCursosPorConvocatoria(id);
      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: 'CATALOGO_ERROR', details: error.message });
    }
  },
  listarPromociones: async (req, res) => {
    try {
      const { id } = req.params;
      const cursoId = req.query.curso_id;
      if (!cursoId) {
        return res.status(400).json({ error: 'CURSO_ID_REQUIRED' });
      }
      const items = await fetchPromocionesPorConvocatoriaCurso(id, cursoId);
      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: 'CATALOGO_ERROR', details: error.message });
    }
  }
};
