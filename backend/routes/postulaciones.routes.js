const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  createPostulacionHandler,
  listMyPostulacionesHandler,
  listEmpresaPostulacionesHandler
} = require('../controllers/postulaciones.controller');

const router = express.Router();

router.post('/', authRequired, requireRole(['candidato']), createPostulacionHandler);
router.get('/mias', authRequired, requireRole(['candidato']), listMyPostulacionesHandler);
router.get('/empresa', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listEmpresaPostulacionesHandler);

module.exports = router;
