const express = require('express');
const {
  importAcreditados,
  listarConvocatorias,
  listarCursosPorConvocatoria,
  listarPromociones,
  listEmpresasMapeo,
  searchEmpresasLocales,
  vincularEmpresaOrigen,
  actualizarNombreEmpresaOrigen,
  descartarEmpresaOrigen
} = require('../controllers/integraciones.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/ademy/acreditados/import', authRequired, requireRole(['administrador', 'superadmin']), importAcreditados);
router.get('/ademy/convocatorias', authRequired, requireRole(['administrador', 'superadmin']), listarConvocatorias);
router.get('/ademy/convocatorias/:id/cursos', authRequired, requireRole(['administrador', 'superadmin']), listarCursosPorConvocatoria);
router.get('/ademy/convocatorias/:id/promociones', authRequired, requireRole(['administrador', 'superadmin']), listarPromociones);
router.get('/ademy/empresas-mapeo', authRequired, requireRole(['administrador', 'superadmin']), listEmpresasMapeo);
router.get('/ademy/empresas-locales', authRequired, requireRole(['administrador', 'superadmin']), searchEmpresasLocales);
router.put('/ademy/empresas-mapeo/:origenEmpresaId/vincular', authRequired, requireRole(['administrador', 'superadmin']), vincularEmpresaOrigen);
router.put('/ademy/empresas-mapeo/:origenEmpresaId/nombre', authRequired, requireRole(['administrador', 'superadmin']), actualizarNombreEmpresaOrigen);
router.put('/ademy/empresas-mapeo/:origenEmpresaId/descartar', authRequired, requireRole(['administrador', 'superadmin']), descartarEmpresaOrigen);

module.exports = router;
