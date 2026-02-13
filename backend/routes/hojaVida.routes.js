const express = require('express');
const { getHojaVida, getHojaVidaPdf } = require('../controllers/hojaVida.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get(
  '/:estudianteId/pdf',
  authRequired,
  requireRole(['administrador', 'superadmin', 'empresa']),
  getHojaVidaPdf
);

router.get(
  '/:estudianteId',
  authRequired,
  requireRole(['administrador', 'superadmin', 'empresa']),
  getHojaVida
);

module.exports = router;
