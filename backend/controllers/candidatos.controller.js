const db = require('../db');
const { ensureVerificationSchema } = require('../services/verificaciones.service');

async function listCandidatos(req, res) {
  await ensureVerificationSchema();
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.page_size || 20), 1), 100);
  const offset = (page - 1) * pageSize;
  const q = (req.query.q || '').trim();
  const estadoLaboral = String(req.query.estado_laboral || '').trim().toLowerCase();
  const perfil = String(req.query.perfil || '').trim().toLowerCase();
  const verificacion = String(req.query.verificacion || '').trim().toLowerCase();

  if (estadoLaboral && !['empleado', 'desempleado'].includes(estadoLaboral)) {
    return res.status(400).json({ error: 'INVALID_ESTADO_LABORAL' });
  }
  if (perfil && !['con_formacion', 'con_experiencia', 'sin_experiencia'].includes(perfil)) {
    return res.status(400).json({ error: 'INVALID_PERFIL_FILTER' });
  }
  if (verificacion && !['verificados', 'no_verificados'].includes(verificacion)) {
    return res.status(400).json({ error: 'INVALID_VERIFICACION_FILTER' });
  }

  let where = 'WHERE e.activo = 1 AND e.deleted_at IS NULL';
  const params = [];
  if (q) {
    where += ` AND (
      e.nombres LIKE ?
      OR e.apellidos LIKE ?
      OR e.documento_identidad LIKE ?
      OR COALESCE(edu.titulo_academico, '') LIKE ?
      OR COALESCE(edu.institucion_academica, '') LIKE ?
      OR COALESCE(exp.ultima_experiencia_cargo, '') LIKE ?
    )`;
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (estadoLaboral === 'empleado') where += ' AND COALESCE(lab.tiene_empleo_actual, 0) = 1';
  if (estadoLaboral === 'desempleado') where += ' AND COALESCE(lab.tiene_empleo_actual, 0) = 0';
  if (perfil === 'con_formacion') where += ' AND COALESCE(edu.titulo_academico, \'\') <> \'\'';
  if (perfil === 'con_experiencia') where += ' AND COALESCE(lab.total_experiencia, 0) > 0';
  if (perfil === 'sin_experiencia') where += ' AND COALESCE(lab.total_experiencia, 0) = 0';
  if (verificacion === 'verificados') where += ' AND vc.estado = \'aprobada\'';
  if (verificacion === 'no_verificados') where += ' AND COALESCE(vc.estado, \'\') <> \'aprobada\'';

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.nombres,
      e.apellidos,
      e.documento_identidad,
      e.nacionalidad,
      e.fecha_nacimiento,
      f.foto_url,
      edu.titulo_academico,
      edu.institucion_academica,
      exp.ultima_experiencia_cargo,
      CASE
        WHEN COALESCE(lab.tiene_empleo_actual, 0) = 1 THEN 'empleado'
        ELSE 'desempleado'
      END AS estado_laboral,
      vc.estado AS verificacion_cuenta_estado,
      CASE
        WHEN vc.estado = 'aprobada' THEN 1
        ELSE 0
      END AS candidato_verificado
     FROM candidatos e
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
       ON f.candidato_id = e.id
     LEFT JOIN (
       SELECT ce1.candidato_id,
              COALESCE(NULLIF(TRIM(ce1.titulo_obtenido), ''), NULLIF(TRIM(ce1.nivel_estudio), '')) AS titulo_academico,
              NULLIF(TRIM(ce1.institucion), '') AS institucion_academica
       FROM candidatos_educacion_general ce1
       LEFT JOIN candidatos_educacion_general ce2
         ON ce2.candidato_id = ce1.candidato_id
        AND ce2.deleted_at IS NULL
        AND (
          COALESCE(ce2.updated_at, ce2.created_at) > COALESCE(ce1.updated_at, ce1.created_at)
          OR (
            COALESCE(ce2.updated_at, ce2.created_at) = COALESCE(ce1.updated_at, ce1.created_at)
            AND ce2.id > ce1.id
          )
        )
       WHERE ce1.deleted_at IS NULL
         AND COALESCE(NULLIF(TRIM(ce1.titulo_obtenido), ''), NULLIF(TRIM(ce1.nivel_estudio), '')) IS NOT NULL
         AND ce2.id IS NULL
     ) edu
       ON edu.candidato_id = e.id
     LEFT JOIN (
       SELECT ex1.candidato_id,
              NULLIF(TRIM(ex1.cargo), '') AS ultima_experiencia_cargo
       FROM candidatos_experiencia ex1
       LEFT JOIN candidatos_experiencia ex2
         ON ex2.candidato_id = ex1.candidato_id
        AND ex2.deleted_at IS NULL
        AND (
          COALESCE(ex2.updated_at, ex2.created_at) > COALESCE(ex1.updated_at, ex1.created_at)
          OR (
            COALESCE(ex2.updated_at, ex2.created_at) = COALESCE(ex1.updated_at, ex1.created_at)
            AND ex2.id > ex1.id
          )
        )
       WHERE ex1.deleted_at IS NULL
         AND COALESCE(TRIM(ex1.cargo), '') <> ''
         AND ex2.id IS NULL
     ) exp
       ON exp.candidato_id = e.id
     LEFT JOIN (
       SELECT
         ex.candidato_id,
         COUNT(*) AS total_experiencia,
         MAX(CASE WHEN ex.actualmente_trabaja = 1 THEN 1 ELSE 0 END) AS tiene_empleo_actual
       FROM candidatos_experiencia ex
       WHERE ex.deleted_at IS NULL
       GROUP BY ex.candidato_id
     ) lab
       ON lab.candidato_id = e.id
     LEFT JOIN verificaciones_cuenta vc
       ON vc.cuenta_tipo = 'candidato'
      AND vc.candidato_id = e.id
     ${where}
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return res.json({
    items: rows,
    page,
    page_size: pageSize
  });
}

module.exports = {
  listCandidatos
};
