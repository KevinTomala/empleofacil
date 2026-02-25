const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listEmpresasPublicHandler,
  getEmpresaPublicProfileHandler,
  followEmpresaHandler,
  unfollowEmpresaHandler
} = require('../controllers/social.controller');

const router = express.Router();

router.get(
  '/empresas',
  authRequired,
  requireRole(['candidato', 'empresa', 'administrador', 'superadmin']),
  listEmpresasPublicHandler
);
router.get(
  '/empresas/:empresaId/perfil',
  authRequired,
  requireRole(['candidato', 'empresa', 'administrador', 'superadmin']),
  getEmpresaPublicProfileHandler
);
router.post(
  '/empresas/:empresaId/seguir',
  authRequired,
  requireRole(['candidato']),
  followEmpresaHandler
);
router.delete(
  '/empresas/:empresaId/seguir',
  authRequired,
  requireRole(['candidato']),
  unfollowEmpresaHandler
);

module.exports = router;
