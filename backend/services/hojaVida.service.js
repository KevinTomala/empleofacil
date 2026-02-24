const db = require('../db');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function textOrDash(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeReadDir(dir) {
  try {
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch (_err) {
    return [];
  }
}

async function obtenerHojaVidaPorEstudianteId(estudianteId) {
  const [estudianteRows] = await db.query(
    `SELECT
      e.id,
      e.usuario_id,
      e.nombres,
      e.apellidos,
      e.documento_identidad,
      e.nacionalidad,
      e.fecha_nacimiento,
      e.sexo,
      e.estado_civil,
      e.activo,
      e.created_at,
      e.updated_at
    FROM candidatos e
    WHERE e.id = ? AND e.deleted_at IS NULL
    LIMIT 1`,
    [estudianteId]
  );

  if (!estudianteRows.length) {
    return null;
  }

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
      `SELECT
        email, telefono_fijo, telefono_celular, contacto_emergencia_nombre, contacto_emergencia_telefono
      FROM candidatos_contacto
      WHERE candidato_id = ? AND deleted_at IS NULL
      LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        pais, provincia, canton, parroquia, direccion, codigo_postal
      FROM candidatos_domicilio
      WHERE candidato_id = ? AND deleted_at IS NULL
      LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        tipo_sangre, estatura, peso, tatuaje
      FROM candidatos_salud
      WHERE candidato_id = ? AND deleted_at IS NULL
      LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        movilizacion, tipo_vehiculo, licencia, disp_viajar, disp_turnos, disp_fines_semana
      FROM candidatos_logistica
      WHERE candidato_id = ? AND deleted_at IS NULL
      LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        nivel_estudio, institucion, titulo_obtenido
      FROM candidatos_educacion_general
      WHERE candidato_id = ? AND deleted_at IS NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        id, empresa_id, empresa_origen, empresa_origen_id, empresa_nombre, cargo, fecha_inicio, fecha_fin, actualmente_trabaja, tipo_contrato, descripcion
      FROM candidatos_experiencia
      WHERE candidato_id = ? AND deleted_at IS NULL
      ORDER BY COALESCE(fecha_fin, CURDATE()) DESC, fecha_inicio DESC, id DESC`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        id, categoria_formacion, subtipo_formacion, institucion, nombre_programa, titulo_obtenido,
        fecha_emision, fecha_vencimiento, fecha_aprobacion, activo
      FROM candidatos_formaciones
      WHERE candidato_id = ? AND deleted_at IS NULL
      ORDER BY COALESCE(fecha_aprobacion, fecha_emision, fecha_vencimiento) DESC, id DESC`,
      [estudianteId]
    ),
    db.query(
      `SELECT
        id, tipo_documento, nombre_archivo, nombre_original, ruta_archivo, tipo_mime, tamanio_kb,
        fecha_emision, fecha_vencimiento, numero_documento, descripcion, estado, observaciones
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
    ...exp,
    actualmente_trabaja: toBool(exp.actualmente_trabaja)
  }));
  const formaciones = formacionesRows.map((formacion) => ({
    ...formacion,
    activo: toBool(formacion.activo)
  }));

  return {
    perfil: {
      candidato_id: estudiante.id,
      usuario_id: estudiante.usuario_id,
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      nombre_completo: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
      documento_identidad: estudiante.documento_identidad,
      nacionalidad: estudiante.nacionalidad,
      fecha_nacimiento: estudiante.fecha_nacimiento,
      edad: calcularEdad(estudiante.fecha_nacimiento),
      sexo: estudiante.sexo,
      estado_civil: estudiante.estado_civil,
      activo: toBool(estudiante.activo)
    },
    contacto,
    domicilio,
    salud,
    logistica,
    educacion_general: educacionGeneral,
    experiencia_laboral: experiencias,
    formaciones,
    documentos: documentosRows,
    metadata: {
      created_at: estudiante.created_at,
      updated_at: estudiante.updated_at
    }
  };
}

async function generarHojaVidaPdfPorEstudianteId(estudianteId) {
  const hojaVida = await obtenerHojaVidaPorEstudianteId(estudianteId);
  if (!hojaVida) return null;

  const perfil = hojaVida.perfil || {};
  const contacto = hojaVida.contacto || {};
  const domicilio = hojaVida.domicilio || {};
  const salud = hojaVida.salud || {};
  const logistica = hojaVida.logistica || {};
  const educacion = hojaVida.educacion_general || {};
  const experiencias = hojaVida.experiencia_laboral || [];
  const formaciones = hojaVida.formaciones || [];
  const documentos = hojaVida.documentos || [];
  const fotoDoc = documentos.find((doc) => doc.tipo_documento === 'foto' && doc.ruta_archivo);
  const fotoSrc = fotoDoc ? `file://${fotoDoc.ruta_archivo}` : null;

  const experienciaHtml = experiencias.length
    ? experiencias
        .map(
          (exp, idx) => `
          <div class="item">
            <div class="item-title">${idx + 1}. ${escapeHtml(textOrDash(exp.cargo))}</div>
            <div>Empresa: ${escapeHtml(textOrDash(exp.empresa_nombre || exp.empresa_id))}</div>
            <div>Origen empresa: ${escapeHtml(textOrDash(exp.empresa_origen))} | ID origen: ${escapeHtml(textOrDash(exp.empresa_origen_id))}</div>
            <div>Tipo de contrato: ${escapeHtml(textOrDash(exp.tipo_contrato))}</div>
            <div>Periodo: ${escapeHtml(formatDate(exp.fecha_inicio))} - ${escapeHtml(exp.actualmente_trabaja ? 'Actual' : formatDate(exp.fecha_fin))}</div>
            <div>Descripcion: ${escapeHtml(textOrDash(exp.descripcion))}</div>
          </div>
        `
        )
        .join('')
    : '<div>Sin experiencia registrada.</div>';

  const formacionesHtml = formaciones.length
    ? formaciones
        .map(
          (item, idx) => `
          <div class="item">
            <div class="item-title">${idx + 1}. Formacion #${escapeHtml(textOrDash(item.id))}</div>
            <div>Categoria: ${escapeHtml(textOrDash(item.categoria_formacion))} | Subtipo: ${escapeHtml(textOrDash(item.subtipo_formacion))}</div>
            <div>Institucion: ${escapeHtml(textOrDash(item.institucion))} | Programa: ${escapeHtml(textOrDash(item.nombre_programa))}</div>
            <div>Titulo: ${escapeHtml(textOrDash(item.titulo_obtenido))}</div>
            <div>Fechas: Aprobacion ${escapeHtml(formatDate(item.fecha_aprobacion))} | Emision ${escapeHtml(formatDate(item.fecha_emision))} | Vencimiento ${escapeHtml(formatDate(item.fecha_vencimiento))}</div>
          </div>
        `
        )
        .join('')
    : '<div>Sin formaciones registradas.</div>';

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 22mm 14mm; }
          body { font-family: Arial, sans-serif; color: #1f2937; font-size: 12px; }
          header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:16px; }
          .header-main { flex:1; min-width:0; }
          .photo-box {
            width:106px;
            height:132px;
            border:1px solid #c8c8c8;
            border-radius:4px;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#777;
            font-size:10px;
            text-align:center;
            overflow:hidden;
            background:#fafafa;
            flex-shrink:0;
          }
          .photo-box img {
            width:100%;
            height:100%;
            object-fit:cover;
          }
          h1 { margin: 0; font-size: 24px; color: #111827; }
          h2 { margin: 16px 0 8px; font-size: 14px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
          .name { margin-top: 8px; font-size: 18px; font-weight: 700; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
          .item { margin: 0 0 8px; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; }
          .item-title { font-weight: 700; margin-bottom: 2px; }
          .muted { margin-top: 18px; color: #6b7280; font-size: 10px; }
        </style>
      </head>
      <body>
        <header>
          <div class="header-main">
            <h1>Hoja de Vida</h1>
            <div class="name">${escapeHtml(textOrDash(perfil.nombre_completo))}</div>
            <div>Documento: ${escapeHtml(textOrDash(perfil.documento_identidad))}</div>
            <div>Email: ${escapeHtml(textOrDash(contacto.email))}</div>
            <div>Celular: ${escapeHtml(textOrDash(contacto.telefono_celular))}</div>
          </div>
          <div class="photo-box">
            ${
              fotoSrc
                ? `<img src="${escapeHtml(fotoSrc)}" alt="Foto carnet" />`
                : 'FOTO<br/>TAMANO CARNET'
            }
          </div>
        </header>
        <h2>Perfil</h2>
        <div class="grid">
          <div>Nombres: ${escapeHtml(textOrDash(perfil.nombres))}</div>
          <div>Apellidos: ${escapeHtml(textOrDash(perfil.apellidos))}</div>
          <div>Nacionalidad: ${escapeHtml(textOrDash(perfil.nacionalidad))}</div>
          <div>Fecha de nacimiento: ${escapeHtml(formatDate(perfil.fecha_nacimiento))}</div>
          <div>Edad: ${escapeHtml(textOrDash(perfil.edad))}</div>
          <div>Sexo: ${escapeHtml(textOrDash(perfil.sexo))}</div>
          <div>Estado civil: ${escapeHtml(textOrDash(perfil.estado_civil))}</div>
        </div>

        <h2>Contacto y Domicilio</h2>
        <div class="grid">
          <div>Telefono fijo: ${escapeHtml(textOrDash(contacto.telefono_fijo))}</div>
          <div>Emergencia: ${escapeHtml(textOrDash(contacto.contacto_emergencia_nombre))} - ${escapeHtml(textOrDash(contacto.contacto_emergencia_telefono))}</div>
          <div>Pais: ${escapeHtml(textOrDash(domicilio.pais))}</div>
          <div>Provincia: ${escapeHtml(textOrDash(domicilio.provincia))}</div>
          <div>Canton: ${escapeHtml(textOrDash(domicilio.canton))}</div>
          <div>Parroquia: ${escapeHtml(textOrDash(domicilio.parroquia))}</div>
          <div>Direccion: ${escapeHtml(textOrDash(domicilio.direccion))}</div>
          <div>Codigo postal: ${escapeHtml(textOrDash(domicilio.codigo_postal))}</div>
        </div>

        <h2>Salud y Logistica</h2>
        <div class="grid">
          <div>Tipo de sangre: ${escapeHtml(textOrDash(salud.tipo_sangre))}</div>
          <div>Estatura (m): ${escapeHtml(textOrDash(salud.estatura))}</div>
          <div>Peso (kg): ${escapeHtml(textOrDash(salud.peso))}</div>
          <div>Tatuaje: ${escapeHtml(textOrDash(salud.tatuaje))}</div>
          <div>Movilizacion propia: ${escapeHtml(logistica.movilizacion ? 'Si' : 'No')}</div>
          <div>Tipo de vehiculo: ${escapeHtml(textOrDash(logistica.tipo_vehiculo))}</div>
          <div>Licencia: ${escapeHtml(textOrDash(logistica.licencia))}</div>
          <div>Disponible para viajar: ${escapeHtml(logistica.disp_viajar ? 'Si' : 'No')}</div>
          <div>Disponible por turnos: ${escapeHtml(logistica.disp_turnos ? 'Si' : 'No')}</div>
          <div>Disponible fines de semana: ${escapeHtml(logistica.disp_fines_semana ? 'Si' : 'No')}</div>
        </div>

        <h2>Educacion</h2>
        <div class="grid">
          <div>Nivel: ${escapeHtml(textOrDash(educacion.nivel_estudio))}</div>
          <div>Institucion: ${escapeHtml(textOrDash(educacion.institucion))}</div>
          <div>Titulo: ${escapeHtml(textOrDash(educacion.titulo_obtenido))}</div>
        </div>

        <h2>Experiencia Laboral</h2>
        ${experienciaHtml}

        <h2>Formaciones</h2>
        ${formacionesHtml}

        <div class="muted">Generado: ${escapeHtml(formatDate(new Date()))}</div>
      </body>
    </html>
  `;

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
  if (executablePathFinal) {
    launchOptions.executablePath = executablePathFinal;
  }

  console.info('[hoja_vida_pdf] puppeteer diagnostics', {
    estudianteId,
    nodeEnv: process.env.NODE_ENV || null,
    executablePathEnv: executablePathFromEnv,
    executablePathDetected: detectedLinuxPath || null,
    executablePathDefault: defaultExecutablePath,
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
    buffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
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
    if (browser) {
      await browser.close();
    }
  }

  const safeName = textOrDash(perfil.nombre_completo)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 80);

  return {
    buffer,
    fileName: `hoja_vida_${safeName || estudianteId}.pdf`
  };
}

module.exports = {
  obtenerHojaVidaPorEstudianteId,
  generarHojaVidaPdfPorEstudianteId
};
