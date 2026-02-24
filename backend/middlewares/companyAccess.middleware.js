const db = require('../db');
const { resolveEmpresaIdForUser } = require('../services/companyPerfil.service');

async function resolveCompanyContextByUserId(userId) {
  const [rows] = await db.query(
    `SELECT
      eu.id AS empresa_usuario_id,
      eu.empresa_id,
      eu.rol_empresa
     FROM empresas_usuarios eu
     INNER JOIN empresas e
       ON e.id = eu.empresa_id
     WHERE eu.usuario_id = ?
       AND eu.estado = 'activo'
       AND e.deleted_at IS NULL
     ORDER BY eu.principal DESC, eu.id ASC
     LIMIT 1`,
    [userId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    empresaId: row.empresa_id,
    empresaUsuarioId: row.empresa_usuario_id,
    rolEmpresa: row.rol_empresa
  };
}

async function hasAnyCompanyLinkByUserId(userId) {
  const [rows] = await db.query(
    `SELECT 1
     FROM empresas_usuarios
     WHERE usuario_id = ?
     LIMIT 1`,
    [userId]
  );
  return Boolean(rows.length);
}

function companyContextRequired() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' });
      }

      let context = await resolveCompanyContextByUserId(userId);

      if (!context && req.user?.rol === 'empresa') {
        const hasPreviousLinks = await hasAnyCompanyLinkByUserId(userId);
        if (!hasPreviousLinks) {
          await resolveEmpresaIdForUser(userId, { autoCreate: true });
          context = await resolveCompanyContextByUserId(userId);
        }
      }

      if (!context) {
        return res.status(403).json({ error: 'COMPANY_ACCESS_REQUIRED' });
      }

      req.companyContext = context;
      return next();
    } catch (error) {
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        details: String(error.message || error)
      });
    }
  };
}

function requireCompanyRole(rolesEmpresa) {
  const allowed = Array.isArray(rolesEmpresa) ? rolesEmpresa : [rolesEmpresa];
  return (req, res, next) => {
    const rolEmpresa = req.companyContext?.rolEmpresa;
    if (!rolEmpresa || !allowed.includes(rolEmpresa)) {
      return res.status(403).json({ error: 'COMPANY_ROLE_FORBIDDEN' });
    }
    return next();
  };
}

function requireCompanyAnyWrite() {
  return requireCompanyRole(['admin', 'reclutador']);
}

function requireCompanyAdmin() {
  return requireCompanyRole(['admin']);
}

module.exports = {
  companyContextRequired,
  requireCompanyRole,
  requireCompanyAnyWrite,
  requireCompanyAdmin
};
