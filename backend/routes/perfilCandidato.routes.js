const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  ensureDirSync,
  sanitizePathSegment,
  resolveAbsoluteUploadPath,
  getPublicUploadPathFromAbsolute
} = require('../utils/uploadPaths');
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
  listEmpresasExperiencia,
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
  getMyFormacionCertificado,
  createMyFormacionCertificado,
  updateMyFormacionCertificado,
  deleteMyFormacionCertificado,
  getFormacionCertificadoById,
  createFormacionCertificadoById,
  updateFormacionCertificadoById,
  deleteFormacionCertificadoById,
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

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildCandidateDirectoryName(candidate) {
  const doc = sanitizePathSegment(candidate.documento_identidad, {
    fallback: `ID${candidate.id}`,
    maxLength: 40,
    uppercase: true
  });
  const names = sanitizePathSegment(`${candidate.nombres || ''}_${candidate.apellidos || ''}`, {
    fallback: `CANDIDATO_${candidate.id}`,
    maxLength: 120,
    uppercase: true
  });
  return `${doc}_${names}`.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function resolveDocumentCategory(req) {
  const url = String(req.originalUrl || req.path || '').toLowerCase();

  if (url.includes('/experiencia/') && url.includes('/certificado')) {
    return 'certificado_experiencia';
  }
  if (url.includes('/formacion/') && url.includes('/certificado')) {
    return 'certificado_formacion';
  }

  const tipoDocumento = sanitizePathSegment(req.body?.tipo_documento, {
    fallback: 'documento',
    maxLength: 60
  });
  const ladoDocumento = sanitizePathSegment(req.body?.lado_documento, {
    fallback: '',
    maxLength: 20
  });

  if (tipoDocumento === 'documento_identidad' && ladoDocumento) {
    return `${tipoDocumento}_${ladoDocumento}`;
  }
  return tipoDocumento;
}

async function resolveCandidateForUpload(req) {
  const fromParam = parsePositiveInt(req.params?.candidatoId);
  if (req.params?.candidatoId !== undefined && !fromParam) {
    throw new Error('INVALID_CANDIDATO_ID');
  }

  if (fromParam) {
    const [rows] = await db.query(
      `SELECT id, documento_identidad, nombres, apellidos
       FROM candidatos
       WHERE id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [fromParam]
    );
    return rows[0] || null;
  }

  const userId = parsePositiveInt(req.user?.id);
  if (!userId) return null;

  const [rows] = await db.query(
    `SELECT id, documento_identidad, nombres, apellidos
     FROM candidatos
     WHERE usuario_id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function resolveUploadDestination(req) {
  const candidate = await resolveCandidateForUpload(req);
  if (!candidate) {
    throw new Error('CANDIDATO_NOT_FOUND');
  }

  const candidateFolder = buildCandidateDirectoryName(candidate);
  const categoryFolder = resolveDocumentCategory(req);
  const destination = resolveAbsoluteUploadPath('candidatos', candidateFolder, categoryFolder);
  ensureDirSync(destination);
  req.uploadCandidate = candidate;
  req.uploadCandidateFolder = candidateFolder;
  req.uploadCategoryFolder = categoryFolder;
  return destination;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    resolveUploadDestination(req)
      .then((destination) => {
        req.uploadDestination = destination;
        cb(null, destination);
      })
      .catch((error) => cb(error));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const absolutePath = path.join(req.uploadDestination || '', filename);
    const publicPath = getPublicUploadPathFromAbsolute(absolutePath);
    if (!publicPath) {
      return cb(new Error('INVALID_UPLOAD_DESTINATION'));
    }
    req.uploadPublicPath = publicPath;
    cb(null, filename);
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
router.get('/empresas-experiencia', authRequired, requireRole(['candidato', 'administrador', 'superadmin']), listEmpresasExperiencia);
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
router.get('/me/formacion/:formacionId/certificado', authRequired, requireRole(['candidato']), getMyFormacionCertificado);
router.post('/me/formacion/:formacionId/certificado', authRequired, requireRole(['candidato']), uploadDocumento.single('archivo'), createMyFormacionCertificado);
router.put('/me/formacion/:formacionId/certificado', authRequired, requireRole(['candidato']), uploadDocumento.single('archivo'), updateMyFormacionCertificado);
router.delete('/me/formacion/:formacionId/certificado', authRequired, requireRole(['candidato']), deleteMyFormacionCertificado);

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
router.get('/:candidatoId/formacion/:formacionId/certificado', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), getFormacionCertificadoById);
router.post('/:candidatoId/formacion/:formacionId/certificado', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), createFormacionCertificadoById);
router.put('/:candidatoId/formacion/:formacionId/certificado', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), updateFormacionCertificadoById);
router.delete('/:candidatoId/formacion/:formacionId/certificado', authRequired, requireRole(['administrador', 'superadmin']), deleteFormacionCertificadoById);

router.get('/:candidatoId/documentos', authRequired, requireRole(['empresa', 'administrador', 'superadmin']), listDocumentosById);
router.post('/:candidatoId/documentos', authRequired, requireRole(['administrador', 'superadmin']), uploadDocumento.single('archivo'), createDocumentoById);
router.put('/:candidatoId/documentos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), updateDocumentoById);
router.delete('/:candidatoId/documentos/:documentoId', authRequired, requireRole(['administrador', 'superadmin']), deleteDocumentoById);

module.exports = router;
