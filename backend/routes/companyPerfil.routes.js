const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  getMyCompanyPerfil,
  updateMyCompanyDatosGenerales
} = require('../controllers/companyPerfil.controller');

const router = express.Router();

router.get('/perfil/me', authRequired, requireRole(['empresa', 'superadmin']), getMyCompanyPerfil);
router.put('/perfil/me/datos-generales', authRequired, requireRole(['empresa', 'superadmin']), updateMyCompanyDatosGenerales);

module.exports = router;
