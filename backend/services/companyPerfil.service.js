const db = require('../db');

async function findEmpresaIdByUserId(userId) {
  const [rows] = await db.query(
    `SELECT e.id
     FROM empresas_usuarios eu
     INNER JOIN empresas e
       ON e.id = eu.empresa_id
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     WHERE eu.usuario_id = ?
       AND eu.estado = 'activo'
       AND e.deleted_at IS NULL
     ORDER BY
       eu.principal DESC,
       CASE WHEN ep.empresa_id IS NULL THEN 1 ELSE 0 END ASC,
       eu.id ASC
     LIMIT 1`,
    [userId]
  );

  return rows[0]?.id || null;
}

async function createEmpresaForUser(userId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      `SELECT id, email, nombre_completo, rol
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const user = users[0];
    if (!user || user.rol !== 'empresa') {
      await connection.rollback();
      return null;
    }

    const nombreEmpresa = String(user.nombre_completo || '').trim() || `Empresa ${user.id}`;
    const emailEmpresa = String(user.email || '').trim() || null;

    const [insertEmpresa] = await connection.query(
      `INSERT INTO empresas (nombre, email, tipo, activo)
       VALUES (?, ?, 'externa', 1)`,
      [nombreEmpresa, emailEmpresa]
    );

    const empresaId = insertEmpresa.insertId;

    await connection.query(
      `INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
       VALUES (?, ?, 'admin', 1, 'activo')`,
      [empresaId, user.id]
    );

    await connection.commit();
    return empresaId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function attachEmpresaByUserEmail(userId) {
  const [users] = await db.query(
    `SELECT id, email, rol
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = users[0];
  if (!user || user.rol !== 'empresa') return null;

  const email = String(user.email || '').trim();
  if (!email) return null;

  const [empresas] = await db.query(
    `SELECT id
     FROM empresas
     WHERE email = ?
       AND deleted_at IS NULL
     ORDER BY id ASC
     LIMIT 1`,
    [email]
  );

  const empresa = empresas[0];
  if (!empresa) return null;

  await db.query(
    `INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
     VALUES (?, ?, 'admin', 1, 'activo')
     ON DUPLICATE KEY UPDATE
       rol_empresa = VALUES(rol_empresa),
       estado = 'activo',
       principal = IF(principal = 1, 1, VALUES(principal))`,
    [empresa.id, user.id]
  );

  return empresa.id;
}

async function resolveEmpresaIdForUser(userId, { autoCreate = false } = {}) {
  if (!userId) return null;

  const existing = await findEmpresaIdByUserId(userId);
  if (existing) return existing;

  if (!autoCreate) return null;

  const attached = await attachEmpresaByUserEmail(userId);
  if (attached) return attached;

  return createEmpresaForUser(userId);
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function buildResumen(empresa, perfil) {
  const checks = [
    { key: 'nombre', label: 'Nombre', done: Boolean(String(empresa?.nombre || '').trim()) },
    { key: 'industria', label: 'Industria', done: Boolean(String(perfil?.industria || '').trim()) },
    {
      key: 'ubicacion_principal',
      label: 'Ubicacion',
      done: Boolean(String(perfil?.ubicacion_principal || '').trim())
    },
    {
      key: 'tamano_empleados',
      label: 'Tamano',
      done: Number.isInteger(perfil?.tamano_empleados) && perfil.tamano_empleados > 0
    },
    {
      key: 'descripcion',
      label: 'Descripcion',
      done: Boolean(String(perfil?.descripcion || '').trim())
    },
    {
      key: 'sitio_web',
      label: 'Sitio web',
      done: Boolean(String(perfil?.sitio_web || '').trim())
    },
    {
      key: 'linkedin_url',
      label: 'LinkedIn',
      done: Boolean(String(perfil?.linkedin_url || '').trim())
    },
    {
      key: 'instagram_url',
      label: 'Instagram',
      done: Boolean(String(perfil?.instagram_url || '').trim())
    },
    {
      key: 'facebook_url',
      label: 'Facebook',
      done: Boolean(String(perfil?.facebook_url || '').trim())
    }
  ];

  const completados = checks.filter((item) => item.done).length;
  const porcentaje = Math.round((completados / checks.length) * 100);
  const camposPendientes = checks.filter((item) => !item.done).map((item) => item.label);

  return {
    porcentaje_completitud: porcentaje,
    campos_pendientes: camposPendientes
  };
}

async function getPerfilByEmpresaId(empresaId) {
  const [rows] = await db.query(
    `SELECT
      e.id AS e_id,
      e.nombre AS e_nombre,
      e.ruc AS e_ruc,
      e.email AS e_email,
      e.telefono AS e_telefono,
      e.tipo AS e_tipo,
      e.activo AS e_activo,
      ep.industria AS ep_industria,
      ep.ubicacion_principal AS ep_ubicacion_principal,
      ep.tamano_empleados AS ep_tamano_empleados,
      ep.descripcion AS ep_descripcion,
      ep.cultura AS ep_cultura,
      ep.beneficios AS ep_beneficios,
      ep.sitio_web AS ep_sitio_web,
      ep.linkedin_url AS ep_linkedin_url,
      ep.instagram_url AS ep_instagram_url,
      ep.facebook_url AS ep_facebook_url,
      ep.logo_url AS ep_logo_url,
      ep.porcentaje_completitud AS ep_porcentaje_completitud,
      ep.campos_pendientes AS ep_campos_pendientes
     FROM empresas e
     LEFT JOIN empresas_perfil ep
       ON ep.empresa_id = e.id
     WHERE e.id = ?
       AND e.deleted_at IS NULL
     LIMIT 1`,
    [empresaId]
  );

  const row = rows[0];
  if (!row) return null;

  const empresa = {
    id: row.e_id,
    nombre: row.e_nombre,
    ruc: row.e_ruc,
    email: row.e_email,
    telefono: row.e_telefono,
    tipo: row.e_tipo,
    activo: row.e_activo
  };

  const perfil = {
    industria: row.ep_industria,
    ubicacion_principal: row.ep_ubicacion_principal,
    tamano_empleados: row.ep_tamano_empleados,
    descripcion: row.ep_descripcion,
    cultura: row.ep_cultura,
    beneficios: parseJsonArray(row.ep_beneficios),
    sitio_web: row.ep_sitio_web,
    linkedin_url: row.ep_linkedin_url,
    instagram_url: row.ep_instagram_url,
    facebook_url: row.ep_facebook_url,
    logo_url: row.ep_logo_url
  };

  const resumen = buildResumen(empresa, perfil);

  return {
    empresa,
    perfil,
    resumen_guardado: {
      porcentaje_completitud: row.ep_porcentaje_completitud,
      campos_pendientes: parseJsonArray(row.ep_campos_pendientes)
    },
    resumen
  };
}

async function updateEmpresa(empresaId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  await db.query(
    `UPDATE empresas
     SET ${setSql}
     WHERE id = ?
       AND deleted_at IS NULL`,
    [...keys.map((key) => patch[key]), empresaId]
  );
}

async function upsertPerfilEmpresa(empresaId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;

  const columns = ['empresa_id', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [empresaId, ...keys.map((key) => patch[key])];
  const updateSql = keys.map((key) => `${key} = VALUES(${key})`).join(', ');

  await db.query(
    `INSERT INTO empresas_perfil (${columns.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    values
  );
}

async function saveResumenPerfil(empresaId, resumen) {
  await upsertPerfilEmpresa(empresaId, {
    porcentaje_completitud: resumen.porcentaje_completitud,
    campos_pendientes: JSON.stringify(resumen.campos_pendientes || [])
  });
}

module.exports = {
  resolveEmpresaIdForUser,
  getPerfilByEmpresaId,
  updateEmpresa,
  upsertPerfilEmpresa,
  saveResumenPerfil
};
