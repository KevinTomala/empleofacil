const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

const authRoutes = require('./routes/auth.routes');
const integracionesRoutes = require('./routes/integraciones.routes');
const candidatosRoutes = require('./routes/candidatos.routes');

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

const PORT = process.env.BACKEND_PORT || 3000;

db.waitForConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend EmpleoFacil listo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`No se pudo conectar a DB: ${err.message}`);
    process.exit(1);
  });
