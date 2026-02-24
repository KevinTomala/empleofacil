const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = path.resolve(
  process.env.UPLOADS_ROOT || path.join(__dirname, '..', 'uploads')
);

function ensureDirSync(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function toPosixPath(value) {
  return String(value || '').split(path.sep).join('/');
}

function sanitizePathSegment(value, { fallback = 'sin_dato', maxLength = 80, uppercase = false } = {}) {
  const raw = value === null || value === undefined ? '' : String(value);
  let normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) normalized = fallback;
  normalized = normalized.slice(0, maxLength);
  return uppercase ? normalized.toUpperCase() : normalized.toLowerCase();
}

function resolveAbsoluteUploadPath(...segments) {
  return path.join(UPLOADS_ROOT, ...segments.filter(Boolean));
}

function getPublicUploadPathFromAbsolute(absolutePath) {
  if (!absolutePath) return null;
  const relativePath = path.relative(UPLOADS_ROOT, absolutePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return `/uploads/${toPosixPath(relativePath)}`;
}

function getAbsoluteUploadPathFromPublic(publicPath) {
  if (typeof publicPath !== 'string') return null;
  const safePath = publicPath.trim();
  if (!safePath.startsWith('/uploads/')) return null;

  const relative = safePath.replace(/^\/uploads\//, '');
  if (!relative || relative.includes('..')) return null;

  return path.join(UPLOADS_ROOT, ...relative.split('/').filter(Boolean));
}

module.exports = {
  UPLOADS_ROOT,
  ensureDirSync,
  sanitizePathSegment,
  resolveAbsoluteUploadPath,
  getPublicUploadPathFromAbsolute,
  getAbsoluteUploadPathFromPublic
};
