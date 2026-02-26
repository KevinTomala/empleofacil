const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listVacantesLatestPublic,
  listVacantesProvinciaCountPublic,
  listVacantesPublic,
  listMyVacantes,
  createVacanteHandler,
  updateVacanteHandler,
  updateVacanteEstadoHandler
} = require('../controllers/vacantes.controller');

const router = express.Router();

router.get('/public/latest', listVacantesLatestPublic);
router.get('/public/provincias-count', listVacantesProvinciaCountPublic);
router.get('/', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listVacantesPublic);
router.get('/mias', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listMyVacantes);
router.post('/', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), createVacanteHandler);
router.put('/:vacanteId', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), updateVacanteHandler);
router.put('/:vacanteId/estado', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), updateVacanteEstadoHandler);

module.exports = router;
