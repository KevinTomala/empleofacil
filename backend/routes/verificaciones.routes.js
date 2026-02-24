const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listVerificacionesAdmin,
  getVerificacionByIdAdmin,
  reviewVerificacionAdmin,
  listDocumentosCandidatosAdmin,
  getDocumentoCandidatoAdmin,
  reviewDocumentoCandidatoAdmin,
  runDocumentosAutoPrecheckAdmin,
  listReactivacionesEmpresaAdmin,
  reviewReactivacionEmpresaAdmin
} = require('../controllers/verificaciones.controller');

const router = express.Router();

router.get('/cuentas', authRequired, requireRole(['administrador', 'superadmin']), listVerificacionesAdmin);
router.get('/cuentas/:verificacionId', authRequired, requireRole(['administrador', 'superadmin']), getVerificacionByIdAdmin);
router.put('/cuentas/:verificacionId/estado', authRequired, requireRole(['administrador', 'superadmin']), reviewVerificacionAdmin);
router.get('/documentos/candidatos', authRequired, requireRole(['administrador', 'superadmin']), listDocumentosCandidatosAdmin);
router.get('/documentos/candidatos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), getDocumentoCandidatoAdmin);
router.put('/documentos/candidatos/:documentoId/estado', authRequired, requireRole(['administrador', 'superadmin']), reviewDocumentoCandidatoAdmin);
router.post('/documentos/candidatos/auto-precheck', authRequired, requireRole(['administrador', 'superadmin']), runDocumentosAutoPrecheckAdmin);
router.get('/reactivaciones/empresas', authRequired, requireRole(['administrador', 'superadmin']), listReactivacionesEmpresaAdmin);
router.put('/reactivaciones/empresas/:reactivacionId/estado', authRequired, requireRole(['administrador', 'superadmin']), reviewReactivacionEmpresaAdmin);

module.exports = router;
