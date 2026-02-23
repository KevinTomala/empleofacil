const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  companyContextRequired,
  requireCompanyAnyWrite,
  requireCompanyAdmin
} = require('../middlewares/companyAccess.middleware');
const {
  getMyCompanyPerfil,
  updateMyCompanyDatosGenerales,
  uploadMyCompanyLogo,
  deleteMyCompanyLogo,
  listMyCompanyUsuarios,
  createMyCompanyUsuario,
  updateMyCompanyUsuario,
  deleteMyCompanyUsuario,
  getMyCompanyPreferencias,
  upsertMyCompanyPreferencias,
  getMyCompanyReactivationRequest,
  requestMyCompanyReactivation,
  deleteMyCompanyPerfil
} = require('../controllers/companyPerfil.controller');
const {
  getMyCompanyVerification,
  requestMyCompanyVerification
} = require('../controllers/verificaciones.controller');

const router = express.Router();
const logosDir = path.join(__dirname, '..', 'uploads', 'empresas', 'logos');

if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const allowedMimes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/x-png',
  'image/pjpeg',
  'image/webp'
];

const uploadLogo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    return cb(null, true);
  }
});

router.get('/perfil/me', authRequired, companyContextRequired(), getMyCompanyPerfil);
router.get('/reactivacion/me', authRequired, requireRole(['empresa']), getMyCompanyReactivationRequest);
router.post('/reactivacion/me/solicitar', authRequired, requireRole(['empresa']), requestMyCompanyReactivation);
router.get('/perfil/me/verificacion', authRequired, companyContextRequired(), getMyCompanyVerification);
router.post('/perfil/me/verificacion/solicitar', authRequired, companyContextRequired(), requireCompanyAnyWrite(), requestMyCompanyVerification);
router.put('/perfil/me/datos-generales', authRequired, companyContextRequired(), requireCompanyAnyWrite(), updateMyCompanyDatosGenerales);
router.post('/perfil/me/logo/delete', authRequired, companyContextRequired(), requireCompanyAnyWrite(), deleteMyCompanyLogo);
router.post('/perfil/me/logo', authRequired, companyContextRequired(), requireCompanyAnyWrite(), uploadLogo.single('logo'), uploadMyCompanyLogo);
router.delete('/perfil/me/logo', authRequired, companyContextRequired(), requireCompanyAnyWrite(), deleteMyCompanyLogo);
router.get('/perfil/me/usuarios', authRequired, companyContextRequired(), listMyCompanyUsuarios);
router.post('/perfil/me/usuarios', authRequired, companyContextRequired(), requireCompanyAdmin(), createMyCompanyUsuario);
router.put('/perfil/me/usuarios/:empresaUsuarioId', authRequired, companyContextRequired(), requireCompanyAdmin(), updateMyCompanyUsuario);
router.delete('/perfil/me/usuarios/:empresaUsuarioId', authRequired, companyContextRequired(), requireCompanyAdmin(), deleteMyCompanyUsuario);
router.get('/perfil/me/preferencias', authRequired, companyContextRequired(), getMyCompanyPreferencias);
router.put('/perfil/me/preferencias', authRequired, companyContextRequired(), requireCompanyAnyWrite(), upsertMyCompanyPreferencias);
router.delete('/perfil/me', authRequired, companyContextRequired(), requireCompanyAdmin(), deleteMyCompanyPerfil);

module.exports = router;
