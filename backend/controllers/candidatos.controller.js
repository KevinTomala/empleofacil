const db = require('../db');

async function listCandidatos(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.page_size || 20), 1), 100);
  const offset = (page - 1) * pageSize;
  const q = (req.query.q || '').trim();

  let where = `WHERE e.activo = 1 AND EXISTS (
    SELECT 1
    FROM candidatos_formaciones f
    WHERE f.candidato_id = e.id
      AND f.estado = "acreditado"
      AND f.activo = 1
      AND f.deleted_at IS NULL
      AND (
        f.fecha_aprobacion IS NOT NULL
        OR (f.fecha_fin IS NOT NULL AND f.fecha_fin <= CURDATE())
      )
  )`;
  const params = [];
  if (q) {
    where += ' AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.documento_identidad LIKE ? OR c.email LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const [rows] = await db.query(
    `SELECT e.id, e.nombres, e.apellidos, e.documento_identidad, e.nacionalidad, e.fecha_nacimiento,
            c.email, c.telefono_celular
     FROM candidatos e
     LEFT JOIN candidatos_contacto c ON c.candidato_id = e.id
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
