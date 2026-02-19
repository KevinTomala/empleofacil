const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listVerificacionesAdmin,
  getVerificacionByIdAdmin,
  reviewVerificacionAdmin
} = require('../controllers/verificaciones.controller');

const router = express.Router();

router.get('/cuentas', authRequired, requireRole(['administrador', 'superadmin']), listVerificacionesAdmin);
router.get('/cuentas/:verificacionId', authRequired, requireRole(['administrador', 'superadmin']), getVerificacionByIdAdmin);
router.put('/cuentas/:verificacionId/estado', authRequired, requireRole(['administrador', 'superadmin']), reviewVerificacionAdmin);

module.exports = router;
