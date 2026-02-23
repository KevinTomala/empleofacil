const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listVerificacionesAdmin,
  getVerificacionByIdAdmin,
  reviewVerificacionAdmin,
  listReactivacionesEmpresaAdmin,
  reviewReactivacionEmpresaAdmin
} = require('../controllers/verificaciones.controller');

const router = express.Router();

router.get('/cuentas', authRequired, requireRole(['administrador', 'superadmin']), listVerificacionesAdmin);
router.get('/cuentas/:verificacionId', authRequired, requireRole(['administrador', 'superadmin']), getVerificacionByIdAdmin);
router.put('/cuentas/:verificacionId/estado', authRequired, requireRole(['administrador', 'superadmin']), reviewVerificacionAdmin);
router.get('/reactivaciones/empresas', authRequired, requireRole(['administrador', 'superadmin']), listReactivacionesEmpresaAdmin);
router.put('/reactivaciones/empresas/:reactivacionId/estado', authRequired, requireRole(['administrador', 'superadmin']), reviewReactivacionEmpresaAdmin);

module.exports = router;
