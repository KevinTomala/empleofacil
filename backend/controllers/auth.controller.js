const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

async function bootstrap(req, res) {
  const { email, password, nombre_completo } = req.body || {};
  if (!email || !password || !nombre_completo) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const [rows] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
  if (rows[0].total > 0) {
    return res.status(409).json({ error: 'BOOTSTRAP_ALREADY_DONE' });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO usuarios (email, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?) ',
    [email, hash, nombre_completo, 'superadmin']
  );

  return res.json({ ok: true });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const [rows] = await db.query('SELECT id, email, password_hash, rol, estado FROM usuarios WHERE email = ? LIMIT 1', [email]);
  if (!rows.length) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const user = rows[0];
  if (user.estado !== 'activo') {
    return res.status(403).json({ error: 'USER_INACTIVE' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({ token });
}

module.exports = {
  bootstrap,
  login
};
