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

function buildUrl(path, params) {
  const base = process.env.ADEMY_API_URL;
  if (!base) throw new Error('Missing ADEMY_API_URL');

  const url = new URL(path, base);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function fetchJson(path, params) {
  const token = buildServiceToken();
  const url = buildUrl(path, params);

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

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchAcreditados(params) {
  const payload = await fetchJson('/api/estudiantes/acreditados', params);
  if (Array.isArray(payload)) {
    return { items: payload, nextPage: null };
  }

  const items = payload?.items || payload?.data || [];
  const pagination = payload?.pagination || payload?.meta || {};
  const current = Number(pagination.page || pagination.current_page || params.page || 1);
  const totalPages = Number(pagination.total_pages || pagination.last_page || 0);
  const nextPage = totalPages && current < totalPages ? current + 1 : null;

  return { items, nextPage };
}

async function fetchConvocatorias() {
  const payload = await fetchJson('/api/convocatorias/s2s');
  return Array.isArray(payload) ? payload : payload?.items || [];
}

async function fetchCursosPorConvocatoria(convocatoriaId) {
  const payload = await fetchJson(`/api/convocatorias/s2s/${convocatoriaId}/cursos`);
  return Array.isArray(payload) ? payload : payload?.items || [];
}

async function fetchPromocionesPorConvocatoriaCurso(convocatoriaId, cursoId) {
  const payload = await fetchJson('/api/promociones/s2s', {
    convocatoria_id: convocatoriaId,
    curso_id: cursoId
  });
  return Array.isArray(payload) ? payload : payload?.items || [];
}

module.exports = {
  fetchAcreditados,
  fetchConvocatorias,
  fetchCursosPorConvocatoria,
  fetchPromocionesPorConvocatoriaCurso
};
