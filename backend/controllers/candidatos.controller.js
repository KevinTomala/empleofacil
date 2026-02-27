const db = require('../db');
const { ensureVerificationSchema } = require('../services/verificaciones.service');

async function listCandidatos(req, res) {
  await ensureVerificationSchema();
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.page_size || 20), 1), 100);
  const offset = (page - 1) * pageSize;
  const q = (req.query.q || '').trim();
  const area = (req.query.area || '').trim();
  const perfil = (req.query.perfil || '').trim();
  const experiencia = String(req.query.experiencia || '').trim().toLowerCase();

  let where = `WHERE e.activo = 1 AND EXISTS (
    SELECT 1
    FROM candidatos_formaciones f
    WHERE f.candidato_id = e.id
      AND f.categoria_formacion = "externa"
      AND f.activo = 1
      AND f.deleted_at IS NULL
      AND f.fecha_aprobacion IS NOT NULL
  )`;
  const params = [];
  if (q) {
    where += ' AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.documento_identidad LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (area) {
    where += ' AND LOWER(COALESCE(fp.area_formacion, "")) LIKE ?';
    params.push(`%${area.toLowerCase()}%`);
  }
  if (perfil) {
    where += ' AND (LOWER(COALESCE(fp.formacion_principal, "")) LIKE ? OR LOWER(COALESCE(exr.cargo_reciente, "")) LIKE ?)';
    params.push(`%${perfil.toLowerCase()}%`, `%${perfil.toLowerCase()}%`);
  }
  if (experiencia === 'con') {
    where += ' AND COALESCE(ex.total_experiencia, 0) > 0';
  } else if (experiencia === 'sin') {
    where += ' AND COALESCE(ex.total_experiencia, 0) = 0';
  }

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.nombres,
      e.apellidos,
      e.documento_identidad,
      e.nacionalidad,
      e.fecha_nacimiento,
      fp.area_formacion,
      fp.formacion_principal,
      exr.cargo_reciente,
      COALESCE(ex.total_experiencia, 0) AS total_experiencia,
      vc.estado AS verificacion_cuenta_estado,
      CASE
        WHEN vc.estado = 'aprobada' THEN 1
        ELSE 0
      END AS candidato_verificado
     FROM candidatos e
     LEFT JOIN (
       SELECT
         f1.candidato_id,
         f1.subtipo_formacion AS area_formacion,
         COALESCE(NULLIF(f1.titulo_obtenido, ''), NULLIF(f1.nombre_programa, ''), NULLIF(f1.institucion, '')) AS formacion_principal
       FROM candidatos_formaciones f1
       LEFT JOIN candidatos_formaciones f2
         ON f2.candidato_id = f1.candidato_id
        AND f2.categoria_formacion = 'externa'
        AND f2.activo = 1
        AND f2.deleted_at IS NULL
        AND f2.fecha_aprobacion IS NOT NULL
        AND (
          COALESCE(f2.fecha_aprobacion, f2.updated_at, f2.created_at) > COALESCE(f1.fecha_aprobacion, f1.updated_at, f1.created_at)
          OR (
            COALESCE(f2.fecha_aprobacion, f2.updated_at, f2.created_at) = COALESCE(f1.fecha_aprobacion, f1.updated_at, f1.created_at)
            AND f2.id > f1.id
          )
        )
       WHERE f1.categoria_formacion = 'externa'
         AND f1.activo = 1
         AND f1.deleted_at IS NULL
         AND f1.fecha_aprobacion IS NOT NULL
         AND f2.candidato_id IS NULL
     ) fp
       ON fp.candidato_id = e.id
     LEFT JOIN (
       SELECT
         candidato_id,
         COUNT(*) AS total_experiencia
       FROM candidatos_experiencia
       WHERE deleted_at IS NULL
       GROUP BY candidato_id
     ) ex
       ON ex.candidato_id = e.id
     LEFT JOIN (
       SELECT
         ce1.candidato_id,
         ce1.cargo AS cargo_reciente
       FROM candidatos_experiencia ce1
       LEFT JOIN candidatos_experiencia ce2
         ON ce2.candidato_id = ce1.candidato_id
        AND ce2.deleted_at IS NULL
        AND (
          COALESCE(ce2.fecha_fin, ce2.fecha_inicio, ce2.updated_at, ce2.created_at) > COALESCE(ce1.fecha_fin, ce1.fecha_inicio, ce1.updated_at, ce1.created_at)
          OR (
            COALESCE(ce2.fecha_fin, ce2.fecha_inicio, ce2.updated_at, ce2.created_at) = COALESCE(ce1.fecha_fin, ce1.fecha_inicio, ce1.updated_at, ce1.created_at)
            AND ce2.id > ce1.id
          )
        )
       WHERE ce1.deleted_at IS NULL
         AND ce2.candidato_id IS NULL
     ) exr
       ON exr.candidato_id = e.id
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
