const express = require('express');
const {
  importAcreditados,
  listarConvocatorias,
  listarCursosPorConvocatoria,
  listarPromociones
} = require('../controllers/integraciones.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/ademy/acreditados/import', authRequired, requireRole(['administrador', 'superadmin']), importAcreditados);
router.get('/ademy/convocatorias', authRequired, requireRole(['administrador', 'superadmin']), listarConvocatorias);
router.get('/ademy/convocatorias/:id/cursos', authRequired, requireRole(['administrador', 'superadmin']), listarCursosPorConvocatoria);
router.get('/ademy/convocatorias/:id/promociones', authRequired, requireRole(['administrador', 'superadmin']), listarPromociones);

module.exports = router;
