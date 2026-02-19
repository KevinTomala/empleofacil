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
  updateDatosBasicosById,
  updateContactoById,
  updateDomicilioById,
  updateSaludById,
  updateLogisticaById,
  updateEducacionById,
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
  listExperienciaById,
  createExperienciaById,
  updateExperienciaById,
  deleteExperienciaById,
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

router.get('/me', authRequired, requireRole(['candidato']), getMyPerfil);
router.get('/me/verificacion', authRequired, requireRole(['candidato']), getMyCandidateVerification);
router.post('/me/verificacion/solicitar', authRequired, requireRole(['candidato']), requestMyCandidateVerification);
router.put('/me/datos-basicos', authRequired, requireRole(['candidato']), updateMyDatosBasicos);
router.put('/me/contacto', authRequired, requireRole(['candidato']), updateMyContacto);
router.put('/me/domicilio', authRequired, requireRole(['candidato']), updateMyDomicilio);
router.put('/me/salud', authRequired, requireRole(['candidato']), updateMySalud);
router.put('/me/logistica', authRequired, requireRole(['candidato']), updateMyLogistica);
router.put('/me/educacion', authRequired, requireRole(['candidato']), updateMyEducacion);

router.get('/me/idiomas', authRequired, requireRole(['candidato']), listMyIdiomas);
router.post('/me/idiomas', authRequired, requireRole(['candidato']), createMyIdioma);
router.put('/me/idiomas/:idiomaId', authRequired, requireRole(['candidato']), updateMyIdioma);
router.delete('/me/idiomas/:idiomaId', authRequired, requireRole(['candidato']), deleteMyIdioma);

router.get('/me/experiencia', authRequired, requireRole(['candidato']), listMyExperiencia);
router.post('/me/experiencia', authRequired, requireRole(['candidato']), createMyExperiencia);
router.put('/me/experiencia/:experienciaId', authRequired, requireRole(['candidato']), updateMyExperiencia);
router.delete('/me/experiencia/:experienciaId', authRequired, requireRole(['candidato']), deleteMyExperiencia);

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

router.get('/:candidatoId/idiomas', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listIdiomasById);
router.post('/:candidatoId/idiomas', authRequired, requireRole(['administrador', 'superadmin']), createIdiomaById);
router.put('/:candidatoId/idiomas/:idiomaId', authRequired, requireRole(['administrador', 'superadmin']), updateIdiomaById);
router.delete('/:candidatoId/idiomas/:idiomaId', authRequired, requireRole(['administrador', 'superadmin']), deleteIdiomaById);

router.get('/:candidatoId/experiencia', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listExperienciaById);
router.post('/:candidatoId/experiencia', authRequired, requireRole(['administrador', 'superadmin']), createExperienciaById);
router.put('/:candidatoId/experiencia/:experienciaId', authRequired, requireRole(['administrador', 'superadmin']), updateExperienciaById);
router.delete('/:candidatoId/experiencia/:experienciaId', authRequired, requireRole(['administrador', 'superadmin']), deleteExperienciaById);

router.get('/:candidatoId/documentos', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listDocumentosById);
router.post('/:candidatoId/documentos', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), createDocumentoById);
router.put('/:candidatoId/documentos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), updateDocumentoById);
router.delete('/:candidatoId/documentos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), deleteDocumentoById);

module.exports = router;
