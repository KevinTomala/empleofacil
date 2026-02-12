const express = require('express');
const { listCandidatos } = require('../controllers/candidatos.controller');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, requireRole(['administrador', 'superadmin']), listCandidatos);

module.exports = router;
