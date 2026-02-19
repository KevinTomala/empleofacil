const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

function normalizeIdentifier(value) {
  return String(value || '').trim();
}

function normalizeDocumento(value) {
  return normalizeIdentifier(value).replace(/[^0-9A-Za-z]/g, '');
}

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
    'INSERT INTO usuarios (email, password_hash, nombre_completo, rol, must_change_password) VALUES (?, ?, ?, ?, ?) ',
    [email, hash, nombre_completo, 'superadmin', 0]
  );

  return res.json({ ok: true });
}

async function login(req, res) {
  const identifier = normalizeIdentifier(req.body?.identifier || req.body?.email);
  const password = req.body?.password || '';
  if (!identifier || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const normalizedDoc = normalizeDocumento(identifier);
  const [rows] = await db.query(
    `SELECT
      u.id,
      u.email,
      u.password_hash,
      u.rol,
      u.estado,
      u.nombre_completo,
      COALESCE(u.must_change_password, 0) AS must_change_password
     FROM usuarios u
     LEFT JOIN candidatos e ON e.usuario_id = u.id
     WHERE LOWER(u.email) = LOWER(?)
       OR e.documento_identidad = ?
       OR REPLACE(REPLACE(REPLACE(COALESCE(e.documento_identidad, ''), '.', ''), '-', ''), ' ', '') = ?
     ORDER BY CASE WHEN LOWER(u.email) = LOWER(?) THEN 0 ELSE 1 END
     LIMIT 1`,
    [identifier, identifier, normalizedDoc, identifier]
  );
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
    { id: user.id, email: user.email, rol: user.rol, must_change_password: Boolean(user.must_change_password) },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre_completo: user.nombre_completo,
      must_change_password: Boolean(user.must_change_password)
    }
  });
}

async function changePassword(req, res) {
  const userId = req.user?.id;
  const currentPassword = String(req.body?.current_password || '');
  const newPassword = String(req.body?.new_password || '');

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'La nueva contrasena debe tener al menos 8 caracteres.' });
  }

  const [rows] = await db.query(
    'SELECT id, password_hash, estado FROM usuarios WHERE id = ? LIMIT 1',
    [userId]
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'USER_NOT_FOUND' });
  }

  const user = rows[0];
  if (user.estado !== 'activo') {
    return res.status(403).json({ error: 'USER_INACTIVE' });
  }

  const currentMatches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!currentMatches) {
    return res.status(401).json({ error: 'INVALID_CURRENT_PASSWORD' });
  }

  const reused = await bcrypt.compare(newPassword, user.password_hash);
  if (reused) {
    return res.status(400).json({ error: 'PASSWORD_REUSE_NOT_ALLOWED' });
  }

  const nextHash = await bcrypt.hash(newPassword, 10);
  await db.query(
    'UPDATE usuarios SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [nextHash, userId]
  );

  return res.json({ ok: true });
}

module.exports = {
  bootstrap,
  login,
  changePassword
};
