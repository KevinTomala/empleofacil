const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const { companyContextRequired, requireCompanyAnyWrite } = require('../middlewares/companyAccess.middleware');
const {
  createPostulacionHandler,
  listMyPostulacionesHandler,
  getMyPostulacionesResumenHandler,
  getMyPostulacionDetailHandler,
  listEmpresaPostulacionesHandler,
  downloadEmpresaPostulacionCurriculumPdfHandler
} = require('../controllers/postulaciones.controller');

const router = express.Router();

router.post('/', authRequired, requireRole(['candidato']), createPostulacionHandler);
router.get('/mias', authRequired, requireRole(['candidato']), listMyPostulacionesHandler);
router.get('/mias/resumen', authRequired, requireRole(['candidato']), getMyPostulacionesResumenHandler);
router.get('/mias/:postulacionId', authRequired, requireRole(['candidato']), getMyPostulacionDetailHandler);
router.get('/empresa', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listEmpresaPostulacionesHandler);
router.get('/empresa/:postulacionId/curriculum/pdf', authRequired, requireRole(['empresa']), companyContextRequired(), requireCompanyAnyWrite(), downloadEmpresaPostulacionCurriculumPdfHandler);
router.get('/contratante', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listEmpresaPostulacionesHandler);

module.exports = router;
