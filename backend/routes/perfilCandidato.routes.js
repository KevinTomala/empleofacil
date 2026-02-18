const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  getMyPerfil,
  getPerfilById,
  updateMyDatosBasicos,
  updateMyContacto,
  updateMyDomicilio,
  updateMySalud,
  updateMyLogistica,
  updateMyEducacion,
  updateDatosBasicosById,
  updateContactoById,
  updateDomicilioById,
  updateSaludById,
  updateLogisticaById,
  updateEducacionById
} = require('../controllers/perfilCandidato.controller');

const router = express.Router();

router.get('/me', authRequired, requireRole(['candidato']), getMyPerfil);
router.put('/me/datos-basicos', authRequired, requireRole(['candidato']), updateMyDatosBasicos);
router.put('/me/contacto', authRequired, requireRole(['candidato']), updateMyContacto);
router.put('/me/domicilio', authRequired, requireRole(['candidato']), updateMyDomicilio);
router.put('/me/salud', authRequired, requireRole(['candidato']), updateMySalud);
router.put('/me/logistica', authRequired, requireRole(['candidato']), updateMyLogistica);
router.put('/me/educacion', authRequired, requireRole(['candidato']), updateMyEducacion);

router.get('/:candidatoId', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), getPerfilById);
router.put('/:candidatoId/datos-basicos', authRequired, requireRole(['administrador', 'superadmin']), updateDatosBasicosById);
router.put('/:candidatoId/contacto', authRequired, requireRole(['administrador', 'superadmin']), updateContactoById);
router.put('/:candidatoId/domicilio', authRequired, requireRole(['administrador', 'superadmin']), updateDomicilioById);
router.put('/:candidatoId/salud', authRequired, requireRole(['administrador', 'superadmin']), updateSaludById);
router.put('/:candidatoId/logistica', authRequired, requireRole(['administrador', 'superadmin']), updateLogisticaById);
router.put('/:candidatoId/educacion', authRequired, requireRole(['administrador', 'superadmin']), updateEducacionById);

module.exports = router;
