const db = require('../db');
const { ensureVerificationSchema } = require('../services/verificaciones.service');

async function listCandidatos(req, res) {
  await ensureVerificationSchema();
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.page_size || 20), 1), 100);
  const offset = (page - 1) * pageSize;
  const q = (req.query.q || '').trim();

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

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.nombres,
      e.apellidos,
      e.documento_identidad,
      e.nacionalidad,
      e.fecha_nacimiento,
      vc.estado AS verificacion_cuenta_estado,
      CASE
        WHEN vc.estado = 'aprobada' THEN 1
        ELSE 0
      END AS candidato_verificado
     FROM candidatos e
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
