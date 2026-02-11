const jwt = require('jsonwebtoken');

function buildServiceToken() {
  const secret = process.env.ADEMY_JWT_SECRET;
  if (!secret) {
    throw new Error('Missing ADEMY_JWT_SECRET');
  }

  const payload = {
    iss: process.env.ADEMY_JWT_ISS || 'empleofacil',
    aud: process.env.ADEMY_JWT_AUD || 'apcontenedor',
    scope: process.env.ADEMY_JWT_SCOPE || 'acreditados.read'
  };

  return jwt.sign(payload, secret, { expiresIn: '10m' });
}

function buildUrl(params) {
  const base = process.env.ADEMY_API_URL;
  if (!base) throw new Error('Missing ADEMY_API_URL');

  const url = new URL('/api/estudiantes/acreditados', base);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function fetchAcreditados(params) {
  const token = buildServiceToken();
  const url = buildUrl(params);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ADEMY_API_ERROR: ${response.status} ${text}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return { items: payload, nextPage: null };
  }

  const items = payload.items || payload.data || [];
  const pagination = payload.pagination || payload.meta || {};
  const current = Number(pagination.page || pagination.current_page || params.page || 1);
  const totalPages = Number(pagination.total_pages || pagination.last_page || 0);
  const nextPage = totalPages && current < totalPages ? current + 1 : null;

  return { items, nextPage };
}

module.exports = {
  fetchAcreditados
};
