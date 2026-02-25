const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listEmpresasPublicHandler,
  getEmpresaPublicProfileHandler,
  followEmpresaHandler,
  unfollowEmpresaHandler,
  getMyCandidateSocialConfigHandler,
  updateMyCandidateSocialConfigHandler,
  listPublicCandidatesHandler,
  followCandidateHandler,
  unfollowCandidateHandler
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

router.get(
  '/candidatos',
  authRequired,
  requireRole(['candidato', 'empresa', 'administrador', 'superadmin']),
  listPublicCandidatesHandler
);
router.post(
  '/candidatos/:candidatoId/seguir',
  authRequired,
  requireRole(['candidato']),
  followCandidateHandler
);
router.delete(
  '/candidatos/:candidatoId/seguir',
  authRequired,
  requireRole(['candidato']),
  unfollowCandidateHandler
);
router.get(
  '/candidatos/me/config',
  authRequired,
  requireRole(['candidato']),
  getMyCandidateSocialConfigHandler
);
router.patch(
  '/candidatos/me/config',
  authRequired,
  requireRole(['candidato']),
  updateMyCandidateSocialConfigHandler
);

module.exports = router;
