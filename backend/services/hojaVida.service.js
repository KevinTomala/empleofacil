const db = require('../db');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { getAbsoluteUploadPathFromPublic } = require('../utils/uploadPaths');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toBool(value) {
  return value === 1 || value === true;
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad;
}

function formatDate(value) {
  if (!value) return null;
  // Si viene como string YYYY-MM-DD, parsear directamente sin conversión a UTC
  const stringValue = String(value).trim();
  const match = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  // Si es otro formato, intentar con Date
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const dayNum = String(date.getDate()).padStart(2, '0');
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  const yearNum = date.getFullYear();
  return `${dayNum}/${monthNum}/${yearNum}`;
}

function formatDateLong(value) {
  if (!value) return null;
  // Si viene como string YYYY-MM-DD, crear Date sin offset de zona horaria
  const stringValue = String(value).trim();
  const match = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let date;
  if (match) {
    const [, year, month, day] = match;
    // Usar ISO string para evitar conversión de zona horaria
    date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-EC', { year: 'numeric', month: 'long' });
}

function textOrNull(value) {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  return String(value).trim() || null;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safe(value, fallback = '') {
  return escapeHtml(value ?? fallback);
}

function safeReadDir(dir) {
  try {
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch (_err) {
    return [];
  }
}

function guessMimeTypeFromPath(filePath) {
  const ext = String(path.extname(filePath || '')).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

function buildDataUrlFromFile(filePath, tipoMime = null) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    if (!buffer?.length) return null;
    const mimeType = String(tipoMime || '').trim() || guessMimeTypeFromPath(filePath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (_error) {
    return null;
  }
}

// Función para resolver foto específicamente para Puppeteer/PDF
// Intenta leer como data URL base64
function resolveFotoSourceForPdf(rutaArchivo, tipoMime = null) {
  const rawPath = String(rutaArchivo || '').trim();
  if (!rawPath) return null;
  if (rawPath.startsWith('data:image/')) return rawPath;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;

  // Usar la función de uploadPaths para resolver la ruta absoluta correcta
  const absolutePath = getAbsoluteUploadPathFromPublic(rawPath);
  
  if (absolutePath && fs.existsSync(absolutePath)) {
    const dataUrl = buildDataUrlFromFile(absolutePath, tipoMime);
    if (dataUrl) return dataUrl;
  }

  return null;
}

function resolveFotoSource(rutaArchivo, tipoMime = null) {
  const rawPath = String(rutaArchivo || '').trim();
  if (!rawPath) return null;
  if (rawPath.startsWith('data:image/')) return rawPath;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;

  const normalized = rawPath.replace(/\\/g, '/');
  
  // Si es una ruta relativa de uploads, devolverla como está para que frontend la resuelva
  if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    const publicPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return publicPath;  // El frontend resolverá esto con la API URL
  }

  // Intentar leer como archivo local
  const absolutePath = path.resolve(__dirname, '..', normalized);
  if (fs.existsSync(absolutePath)) {
    const dataUrl = buildDataUrlFromFile(absolutePath, tipoMime);
    if (dataUrl) return dataUrl;
  }

  return null;
}

// ─── Servicio: obtener datos JSON (sin IDs internos) ─────────────────────────

async function obtenerHojaVidaPorEstudianteId(estudianteId) {
  const [estudianteRows] = await db.query(
    `SELECT
      e.nombres,
      e.apellidos,
      e.documento_identidad,
      e.nacionalidad,
      e.fecha_nacimiento,
      e.sexo,
      e.estado_civil
    FROM candidatos e
    WHERE e.id = ? AND e.deleted_at IS NULL
    LIMIT 1`,
    [estudianteId]
  );

  if (!estudianteRows.length) return null;

  const estudiante = estudianteRows[0];

  const [
    [contactoRows],
    [domicilioRows],
    [saludRows],
    [logisticaRows],
    [educacionRows],
    [experienciasRows],
    [formacionesRows],
    [documentosRows]
  ] = await Promise.all([
    db.query(
      `SELECT email, telefono_celular, telefono_fijo
       FROM candidatos_contacto
       WHERE candidato_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT pais, provincia, canton, parroquia, direccion
       FROM candidatos_domicilio
       WHERE candidato_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT tipo_sangre
       FROM candidatos_salud
       WHERE candidato_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT movilizacion, tipo_vehiculo, licencia, disp_viajar, disp_turnos, disp_fines_semana
       FROM candidatos_logistica
       WHERE candidato_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT nivel_estudio, institucion, titulo_obtenido
       FROM candidatos_educacion_general
       WHERE candidato_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        empresa_nombre, cargo, fecha_inicio, fecha_fin,
        actualmente_trabaja, tipo_contrato, descripcion
       FROM candidatos_experiencia
       WHERE candidato_id = ? AND deleted_at IS NULL
       ORDER BY COALESCE(fecha_fin, CURDATE()) DESC, fecha_inicio DESC, id DESC`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        categoria_formacion, subtipo_formacion, institucion,
        nombre_programa, titulo_obtenido, fecha_aprobacion,
        fecha_emision, fecha_vencimiento, activo
       FROM candidatos_formaciones
       WHERE candidato_id = ? AND deleted_at IS NULL
       ORDER BY COALESCE(fecha_aprobacion, fecha_emision, fecha_vencimiento) DESC, id DESC`,
      [estudianteId]
    ),
    db.query(
      `SELECT tipo_documento, ruta_archivo, tipo_mime
       FROM candidatos_documentos
       WHERE candidato_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [estudianteId]
    )
  ]);

  const contacto = contactoRows[0] || null;
  const domicilio = domicilioRows[0] || null;
  const salud = saludRows[0] || null;
  const logistica = logisticaRows[0]
    ? {
      ...logisticaRows[0],
      movilizacion: toBool(logisticaRows[0].movilizacion),
      disp_viajar: toBool(logisticaRows[0].disp_viajar),
      disp_turnos: toBool(logisticaRows[0].disp_turnos),
      disp_fines_semana: toBool(logisticaRows[0].disp_fines_semana)
    }
    : null;
  const educacionGeneral = educacionRows[0] || null;
  const experiencias = experienciasRows.map((exp) => ({
    empresa_nombre: exp.empresa_nombre,
    cargo: exp.cargo,
    fecha_inicio: exp.fecha_inicio,
    fecha_fin: exp.fecha_fin,
    actualmente_trabaja: toBool(exp.actualmente_trabaja),
    tipo_contrato: exp.tipo_contrato,
    descripcion: exp.descripcion
  }));
  const formaciones = formacionesRows.map((f) => ({
    categoria_formacion: f.categoria_formacion,
    subtipo_formacion: f.subtipo_formacion,
    institucion: f.institucion,
    nombre_programa: f.nombre_programa,
    titulo_obtenido: f.titulo_obtenido,
    fecha_aprobacion: f.fecha_aprobacion,
    fecha_emision: f.fecha_emision,
    fecha_vencimiento: f.fecha_vencimiento,
    activo: toBool(f.activo)
  }));

  // Construir foto data URL para preview HTML
  const fotoDoc = (documentosRows || []).find((d) => d.tipo_documento === 'foto' && d.ruta_archivo);
  const fotoSrcForPreview = fotoDoc ? resolveFotoSourceForPdf(fotoDoc.ruta_archivo, fotoDoc.tipo_mime) || resolveFotoSource(fotoDoc.ruta_archivo, fotoDoc.tipo_mime) : null;

  // Construir HTML para previsualización
  const previewHtml = buildHtml({
    perfil: {
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      nombre_completo: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
      documento_identidad: estudiante.documento_identidad,
      nacionalidad: estudiante.nacionalidad,
      fecha_nacimiento: estudiante.fecha_nacimiento,
      edad: calcularEdad(estudiante.fecha_nacimiento),
      sexo: estudiante.sexo,
      estado_civil: estudiante.estado_civil
    },
    contacto,
    domicilio,
    salud,
    logistica,
    educacion: educacionGeneral,
    experiencias,
    formaciones,
    fotoSrc: fotoSrcForPreview
  });

  return {
    perfil: {
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      nombre_completo: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
      documento_identidad: estudiante.documento_identidad,
      nacionalidad: estudiante.nacionalidad,
      fecha_nacimiento: estudiante.fecha_nacimiento,
      edad: calcularEdad(estudiante.fecha_nacimiento),
      sexo: estudiante.sexo,
      estado_civil: estudiante.estado_civil
    },
    contacto,
    domicilio,
    salud,
    logistica,
    educacion_general: educacionGeneral,
    experiencia_laboral: experiencias,
    formaciones,
    documentos: documentosRows,
    html: previewHtml
  };
}

// ─── HTML del PDF ─────────────────────────────────────────────────────────────

function renderRow(label, value) {
  if (!value && value !== 0) return '';
  return `<div class="row"><span class="label">${label}:</span><span class="value">${safe(value)}</span></div>`;
}

function renderBadge(text) {
  if (!text) return '';
  return `<span class="badge">${safe(text)}</span>`;
}

function buildExperienciaHtml(experiencias) {
  if (!experiencias.length) return '<p class="empty">Sin experiencia laboral registrada.</p>';
  return experiencias.map((exp, idx) => {
    const periodo = (() => {
      const ini = formatDateLong(exp.fecha_inicio);
      const fin = exp.actualmente_trabaja ? 'Actualidad' : formatDateLong(exp.fecha_fin);
      if (ini && fin) return `${ini} – ${fin}`;
      if (ini) return `Desde ${ini}`;
      return null;
    })();
    return `
      <div class="card ${idx > 0 ? 'card-mt' : ''}">
        <div class="card-header">
          <div>
            <div class="card-title">${safe(exp.cargo || 'Cargo no especificado')}</div>
            <div class="card-sub">${safe(exp.empresa_nombre || 'Empresa no especificada')}</div>
          </div>
          <div class="card-meta">
            ${periodo ? `<div class="periodo">${safe(periodo)}</div>` : ''}
            ${exp.tipo_contrato ? renderBadge(exp.tipo_contrato) : ''}
            ${exp.actualmente_trabaja ? renderBadge('Trabajo actual') : ''}
          </div>
        </div>
        ${exp.descripcion ? `<p class="card-desc">${safe(exp.descripcion)}</p>` : ''}
      </div>`;
  }).join('');
}

function buildFormacionesHtml(formaciones) {
  if (!formaciones.length) return '<p class="empty">Sin formaciones registradas.</p>';
  return formaciones.map((f, idx) => {
    const titulo = textOrNull(f.nombre_programa) || textOrNull(f.titulo_obtenido) || 'Formación sin nombre';
    const fechaRef = f.fecha_aprobacion || f.fecha_emision;
    const fechaDisplay = formatDateLong(fechaRef);
    const vencimiento = f.fecha_vencimiento ? formatDateLong(f.fecha_vencimiento) : null;
    return `
      <div class="card ${idx > 0 ? 'card-mt' : ''}">
        <div class="card-header">
          <div>
            <div class="card-title">${safe(titulo)}</div>
            <div class="card-sub">${safe(f.institucion || 'Institución no especificada')}</div>
          </div>
          <div class="card-meta">
            ${fechaDisplay ? `<div class="periodo">${safe(fechaDisplay)}</div>` : ''}
            ${f.categoria_formacion ? renderBadge(f.categoria_formacion) : ''}
            ${f.subtipo_formacion ? renderBadge(f.subtipo_formacion) : ''}
          </div>
        </div>
        ${f.titulo_obtenido && f.titulo_obtenido !== titulo ? `<div class="card-detail">Certificado: ${safe(f.titulo_obtenido)}</div>` : ''}
        ${vencimiento ? `<div class="card-detail text-muted">Válido hasta: ${safe(vencimiento)}</div>` : ''}
      </div>`;
  }).join('');
}

function buildHtml({ perfil, contacto, domicilio, salud, logistica, educacion, experiencias, formaciones, fotoSrc }) {
  const ubicacion = [domicilio?.canton, domicilio?.provincia, domicilio?.pais].filter(Boolean).join(', ');
  const edad = perfil.edad ? `${perfil.edad} años` : null;

  const disponibilidades = [];
  if (logistica?.disp_viajar) disponibilidades.push('Disponible para viajar');
  if (logistica?.disp_turnos) disponibilidades.push('Disponible por turnos');
  if (logistica?.disp_fines_semana) disponibilidades.push('Disponible fines de semana');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    @page { size: A4; margin: 18mm 16mm; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a2e;
      font-size: 11px;
      line-height: 1.5;
      background: #fff;
    }

    /* ── HEADER ──────────────────────────────── */
    .cv-header {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      padding-bottom: 14px;
      border-bottom: 2.5px solid #1a1a2e;
      margin-bottom: 14px;
    }
    .photo-box {
      width: 90px; height: 112px;
      border: 1px solid #ccc;
      border-radius: 4px;
      overflow: hidden;
      flex-shrink: 0;
      background: #f4f4f4;
      display: flex; align-items: center; justify-content: center;
      color: #999; font-size: 9px; text-align: center;
    }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .header-info { flex: 1; }
    .cv-name { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.3px; }
    .cv-doc { font-size: 10px; color: #555; margin-top: 2px; margin-bottom: 8px; }
    .contact-line { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 4px; }
    .contact-item { font-size: 10.5px; color: #333; }
    .contact-item strong { font-weight: 600; }
    .ubic { font-size: 10.5px; color: #555; margin-top: 4px; }

    /* ── SECCIONES ───────────────────────────── */
    .section { margin-bottom: 13px; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1a1a2e;
      border-bottom: 1.5px solid #e0e0e0;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }

    /* ── GRID de datos personales ────────────── */
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 20px;
    }
    .row { display: flex; gap: 4px; font-size: 10.5px; }
    .label { color: #555; white-space: nowrap; }
    .value { font-weight: 600; color: #1a1a2e; }

    /* ── CARDS (experiencia / formaciones) ───── */
    .card {
      padding: 7px 10px;
      border-left: 3px solid #1a1a2e;
      background: #f9f9fb;
    }
    .card-mt { margin-top: 7px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .card-title { font-size: 11.5px; font-weight: 700; color: #1a1a2e; }
    .card-sub { font-size: 10.5px; color: #555; margin-top: 1px; }
    .card-meta { text-align: right; flex-shrink: 0; }
    .periodo { font-size: 10px; color: #444; margin-bottom: 3px; }
    .card-desc { font-size: 10px; color: #444; margin-top: 5px; padding-top: 4px; border-top: 1px dashed #ddd; }
    .card-detail { font-size: 10px; color: #555; margin-top: 3px; }
    .text-muted { color: #888; }
    .empty { font-size: 10px; color: #999; font-style: italic; }

    /* ── BADGES ──────────────────────────────── */
    .badge {
      display: inline-block;
      background: #e8e8f0;
      color: #333;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
      margin-top: 2px;
      margin-left: 2px;
    }

    /* ── CHIPS de disponibilidad ─────────────── */
    .chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip {
      background: #1a1a2e;
      color: #fff;
      font-size: 9.5px;
      padding: 2px 9px;
      border-radius: 12px;
    }

    /* ── PIE ─────────────────────────────────── */
    .footer { margin-top: 18px; font-size: 9px; color: #aaa; text-align: right; }
  </style>
</head>
<body>

  <!-- ENCABEZADO -->
  <div class="cv-header">
    <div class="photo-box">
      ${fotoSrc ? `<img src="${escapeHtml(fotoSrc)}" alt="Foto"/>` : 'FOTO<br/>CARNET'}
    </div>
    <div class="header-info">
      <div class="cv-name">${safe(perfil.nombre_completo)}</div>
      <div class="cv-doc">C.I. / Pasaporte: ${safe(perfil.documento_identidad)}</div>
      <div class="contact-line">
        ${contacto?.email ? `<span class="contact-item"><strong>Email:</strong> ${safe(contacto.email)}</span>` : ''}
        ${contacto?.telefono_celular ? `<span class="contact-item"><strong>Cel:</strong> ${safe(contacto.telefono_celular)}</span>` : ''}
        ${contacto?.telefono_fijo ? `<span class="contact-item"><strong>Tel:</strong> ${safe(contacto.telefono_fijo)}</span>` : ''}
      </div>
      ${ubicacion ? `<div class="ubic">📍 ${safe(ubicacion)}</div>` : ''}
    </div>
  </div>

  <!-- DATOS PERSONALES -->
  <div class="section">
    <div class="section-title">Datos Personales</div>
    <div class="data-grid">
      ${renderRow('Nacionalidad', textOrNull(perfil.nacionalidad))}
      ${renderRow('Fecha de nacimiento', formatDate(perfil.fecha_nacimiento))}
      ${renderRow('Edad', edad)}
      ${renderRow('Sexo', textOrNull(perfil.sexo))}
      ${renderRow('Estado civil', textOrNull(perfil.estado_civil))}
      ${salud?.tipo_sangre ? renderRow('Tipo de sangre', textOrNull(salud.tipo_sangre)) : ''}
    </div>
  </div>

  <!-- EDUCACIÓN -->
  <div class="section">
    <div class="section-title">Educación</div>
    <div class="data-grid">
      ${renderRow('Nivel de estudio', textOrNull(educacion?.nivel_estudio))}
      ${renderRow('Institución', textOrNull(educacion?.institucion))}
      ${renderRow('Título obtenido', textOrNull(educacion?.titulo_obtenido))}
    </div>
  </div>

  <!-- EXPERIENCIA LABORAL -->
  <div class="section">
    <div class="section-title">Experiencia Laboral</div>
    ${buildExperienciaHtml(experiencias)}
  </div>

  <!-- FORMACIONES Y CERTIFICADOS -->
  <div class="section">
    <div class="section-title">Formaciones y Certificados</div>
    ${buildFormacionesHtml(formaciones)}
  </div>

  <!-- DISPONIBILIDAD Y MOVILIDAD -->
  ${disponibilidades.length || logistica?.licencia || logistica?.tipo_vehiculo ? `
  <div class="section">
    <div class="section-title">Disponibilidad y Movilidad</div>
    <div class="data-grid">
      ${logistica?.licencia ? renderRow('Licencia de conducir', textOrNull(logistica.licencia)) : ''}
      ${logistica?.tipo_vehiculo ? renderRow('Vehículo propio', textOrNull(logistica.tipo_vehiculo)) : ''}
    </div>
    ${disponibilidades.length ? `
      <div class="chips" style="margin-top:6px;">
        ${disponibilidades.map((d) => `<span class="chip">${safe(d)}</span>`).join('')}
      </div>` : ''}
  </div>` : ''}

  <div class="footer">Documento generado el ${safe(formatDate(new Date()))}</div>

</body>
</html>`;
}

// ─── Servicio: generar PDF ────────────────────────────────────────────────────

async function generarHojaVidaPdfPorEstudianteId(estudianteId) {
  const hojaVida = await obtenerHojaVidaPorEstudianteId(estudianteId);
  if (!hojaVida) return null;

  const { perfil, contacto, domicilio, salud, logistica, documentos } = hojaVida;
  const educacion = hojaVida.educacion_general || {};
  const experiencias = hojaVida.experiencia_laboral || [];
  const formaciones = hojaVida.formaciones || [];

  const fotoDoc = (documentos || []).find((d) => d.tipo_documento === 'foto' && d.ruta_archivo);
  // Para PDF necesitamos base64
  const fotoSrc = fotoDoc ? resolveFotoSourceForPdf(fotoDoc.ruta_archivo, fotoDoc.tipo_mime) : null;

  const html = buildHtml({ perfil, contacto, domicilio, salud, logistica, educacion, experiencias, formaciones, fotoSrc });

  // ── Puppeteer ──
  const linuxCandidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium'];
  const detectedLinuxPath = linuxCandidates.find((p) => fs.existsSync(p));
  const executablePathFromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || null;
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.env.HOME || '/root', '.cache', 'puppeteer');
  let executablePathFinal = executablePathFromEnv || detectedLinuxPath || null;

  let defaultExecutablePath = null;
  try {
    defaultExecutablePath = puppeteer.executablePath();
  } catch (_err) {
    defaultExecutablePath = null;
  }

  if (!executablePathFinal && defaultExecutablePath && fs.existsSync(defaultExecutablePath)) {
    executablePathFinal = defaultExecutablePath;
  }

  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (executablePathFinal) launchOptions.executablePath = executablePathFinal;

  console.info('[hoja_vida_pdf] puppeteer diagnostics', {
    estudianteId,
    nodeEnv: process.env.NODE_ENV || null,
    executablePathFinal: executablePathFinal || null,
    cacheDir,
    cacheDirExists: fs.existsSync(cacheDir),
    cacheDirEntries: safeReadDir(cacheDir).slice(0, 20)
  });

  let browser;
  let buffer;
  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    buffer = await page.pdf({ format: 'A4', printBackground: true });
    await page.close();
  } catch (error) {
    console.error('[hoja_vida_pdf] pdf generation failed', {
      estudianteId,
      message: error?.message || String(error),
      stack: error?.stack || null,
      launchOptions
    });
    throw error;
  } finally {
    if (browser) await browser.close();
  }

  const safeName = String(perfil.nombre_completo || estudianteId)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 80);

  return {
    buffer,
    fileName: `HojaVida_${safeName || estudianteId}.pdf`
  };
}

module.exports = {
  obtenerHojaVidaPorEstudianteId,
  generarHojaVidaPdfPorEstudianteId
};
