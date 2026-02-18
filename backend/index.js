const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./db');
const { startAdemySyncJob } = require('./jobs/ademySync.job');

const authRoutes = require('./routes/auth.routes');
const integracionesRoutes = require('./routes/integraciones.routes');
const candidatosRoutes = require('./routes/candidatos.routes');
const hojaVidaRoutes = require('./routes/hojaVida.routes');
const perfilCandidatoRoutes = require('./routes/perfilCandidato.routes');

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((err, _req, res, _next) => {
  if (!err) return res.status(500).json({ error: 'INTERNAL_ERROR' });
  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: 'INVALID_FILE_TYPE' });
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
