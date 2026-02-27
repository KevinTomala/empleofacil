const db = require('../db');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { getAbsoluteUploadPathFromPublic } = require('../utils/uploadPaths');

const MAX_CERTIFICADOS_ADJUNTOS = 5;
const HOJA_VIDA_HTML_TIMEOUT_MS = Number(process.env.HOJA_VIDA_HTML_TIMEOUT_MS || 90000);

// --- Helpers -----------------------------------------------------------------

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

function withNd(value) {
  const normalized = textOrNull(value);
  return normalized || 'N/D';
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
  if (ext === '.pdf') return 'application/pdf';
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

function normalizeMimeType(mimeType, filePath = '') {
  const explicit = String(mimeType || '').trim().toLowerCase();
  if (explicit) return explicit;
  return guessMimeTypeFromPath(filePath);
}

function isSupportedAttachment(mimeType, filePath = '') {
  const normalized = normalizeMimeType(mimeType, filePath);
  return (
    normalized === 'application/pdf' ||
    normalized === 'image/jpeg' ||
    normalized === 'image/png' ||
    normalized === 'image/webp'
  );
}

function resolveManagedFilePath(rutaArchivo) {
  const rawPath = String(rutaArchivo || '').trim();
  if (!rawPath) return null;
  const fromUploads = getAbsoluteUploadPathFromPublic(rawPath);
  if (fromUploads && fs.existsSync(fromUploads)) return fromUploads;
  return null;
}

function formatCertEstado(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'aprobado') return 'Aprobado';
  if (normalized === 'rechazado') return 'Rechazado';
  if (normalized === 'vencido') return 'Vencido';
  return 'Pendiente';
}

function sanitizeCertificadoForViewer(certificado, viewerRole) {
  if (!certificado) return { existe: false };
  if (viewerRole === 'empresa') {
    const { ruta_archivo, ...rest } = certificado;
    return rest;
  }
  return certificado;
}

function sortAdjuntosDesc(a, b) {
  const aFecha = a?.sort_fecha ? new Date(a.sort_fecha).getTime() : 0;
  const bFecha = b?.sort_fecha ? new Date(b.sort_fecha).getTime() : 0;
  if (aFecha !== bFecha) return bFecha - aFecha;

  const aFallback = a?.sort_created ? new Date(a.sort_created).getTime() : 0;
  const bFallback = b?.sort_created ? new Date(b.sort_created).getTime() : 0;
  if (aFallback !== bFallback) return bFallback - aFallback;

  const weight = (item) => (item?.tipo_certificado === 'laboral' ? 0 : 1);
  return weight(a) - weight(b);
}

function buildAnexosSummary(totalDetectados, totalAdjuntados, totalOmitidosPorLimite = 0) {
  return {
    total_detectados: totalDetectados,
    total_adjuntados: totalAdjuntados,
    total_omitidos: Math.max(totalDetectados - totalAdjuntados, 0),
    total_omitidos_por_limite: Math.max(totalOmitidosPorLimite, 0),
    limite_aplicado: MAX_CERTIFICADOS_ADJUNTOS
  };
}

function buildExperienciaCertificadoObject(row) {
  if (!row?.cert_id) return { existe: false };
  return {
    existe: true,
    estado: row.cert_estado || 'pendiente',
    fecha_emision: row.cert_fecha_emision || null,
    descripcion: row.cert_descripcion || null,
    tipo: 'laboral',
    nombre_original: row.cert_nombre_original || null,
    ruta_archivo: row.cert_ruta_archivo || null
  };
}

function buildFormacionCertificadoObject(row) {
  if (!row?.cert_id) return { existe: false };
  return {
    existe: true,
    estado: row.cert_estado || 'pendiente',
    fecha_emision: row.cert_fecha_emision || null,
    descripcion: row.cert_descripcion || null,
    tipo: 'curso',
    nombre_original: row.cert_nombre_original || null,
    ruta_archivo: row.cert_ruta_archivo || null
  };
}

function buildAnexoMetadataFromExperiencia(row) {
  if (!row?.cert_id || !row?.cert_ruta_archivo) return null;
  return {
    tipo_certificado: 'laboral',
    origen: 'experiencia',
    titulo: row.cargo || 'Experiencia laboral',
    subtitulo: row.empresa_nombre || 'Empresa no especificada',
    nombre_original: row.cert_nombre_original || row.cert_nombre_archivo || null,
    ruta_archivo: row.cert_ruta_archivo,
    tipo_mime: row.cert_tipo_mime || null,
    fecha_emision: row.cert_fecha_emision || null,
    estado: row.cert_estado || 'pendiente',
    descripcion: row.cert_descripcion || null,
    sort_fecha: row.cert_fecha_emision || null,
    sort_created: row.cert_created_at || null
  };
}

function buildAnexoMetadataFromFormacion(row) {
  if (!row?.cert_id || !row?.cert_ruta_archivo) return null;
  const titulo = textOrNull(row.nombre_programa) || textOrNull(row.titulo_obtenido) || 'Formacion externa';
  return {
    tipo_certificado: 'curso',
    origen: 'formacion',
    titulo,
    subtitulo: row.institucion || 'Institucion no especificada',
    nombre_original: row.cert_nombre_original || row.cert_nombre_archivo || null,
    ruta_archivo: row.cert_ruta_archivo,
    tipo_mime: row.cert_tipo_mime || null,
    fecha_emision: row.cert_fecha_emision || null,
    estado: row.cert_estado || 'pendiente',
    descripcion: row.cert_descripcion || null,
    sort_fecha: row.cert_fecha_emision || null,
    sort_created: row.cert_created_at || null
  };
}

// --- Servicio: obtener datos JSON (sin IDs internos) -------------------------

async function obtenerHojaVidaPorEstudianteId(estudianteId, options = {}) {
  const viewerRole = String(options.viewerRole || '').trim().toLowerCase();
  const includeInternal = Boolean(options.includeInternal);
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
      `SELECT email, telefono_celular, telefono_fijo, contacto_emergencia_nombre, contacto_emergencia_telefono
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
        ce.id AS experiencia_id,
        ce.empresa_nombre,
        ce.cargo,
        ce.fecha_inicio,
        ce.fecha_fin,
        ce.actualmente_trabaja,
        ce.tipo_contrato,
        ce.descripcion,
        ec.id AS cert_id,
        ec.nombre_archivo AS cert_nombre_archivo,
        ec.nombre_original AS cert_nombre_original,
        ec.ruta_archivo AS cert_ruta_archivo,
        ec.tipo_mime AS cert_tipo_mime,
        ec.fecha_emision AS cert_fecha_emision,
        ec.descripcion AS cert_descripcion,
        ec.estado AS cert_estado,
        ec.created_at AS cert_created_at
       FROM candidatos_experiencia ce
       LEFT JOIN candidatos_experiencia_certificados ec
         ON ec.experiencia_id = ce.id
        AND ec.candidato_id = ce.candidato_id
        AND ec.deleted_at IS NULL
       WHERE ce.candidato_id = ? AND ce.deleted_at IS NULL
       ORDER BY COALESCE(ce.fecha_fin, CURDATE()) DESC, ce.fecha_inicio DESC, ce.id DESC`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        cf.id AS formacion_id,
        cf.categoria_formacion,
        cf.subtipo_formacion,
        cf.institucion,
        cf.nombre_programa,
        cf.titulo_obtenido,
        cf.fecha_aprobacion,
        cf.fecha_emision,
        cf.fecha_vencimiento,
        cf.activo,
        fc.id AS cert_id,
        fc.nombre_archivo AS cert_nombre_archivo,
        fc.nombre_original AS cert_nombre_original,
        fc.ruta_archivo AS cert_ruta_archivo,
        fc.tipo_mime AS cert_tipo_mime,
        fc.fecha_emision AS cert_fecha_emision,
        fc.descripcion AS cert_descripcion,
        fc.estado AS cert_estado,
        fc.created_at AS cert_created_at
       FROM candidatos_formaciones cf
       LEFT JOIN candidatos_formacion_certificados fc
         ON fc.candidato_formacion_id = cf.id
        AND fc.candidato_id = cf.candidato_id
        AND fc.deleted_at IS NULL
       WHERE cf.candidato_id = ? AND cf.deleted_at IS NULL
       ORDER BY COALESCE(cf.fecha_aprobacion, cf.fecha_emision, cf.fecha_vencimiento) DESC, cf.id DESC`,
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

  let socialConfigRow = null;
  try {
    const [socialRows] = await db.query(
      `SELECT perfil_publico, alias_publico, titular_publico
       FROM candidatos_social_config
       WHERE candidato_id = ?
       LIMIT 1`,
      [estudianteId]
    );
    socialConfigRow = socialRows[0] || null;
  } catch (error) {
    const code = String(error?.code || '');
    const errno = Number(error?.errno || 0);
    const isSchemaDrift = code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE' || errno === 1054 || errno === 1146;
    if (!isSchemaDrift) throw error;
  }

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
  const anexosDetectados = [];
  const experiencias = experienciasRows.map((row) => {
    const certificadoRaw = buildExperienciaCertificadoObject(row);
    const anexo = buildAnexoMetadataFromExperiencia(row);
    if (anexo) anexosDetectados.push(anexo);

    return {
      empresa_nombre: row.empresa_nombre,
      cargo: row.cargo,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      actualmente_trabaja: toBool(row.actualmente_trabaja),
      tipo_contrato: row.tipo_contrato,
      descripcion: row.descripcion,
      certificado: sanitizeCertificadoForViewer(certificadoRaw, viewerRole)
    };
  });
  const formaciones = formacionesRows.map((row) => {
    const certificadoRaw = buildFormacionCertificadoObject(row);
    const anexo = buildAnexoMetadataFromFormacion(row);
    if (anexo) anexosDetectados.push(anexo);

    return {
      categoria_formacion: row.categoria_formacion,
      subtipo_formacion: row.subtipo_formacion,
      institucion: row.institucion,
      nombre_programa: row.nombre_programa,
      titulo_obtenido: row.titulo_obtenido,
      fecha_aprobacion: row.fecha_aprobacion,
      fecha_emision: row.fecha_emision,
      fecha_vencimiento: row.fecha_vencimiento,
      activo: toBool(row.activo),
      certificado: sanitizeCertificadoForViewer(certificadoRaw, viewerRole)
    };
  });

  const anexosAdjuntos = anexosDetectados
    .filter((item) => item?.ruta_archivo)
    .sort(sortAdjuntosDesc)
    .slice(0, MAX_CERTIFICADOS_ADJUNTOS)
    .map((item) => {
      if (viewerRole === 'empresa') {
        const { ruta_archivo, ...rest } = item;
        return rest;
      }
      return item;
    });
  const anexosResumen = buildAnexosSummary(
    anexosDetectados.length,
    anexosAdjuntos.length,
    Math.max(anexosDetectados.length - anexosAdjuntos.length, 0)
  );

  // Construir foto data URL para preview HTML
  const fotoDoc = (documentosRows || []).find((d) => d.tipo_documento === 'foto' && d.ruta_archivo);
  const fotoSrcForPreview = fotoDoc ? resolveFotoSourceForPdf(fotoDoc.ruta_archivo, fotoDoc.tipo_mime) || resolveFotoSource(fotoDoc.ruta_archivo, fotoDoc.tipo_mime) : null;

  // Construir HTML para previsualización
  const perfil = {
    nombres: estudiante.nombres,
    apellidos: estudiante.apellidos,
    nombre_completo: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
    documento_identidad: estudiante.documento_identidad,
    nacionalidad: estudiante.nacionalidad,
    fecha_nacimiento: estudiante.fecha_nacimiento,
    edad: calcularEdad(estudiante.fecha_nacimiento),
    sexo: estudiante.sexo,
    estado_civil: estudiante.estado_civil,
    titular_publico: socialConfigRow?.titular_publico ? String(socialConfigRow.titular_publico).trim() : null
  };

  const previewHtml = buildHtml({
    perfil,
    contacto,
    domicilio,
    salud,
    logistica,
    educacion: educacionGeneral,
    experiencias,
    formaciones,
    fotoSrc: fotoSrcForPreview,
    anexosAdjuntos,
    anexosResumen,
    anexosWarnings: []
  });

  return {
    perfil,
    contacto,
    domicilio,
    salud,
    logistica,
    educacion_general: educacionGeneral,
    experiencia_laboral: experiencias,
    formaciones,
    documentos: documentosRows,
    anexos_certificados_resumen: anexosResumen,
    html: previewHtml,
    ...(includeInternal
      ? {
        _anexos_certificados_adjuntos: anexosDetectados
          .filter((item) => item?.ruta_archivo)
          .sort(sortAdjuntosDesc)
          .slice(0, MAX_CERTIFICADOS_ADJUNTOS)
      }
      : {})
  };
}

// --- HTML del PDF -------------------------------------------------------------

function renderRow(label, value) {
  return `<div class="row"><span class="label">${label}:</span><span class="value">${safe(withNd(value))}</span></div>`;
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
      if (ini && fin) return `${ini} - ${fin}`;
      if (ini) return `Desde ${ini}`;
      return null;
    })();
    const cert = exp.certificado || { existe: false };
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
        <div class="card-detail">
          Certificado laboral: <strong>${cert.existe ? 'Cargado' : 'Pendiente'}</strong>
          ${cert.existe && cert.estado ? ` | Estado: ${safe(formatCertEstado(cert.estado))}` : ''}
          ${cert.existe && cert.fecha_emision ? ` | Emision: ${safe(formatDate(cert.fecha_emision))}` : ''}
        </div>
      </div>`;
  }).join('');
}

function buildFormacionesHtml(formaciones) {
  if (!formaciones.length) return '<p class="empty">Sin formaciones registradas.</p>';
  return formaciones.map((f, idx) => {
    const titulo = textOrNull(f.nombre_programa) || textOrNull(f.titulo_obtenido) || 'Formacion sin nombre';
    const fechaRef = f.fecha_aprobacion || f.fecha_emision;
    const fechaDisplay = formatDateLong(fechaRef);
    const vencimiento = f.fecha_vencimiento ? formatDateLong(f.fecha_vencimiento) : null;
    const cert = f.certificado || { existe: false };
    return `
      <div class="card ${idx > 0 ? 'card-mt' : ''}">
        <div class="card-header">
          <div>
            <div class="card-title">${safe(titulo)}</div>
            <div class="card-sub">${safe(f.institucion || 'Institucion no especificada')}</div>
          </div>
          <div class="card-meta">
            ${fechaDisplay ? `<div class="periodo">${safe(fechaDisplay)}</div>` : ''}
            ${f.categoria_formacion ? renderBadge(f.categoria_formacion) : ''}
            ${f.subtipo_formacion ? renderBadge(f.subtipo_formacion) : ''}
          </div>
        </div>
        ${f.titulo_obtenido && f.titulo_obtenido !== titulo ? `<div class="card-detail">Certificado: ${safe(f.titulo_obtenido)}</div>` : ''}
        ${vencimiento ? `<div class="card-detail text-muted">Valido hasta: ${safe(vencimiento)}</div>` : ''}
        <div class="card-detail">
          Certificado de curso: <strong>${cert.existe ? 'Cargado' : 'Pendiente'}</strong>
          ${cert.existe && cert.estado ? ` | Estado: ${safe(formatCertEstado(cert.estado))}` : ''}
          ${cert.existe && cert.fecha_emision ? ` | Emision: ${safe(formatDate(cert.fecha_emision))}` : ''}
        </div>
      </div>`;
  }).join('');
}

function buildAnexosHtml({ anexosAdjuntos = [], resumen = null, warnings = [] }) {
  const summary = resumen || buildAnexosSummary(anexosAdjuntos.length, anexosAdjuntos.length, 0);
  const warningsList = Array.isArray(warnings) ? warnings.filter(Boolean) : [];

  const rows = anexosAdjuntos.map((item, index) => {
    const fecha = item?.fecha_emision ? formatDate(item.fecha_emision) : 'N/D';
    return `<tr>
      <td>${index + 1}</td>
      <td>${safe(item?.tipo_certificado === 'laboral' ? 'Laboral' : 'Curso')}</td>
      <td>${safe(item?.titulo || 'N/D')}</td>
      <td>${safe(item?.nombre_original || 'N/D')}</td>
      <td>${safe(fecha)}</td>
      <td>${safe(formatCertEstado(item?.estado || 'pendiente'))}</td>
    </tr>`;
  }).join('');

  return `
  <div class="section">
    <div class="section-title">Anexos de Certificados</div>
    <div class="card">
      <div class="card-detail"><strong>Total detectados:</strong> ${safe(summary.total_detectados)}</div>
      <div class="card-detail"><strong>Adjuntados al PDF:</strong> ${safe(summary.total_adjuntados)}</div>
      <div class="card-detail"><strong>Omitidos:</strong> ${safe(summary.total_omitidos)}</div>
      ${summary.total_omitidos_por_limite ? `<div class="card-detail text-muted">(${safe(summary.total_omitidos_por_limite)} omitidos por limite de ${safe(summary.limite_aplicado)})</div>` : ''}
    </div>
    ${rows ? `
      <table class="anexos-table" cellspacing="0" cellpadding="0">
        <thead>
          <tr>
            <th>#</th><th>Tipo</th><th>Referencia</th><th>Archivo</th><th>Emision</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>` : '<p class="empty">No hay certificados para adjuntar.</p>'}
    ${warningsList.length ? `
      <div class="warnings-block">
        <div class="warnings-title">Advertencias de anexos</div>
        <ul>${warningsList.map((msg) => `<li>${safe(msg)}</li>`).join('')}</ul>
      </div>` : ''}
  </div>`;
}

function buildHtml({
  perfil,
  contacto,
  domicilio,
  salud,
  logistica,
  educacion,
  experiencias,
  formaciones,
  fotoSrc,
  anexosAdjuntos = [],
  anexosResumen = null,
  anexosWarnings = []
}) {
  const ubicacion = [domicilio?.canton, domicilio?.provincia, domicilio?.pais].filter(Boolean).join(', ');
  const edad = perfil.edad ? `${perfil.edad} años` : null;
  const perfilProfesional = textOrNull(perfil?.titular_publico);
  const telefonoFijo = textOrNull(contacto?.telefono_fijo);
  const contactoEmergenciaNombre = textOrNull(contacto?.contacto_emergencia_nombre);
  const contactoEmergenciaTelefono = textOrNull(contacto?.contacto_emergencia_telefono);
  const contactoEmergenciaDisplay = contactoEmergenciaTelefono
    ? `${contactoEmergenciaTelefono}${contactoEmergenciaNombre ? ` (${contactoEmergenciaNombre})` : ''}`
    : (contactoEmergenciaNombre ? contactoEmergenciaNombre : null);
  const showContactoEmergenciaInHeader = !telefonoFijo && Boolean(contactoEmergenciaDisplay);

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

    /* -- HEADER -------------------------------- */
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

    /* -- SECCIONES ----------------------------- */
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

    /* -- GRID de datos personales -------------- */
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 20px;
    }
    .row { display: flex; gap: 4px; font-size: 10.5px; }
    .label { color: #555; white-space: nowrap; }
    .value { font-weight: 600; color: #1a1a2e; }

    /* -- CARDS (experiencia / formaciones) ----- */
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

    /* -- BADGES -------------------------------- */
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

    /* -- CHIPS de disponibilidad --------------- */
    .chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip {
      background: #1a1a2e;
      color: #fff;
      font-size: 9.5px;
      padding: 2px 9px;
      border-radius: 12px;
    }

    .anexos-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9.5px;
    }
    .anexos-table th,
    .anexos-table td {
      border: 1px solid #e4e4ea;
      padding: 4px 6px;
      text-align: left;
      vertical-align: top;
    }
    .anexos-table th {
      background: #f3f3f8;
      font-weight: 700;
    }
    .warnings-block {
      margin-top: 8px;
      border: 1px solid #f3c8c8;
      background: #fff5f5;
      padding: 7px;
      border-radius: 4px;
    }
    .warnings-title {
      font-size: 10px;
      font-weight: 700;
      color: #9b1c1c;
      margin-bottom: 4px;
    }
    .warnings-block ul {
      margin-left: 16px;
      color: #7a2020;
      font-size: 9.5px;
    }

    /* -- PIE ----------------------------------- */
    .footer { margin-top: 18px; font-size: 9px; color: #aaa; text-align: right; }
  </style>
</head>
<body>

  <!-- ENCABEZADO -->
  <div class="cv-header">
    <div class="header-info">
      <div class="cv-name">${safe(perfil.nombre_completo)}</div>
      <div class="cv-doc">C.I. / Pasaporte: ${safe(withNd(perfil.documento_identidad))}</div>
      <div class="contact-line">
        <span class="contact-item"><strong>Email:</strong> ${safe(withNd(contacto?.email))}</span>
        <span class="contact-item"><strong>Cel:</strong> ${safe(withNd(contacto?.telefono_celular))}</span>
        ${telefonoFijo ? `<span class="contact-item"><strong>Tel:</strong> ${safe(telefonoFijo)}</span>` : ''}
        ${showContactoEmergenciaInHeader ? `<span class="contact-item"><strong>Contacto emergencia:</strong> ${safe(contactoEmergenciaDisplay)}</span>` : ''}
      </div>
      <div class="ubic">${safe(withNd(ubicacion))}</div>
    </div>
    <div class="photo-box">
      ${fotoSrc ? `<img src="${escapeHtml(fotoSrc)}" alt="Foto"/>` : 'FOTO<br/>CARNET'}
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
      ${renderRow('Tipo de sangre', textOrNull(salud?.tipo_sangre))}
      ${!showContactoEmergenciaInHeader ? renderRow('Contacto emergencia', textOrNull(contacto?.contacto_emergencia_nombre)) : ''}
      ${!showContactoEmergenciaInHeader ? renderRow('Telefono emergencia', textOrNull(contacto?.contacto_emergencia_telefono)) : ''}
    </div>
  </div>

  ${perfilProfesional ? `
  <div class="section">
    <div class="section-title">Perfil Profesional</div>
    <div class="card">
      <p class="card-desc" style="margin-top:0;padding-top:0;border-top:none;">${safe(perfilProfesional)}</p>
    </div>
  </div>` : ''}

  <!-- EDUCACIÓN -->
  <div class="section">
    <div class="section-title">Educacion</div>
    <div class="data-grid">
      ${renderRow('Nivel de estudio', textOrNull(educacion?.nivel_estudio))}
      ${renderRow('Institucion', textOrNull(educacion?.institucion))}
      ${renderRow('Titulo obtenido', textOrNull(educacion?.titulo_obtenido))}
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
      ${logistica?.tipo_vehiculo ? renderRow('Vehiculo propio', textOrNull(logistica.tipo_vehiculo)) : ''}
    </div>
    ${disponibilidades.length ? `
      <div class="chips" style="margin-top:6px;">
        ${disponibilidades.map((d) => `<span class="chip">${safe(d)}</span>`).join('')}
      </div>` : ''}
  </div>` : ''}

  ${buildAnexosHtml({ anexosAdjuntos, resumen: anexosResumen, warnings: anexosWarnings })}

  <div class="footer">Documento generado el ${safe(formatDate(new Date()))}</div>

</body>
</html>`;
}

// --- Servicio: generar PDF ----------------------------------------------------

async function renderHtmlToPdfBuffer(page, html) {
  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
    timeout: HOJA_VIDA_HTML_TIMEOUT_MS
  });
  return page.pdf({ format: 'A4', printBackground: true });
}

async function convertImageFileToPdfBuffer(page, filePath, mimeType) {
  const dataUrl = buildDataUrlFromFile(filePath, mimeType);
  if (!dataUrl) throw new Error('IMAGE_DATA_URL_BUILD_FAILED');

  const html = `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"/>
    <style>
      @page { size: A4; margin: 10mm; }
      body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
    </style>
  </head>
  <body>
    <img src="${escapeHtml(dataUrl)}" alt="Anexo" />
  </body>
  </html>`;

  return renderHtmlToPdfBuffer(page, html);
}

async function mergePdfBuffers(pdfBuffers) {
  const out = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const src = await PDFDocument.load(buffer);
    const copiedPages = await out.copyPages(src, src.getPageIndices());
    copiedPages.forEach((page) => out.addPage(page));
  }

  return out.save();
}

async function buildAttachmentPdfBuffers(page, anexosAdjuntos) {
  const buffers = [];
  const warnings = [];

  for (const item of anexosAdjuntos) {
    const absolutePath = resolveManagedFilePath(item.ruta_archivo);
    const displayName = item.nombre_original || item.ruta_archivo || 'archivo';

    if (!absolutePath) {
      warnings.push(`No se encontro archivo de certificado: ${displayName}.`);
      continue;
    }

    const normalizedMime = normalizeMimeType(item.tipo_mime, absolutePath);
    if (!isSupportedAttachment(normalizedMime, absolutePath)) {
      warnings.push(`Formato no soportado para anexo (${displayName}).`);
      continue;
    }

    try {
      if (normalizedMime === 'application/pdf') {
        buffers.push(fs.readFileSync(absolutePath));
      } else {
        const imagePdfBuffer = await convertImageFileToPdfBuffer(page, absolutePath, normalizedMime);
        buffers.push(imagePdfBuffer);
      }
    } catch (error) {
      warnings.push(`No se pudo adjuntar certificado (${displayName}).`);
      console.error('[hoja_vida_pdf] attachment failed', {
        file: absolutePath,
        message: error?.message || String(error)
      });
    }
  }

  return { buffers, warnings };
}

async function generarHojaVidaPdfPorEstudianteId(estudianteId, options = {}) {
  const hojaVida = await obtenerHojaVidaPorEstudianteId(estudianteId, {
    viewerRole: options.viewerRole || 'candidato',
    includeInternal: true
  });
  if (!hojaVida) return null;

  const { perfil, contacto, domicilio, salud, logistica, documentos } = hojaVida;
  const educacion = hojaVida.educacion_general || {};
  const experiencias = hojaVida.experiencia_laboral || [];
  const formaciones = hojaVida.formaciones || [];
  const anexosAdjuntosTop = Array.isArray(hojaVida._anexos_certificados_adjuntos) ? hojaVida._anexos_certificados_adjuntos : [];

  const fotoDoc = (documentos || []).find((d) => d.tipo_documento === 'foto' && d.ruta_archivo);
  // Para PDF necesitamos base64
  const fotoSrc = fotoDoc ? resolveFotoSourceForPdf(fotoDoc.ruta_archivo, fotoDoc.tipo_mime) : null;

  // -- Puppeteer --
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
  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    const { buffers: attachmentPdfBuffers, warnings: attachmentWarnings } = await buildAttachmentPdfBuffers(page, anexosAdjuntosTop);
    const totalDetectados = Number(hojaVida?.anexos_certificados_resumen?.total_detectados || anexosAdjuntosTop.length);
    const totalOmitidosPorLimite = Number(hojaVida?.anexos_certificados_resumen?.total_omitidos_por_limite || 0);
    const finalResumen = buildAnexosSummary(
      totalDetectados,
      attachmentPdfBuffers.length,
      totalOmitidosPorLimite
    );

    const html = buildHtml({
      perfil,
      contacto,
      domicilio,
      salud,
      logistica,
      educacion,
      experiencias,
      formaciones,
      fotoSrc,
      anexosAdjuntos: anexosAdjuntosTop,
      anexosResumen: finalResumen,
      anexosWarnings: attachmentWarnings
    });

    const basePdfBuffer = await renderHtmlToPdfBuffer(page, html);
    await page.close();

    const mergedPdfBytes = await mergePdfBuffers([basePdfBuffer, ...attachmentPdfBuffers]);
    const buffer = Buffer.from(mergedPdfBytes);

    const safeName = String(perfil.nombre_completo || estudianteId)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 80);

    return {
      buffer,
      fileName: `HojaVida_${safeName || estudianteId}.pdf`
    };
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
}

module.exports = {
  obtenerHojaVidaPorEstudianteId,
  generarHojaVidaPdfPorEstudianteId
};
