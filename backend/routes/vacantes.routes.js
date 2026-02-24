const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listVacantesPublic,
  listMyVacantes,
  createVacanteHandler,
  updateVacanteHandler,
  updateVacanteEstadoHandler
} = require('../controllers/vacantes.controller');

const router = express.Router();

router.get('/', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listVacantesPublic);
router.get('/mias', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listMyVacantes);
router.post('/', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), createVacanteHandler);
router.put('/:vacanteId', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), updateVacanteHandler);
router.put('/:vacanteId/estado', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), updateVacanteEstadoHandler);

module.exports = router;
