const express = require('express');
const { importAcreditados } = require('../controllers/integraciones.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/ademy/acreditados/import', authRequired, requireRole(['administrador', 'superadmin']), importAcreditados);

module.exports = router;
