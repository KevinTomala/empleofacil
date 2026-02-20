const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
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
  listMyEducacionGeneralItems,
  createMyEducacionGeneralItem,
  updateMyEducacionGeneralItem,
  deleteMyEducacionGeneralItem,
  updateDatosBasicosById,
  updateContactoById,
  updateDomicilioById,
  updateSaludById,
  updateLogisticaById,
  updateEducacionById,
  listEducacionGeneralItemsById,
  createEducacionGeneralItemById,
  updateEducacionGeneralItemById,
  deleteEducacionGeneralItemById,
  listMyIdiomas,
  createMyIdioma,
  updateMyIdioma,
  deleteMyIdioma,
  listIdiomasById,
  createIdiomaById,
  updateIdiomaById,
  deleteIdiomaById,
  listMyExperiencia,
  createMyExperiencia,
  updateMyExperiencia,
  deleteMyExperiencia,
  getMyExperienciaCertificado,
  createMyExperienciaCertificado,
  updateMyExperienciaCertificado,
  deleteMyExperienciaCertificado,
  listCentrosCapacitacion,
  listExperienciaById,
  createExperienciaById,
  updateExperienciaById,
  deleteExperienciaById,
  getExperienciaCertificadoById,
  createExperienciaCertificadoById,
  updateExperienciaCertificadoById,
  deleteExperienciaCertificadoById,
  listMyFormacion,
  createMyFormacion,
  updateMyFormacion,
  deleteMyFormacion,
  listFormacionById,
  createFormacionById,
  updateFormacionById,
  deleteFormacionById,
  listMyDocumentos,
  createMyDocumento,
  updateMyDocumento,
  deleteMyDocumento,
  listDocumentosById,
  createDocumentoById,
  updateDocumentoById,
  deleteDocumentoById
} = require('../controllers/perfilCandidato.controller');
const {
  getMyCandidateVerification,
  requestMyCandidateVerification
} = require('../controllers/verificaciones.controller');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads', 'candidatos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const allowedMimes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const uploadDocumento = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    return cb(null, true);
  }
});

router.get('/centros-capacitacion', authRequired, requireRole(['candidato', 'administrador', 'superadmin']), listCentrosCapacitacion);
router.get('/me', authRequired, requireRole(['candidato']), getMyPerfil);
router.get('/me/verificacion', authRequired, requireRole(['candidato']), getMyCandidateVerification);
router.post('/me/verificacion/solicitar', authRequired, requireRole(['candidato']), requestMyCandidateVerification);
router.put('/me/datos-basicos', authRequired, requireRole(['candidato']), updateMyDatosBasicos);
router.put('/me/contacto', authRequired, requireRole(['candidato']), updateMyContacto);
router.put('/me/domicilio', authRequired, requireRole(['candidato']), updateMyDomicilio);
router.put('/me/salud', authRequired, requireRole(['candidato']), updateMySalud);
router.put('/me/logistica', authRequired, requireRole(['candidato']), updateMyLogistica);
router.put('/me/educacion', authRequired, requireRole(['candidato']), updateMyEducacion);
router.get('/me/educacion-general', authRequired, requireRole(['candidato']), listMyEducacionGeneralItems);
router.post('/me/educacion-general', authRequired, requireRole(['candidato']), createMyEducacionGeneralItem);
router.put('/me/educacion-general/:educacionGeneralId', authRequired, requireRole(['candidato']), updateMyEducacionGeneralItem);
router.delete('/me/educacion-general/:educacionGeneralId', authRequired, requireRole(['candidato']), deleteMyEducacionGeneralItem);

router.get('/me/idiomas', authRequired, requireRole(['candidato']), listMyIdiomas);
router.post('/me/idiomas', authRequired, requireRole(['candidato']), createMyIdioma);
router.put('/me/idiomas/:idiomaId', authRequired, requireRole(['candidato']), updateMyIdioma);
router.delete('/me/idiomas/:idiomaId', authRequired, requireRole(['candidato']), deleteMyIdioma);

router.get('/me/experiencia', authRequired, requireRole(['candidato']), listMyExperiencia);
router.post('/me/experiencia', authRequired, requireRole(['candidato']), createMyExperiencia);
router.put('/me/experiencia/:experienciaId', authRequired, requireRole(['candidato']), updateMyExperiencia);
router.delete('/me/experiencia/:experienciaId', authRequired, requireRole(['candidato']), deleteMyExperiencia);
router.get('/me/experiencia/:experienciaId/certificado', authRequired, requireRole(['candidato']), getMyExperienciaCertificado);
router.post('/me/experiencia/:experienciaId/certificado', authRequired, requireRole(['candidato']), uploadDocumento.single('archivo'), createMyExperienciaCertificado);
router.put('/me/experiencia/:experienciaId/certificado', authRequired, requireRole(['candidato']), uploadDocumento.single('archivo'), updateMyExperienciaCertificado);
router.delete('/me/experiencia/:experienciaId/certificado', authRequired, requireRole(['candidato']), deleteMyExperienciaCertificado);

router.get('/me/formacion', authRequired, requireRole(['candidato']), listMyFormacion);
router.post('/me/formacion', authRequired, requireRole(['candidato']), createMyFormacion);
router.put('/me/formacion/:formacionId', authRequired, requireRole(['candidato']), updateMyFormacion);
router.delete('/me/formacion/:formacionId', authRequired, requireRole(['candidato']), deleteMyFormacion);

router.get('/me/documentos', authRequired, requireRole(['candidato']), listMyDocumentos);
router.post('/me/documentos', authRequired, requireRole(['candidato']), uploadDocumento.single('archivo'), createMyDocumento);
router.put('/me/documentos/:documentoId', authRequired, requireRole(['candidato']), updateMyDocumento);
router.delete('/me/documentos/:documentoId', authRequired, requireRole(['candidato']), deleteMyDocumento);

router.get('/:candidatoId', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), getPerfilById);
router.put('/:candidatoId/datos-basicos', authRequired, requireRole(['administrador', 'superadmin']), updateDatosBasicosById);
router.put('/:candidatoId/contacto', authRequired, requireRole(['administrador', 'superadmin']), updateContactoById);
router.put('/:candidatoId/domicilio', authRequired, requireRole(['administrador', 'superadmin']), updateDomicilioById);
router.put('/:candidatoId/salud', authRequired, requireRole(['administrador', 'superadmin']), updateSaludById);
router.put('/:candidatoId/logistica', authRequired, requireRole(['administrador', 'superadmin']), updateLogisticaById);
router.put('/:candidatoId/educacion', authRequired, requireRole(['administrador', 'superadmin']), updateEducacionById);
router.get('/:candidatoId/educacion-general', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listEducacionGeneralItemsById);
router.post('/:candidatoId/educacion-general', authRequired, requireRole(['administrador', 'superadmin']), createEducacionGeneralItemById);
router.put('/:candidatoId/educacion-general/:educacionGeneralId', authRequired, requireRole(['administrador', 'superadmin']), updateEducacionGeneralItemById);
router.delete('/:candidatoId/educacion-general/:educacionGeneralId', authRequired, requireRole(['administrador', 'superadmin']), deleteEducacionGeneralItemById);

router.get('/:candidatoId/idiomas', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listIdiomasById);
router.post('/:candidatoId/idiomas', authRequired, requireRole(['administrador', 'superadmin']), createIdiomaById);
router.put('/:candidatoId/idiomas/:idiomaId', authRequired, requireRole(['administrador', 'superadmin']), updateIdiomaById);
router.delete('/:candidatoId/idiomas/:idiomaId', authRequired, requireRole(['administrador', 'superadmin']), deleteIdiomaById);

router.get('/:candidatoId/experiencia', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listExperienciaById);
router.post('/:candidatoId/experiencia', authRequired, requireRole(['administrador', 'superadmin']), createExperienciaById);
router.put('/:candidatoId/experiencia/:experienciaId', authRequired, requireRole(['administrador', 'superadmin']), updateExperienciaById);
router.delete('/:candidatoId/experiencia/:experienciaId', authRequired, requireRole(['administrador', 'superadmin']), deleteExperienciaById);
router.get('/:candidatoId/experiencia/:experienciaId/certificado', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), getExperienciaCertificadoById);
router.post('/:candidatoId/experiencia/:experienciaId/certificado', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), createExperienciaCertificadoById);
router.put('/:candidatoId/experiencia/:experienciaId/certificado', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), updateExperienciaCertificadoById);
router.delete('/:candidatoId/experiencia/:experienciaId/certificado', authRequired, requireRole(['administrador', 'superadmin']), deleteExperienciaCertificadoById);

router.get('/:candidatoId/formacion', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listFormacionById);
router.post('/:candidatoId/formacion', authRequired, requireRole(['administrador', 'superadmin']), createFormacionById);
router.put('/:candidatoId/formacion/:formacionId', authRequired, requireRole(['administrador', 'superadmin']), updateFormacionById);
router.delete('/:candidatoId/formacion/:formacionId', authRequired, requireRole(['administrador', 'superadmin']), deleteFormacionById);

router.get('/:candidatoId/documentos', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listDocumentosById);
router.post('/:candidatoId/documentos', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), createDocumentoById);
router.put('/:candidatoId/documentos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), updateDocumentoById);
router.delete('/:candidatoId/documentos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), deleteDocumentoById);

module.exports = router;
