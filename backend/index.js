const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./db');
const { startAdemySyncJob } = require('./jobs/ademySync.job');
const { UPLOADS_ROOT, ensureDirSync } = require('./utils/uploadPaths');

const authRoutes = require('./routes/auth.routes');
const integracionesRoutes = require('./routes/integraciones.routes');
const candidatosRoutes = require('./routes/candidatos.routes');
const hojaVidaRoutes = require('./routes/hojaVida.routes');
const perfilCandidatoRoutes = require('./routes/perfilCandidato.routes');
const companyPerfilRoutes = require('./routes/companyPerfil.routes');
const verificacionesRoutes = require('./routes/verificaciones.routes');
const vacantesRoutes = require('./routes/vacantes.routes');
const postulacionesRoutes = require('./routes/postulaciones.routes');
const socialRoutes = require('./routes/social.routes');

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
ensureDirSync(UPLOADS_ROOT);

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/', (req, res) => {
  res.send('EmpleoFacil API');
});

app.use('/auth', authRoutes);
app.use('/api/integraciones', integracionesRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/hoja-vida', hojaVidaRoutes);
app.use('/api/perfil', perfilCandidatoRoutes);
app.use('/api/company', companyPerfilRoutes);
app.use('/api/verificaciones', verificacionesRoutes);
app.use('/api/vacantes', vacantesRoutes);
app.use('/api/postulaciones', postulacionesRoutes);
app.use('/api/social', socialRoutes);
app.use('/uploads', express.static(UPLOADS_ROOT));
const legacyUploadsRoot = path.join(__dirname, 'uploads');
if (path.resolve(legacyUploadsRoot) !== path.resolve(UPLOADS_ROOT)) {
  app.use('/uploads', express.static(legacyUploadsRoot));
}

app.use((err, _req, res, _next) => {
  if (!err) return res.status(500).json({ error: 'INTERNAL_ERROR' });
  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: 'INVALID_FILE_TYPE' });
  }
  if (err.message === 'INVALID_CANDIDATO_ID') {
    return res.status(400).json({ error: 'INVALID_CANDIDATO_ID' });
  }
  if (err.message === 'CANDIDATO_NOT_FOUND') {
    return res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'FILE_TOO_LARGE' });
  }
  return res.status(500).json({ error: 'INTERNAL_ERROR', details: err.message });
});

const PORT = process.env.BACKEND_PORT || 3000;

db.waitForConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend EmpleoFacil listo en puerto ${PORT}`);
      startAdemySyncJob();
    });
  })
  .catch((err) => {
    console.error(`No se pudo conectar a DB: ${err.message}`);
    process.exit(1);
  });
