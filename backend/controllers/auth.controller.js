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

function normalizeEmail(value) {
  return normalizeIdentifier(value).toLowerCase();
}

function splitFullName(value) {
  const tokens = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return { nombres: 'Usuario', apellidos: 'Registrado' };
  }

  if (tokens.length === 1) {
    return { nombres: tokens[0], apellidos: tokens[0] };
  }

  if (tokens.length === 2) {
    return { nombres: tokens[0], apellidos: tokens[1] };
  }

  return {
    nombres: tokens.slice(0, -2).join(' '),
    apellidos: tokens.slice(-2).join(' ')
  };
}

async function register(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const nombreCompleto = normalizeIdentifier(req.body?.nombre_completo);
  const accountType = String(req.body?.account_type || '').trim().toLowerCase();

  if (!email || !password || !nombreCompleto || !accountType) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  if (!['candidate', 'company'].includes(accountType)) {
    return res.status(400).json({ error: 'INVALID_ACCOUNT_TYPE' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'WEAK_PASSWORD' });
  }

  const [existingRows] = await db.query(
    `SELECT id
     FROM usuarios
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email]
  );
  if (existingRows.length) {
    return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });
  }

  const hash = await bcrypt.hash(password, 10);
  const rol = accountType === 'company' ? 'empresa' : 'candidato';

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [insertUser] = await connection.query(
      `INSERT INTO usuarios (email, password_hash, nombre_completo, rol, must_change_password, estado, activo)
       VALUES (?, ?, ?, ?, 0, 'activo', 1)`,
      [email, hash, nombreCompleto, rol]
    );

    const userId = insertUser.insertId;

    if (rol === 'candidato') {
      const { nombres, apellidos } = splitFullName(nombreCompleto);
      await connection.query(
        `INSERT INTO candidatos (usuario_id, nombres, apellidos, activo)
         VALUES (?, ?, ?, 1)`,
        [userId, nombres, apellidos]
      );
    } else {
      const [insertEmpresa] = await connection.query(
        `INSERT INTO empresas (nombre, email, tipo, activo)
         VALUES (?, ?, 'externa', 1)`,
        [nombreCompleto, email]
      );
      await connection.query(
        `INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
         VALUES (?, ?, 'admin', 1, 'activo')`,
        [insertEmpresa.insertId, userId]
      );
    }

    await connection.commit();
    return res.status(201).json({
      ok: true,
      user: {
        id: userId,
        email,
        rol,
        nombre_completo: nombreCompleto
      }
    });
  } catch (error) {
    await connection.rollback();
    if (String(error.code || '') === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });
    }
    throw error;
  } finally {
    connection.release();
  }
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
  register,
  changePassword
};
