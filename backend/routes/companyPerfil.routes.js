const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  getMyCompanyPerfil,
  updateMyCompanyDatosGenerales,
  uploadMyCompanyLogo,
  deleteMyCompanyLogo
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

router.get('/perfil/me', authRequired, requireRole(['empresa', 'superadmin']), getMyCompanyPerfil);
router.get('/perfil/me/verificacion', authRequired, requireRole(['empresa', 'superadmin']), getMyCompanyVerification);
router.post('/perfil/me/verificacion/solicitar', authRequired, requireRole(['empresa', 'superadmin']), requestMyCompanyVerification);
router.put('/perfil/me/datos-generales', authRequired, requireRole(['empresa', 'superadmin']), updateMyCompanyDatosGenerales);
router.post('/perfil/me/logo/delete', authRequired, requireRole(['empresa', 'superadmin']), deleteMyCompanyLogo);
router.post('/perfil/me/logo', authRequired, requireRole(['empresa', 'superadmin']), uploadLogo.single('logo'), uploadMyCompanyLogo);
router.delete('/perfil/me/logo', authRequired, requireRole(['empresa', 'superadmin']), deleteMyCompanyLogo);

module.exports = router;
