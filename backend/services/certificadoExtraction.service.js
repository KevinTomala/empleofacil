const fs = require('fs');
const db = require('../db');
const { PDFDocument } = require('pdf-lib');

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'por', 'para', 'con', 'sin',
  'certificate', 'certificado', 'curso', 'programa', 'trabajo', 'laboral', 'empresa'
]);

const VALIDATION_ENABLED = String(process.env.CERTIFICADO_VALIDATION_ENABLED || 'true').toLowerCase() !== 'false';
const VALIDATION_DEBUG = String(process.env.CERTIFICADO_VALIDATION_DEBUG || 'true').toLowerCase() !== 'false';
const MIN_EXTRACTED_TEXT_CHARS = Number(process.env.CERTIFICADO_MIN_TEXT_CHARS || 25);
const MIN_CONTEXT_MATCHES = Number(process.env.CERTIFICADO_MIN_CONTEXT_MATCHES || 1);
const MIN_CANDIDATE_MATCHES = Number(process.env.CERTIFICADO_MIN_CANDIDATE_MATCHES || 1);

function logValidationEvent(level, event, payload = {}) {
  if (!VALIDATION_DEBUG) return;
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  logger(`[certificado_validation] ${event}`, payload);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

async function extractPdfText(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  try {
    const parsed = await pdfParse(buffer);
    return String(parsed?.text || '').trim();
  } catch (firstError) {
    // Fallback: reescribe el PDF con pdf-lib para reparar XRef/cross-reference dañada.
    try {
      const repairedDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const repairedBytes = await repairedDoc.save();
      const reparsed = await pdfParse(Buffer.from(repairedBytes));
      return String(reparsed?.text || '').trim();
    } catch (_repairError) {
      throw firstError;
    }
  }
}

async function extractImageText(filePath) {
  const tesseract = require('tesseract.js');
  const result = await tesseract.recognize(filePath, 'spa+eng');
  return String(result?.data?.text || '').trim();
}

async function extractTextByMime(filePath, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'application/pdf') {
    return { text: await extractPdfText(filePath), engine: 'pdf-parse' };
  }
  if (mime.startsWith('image/')) {
    return { text: await extractImageText(filePath), engine: 'tesseract.js' };
  }
  throw new Error('UNSUPPORTED_MIME_FOR_EXTRACTION');
}

function getFileSizeSafe(filePath) {
  try {
    if (!filePath) return null;
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    return Number(stat.size || 0);
  } catch (_error) {
    return null;
  }
}

function countMatches(textNormalized, tokens = []) {
  if (!tokens.length) return { total: 0, matched: [] };
  const matched = [];
  for (const token of tokens) {
    if (textNormalized.includes(token)) matched.push(token);
  }
  return { total: matched.length, matched };
}

async function getCandidateContext(candidatoId) {
  const [rows] = await db.query(
    `SELECT id, nombres, apellidos, documento_identidad
     FROM candidatos
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [candidatoId]
  );
  return rows[0] || null;
}

async function getExperienciaContext(candidatoId, experienciaId) {
  const [rows] = await db.query(
    `SELECT id, empresa_nombre, cargo
     FROM candidatos_experiencia
     WHERE id = ? AND candidato_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [experienciaId, candidatoId]
  );
  return rows[0] || null;
}

async function getFormacionContext(candidatoId, formacionId) {
  const [rows] = await db.query(
    `SELECT id, institucion, nombre_programa, titulo_obtenido
     FROM candidatos_formaciones
     WHERE id = ? AND candidato_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [formacionId, candidatoId]
  );
  return rows[0] || null;
}

function buildValidationResult({ extractedText, candidate, contextTokens, candidateTokens }) {
  const textNormalized = normalizeText(extractedText);
  const docNormalized = normalizeText(candidate?.documento_identidad || '').replace(/\s+/g, '');

  const contextMatches = countMatches(textNormalized, contextTokens);
  const candidateMatches = countMatches(textNormalized, candidateTokens);
  const documentMatch = docNormalized && textNormalized.replace(/\s+/g, '').includes(docNormalized);

  const enoughText = textNormalized.length >= MIN_EXTRACTED_TEXT_CHARS;
  const valid =
    enoughText &&
    contextMatches.total >= MIN_CONTEXT_MATCHES &&
    (documentMatch || candidateMatches.total >= MIN_CANDIDATE_MATCHES);

  return {
    valid,
    enough_text: enoughText,
    text_length: textNormalized.length,
    document_match: Boolean(documentMatch),
    candidate_matches: candidateMatches.total,
    context_matches: contextMatches.total,
    matched_candidate_tokens: candidateMatches.matched,
    matched_context_tokens: contextMatches.matched
  };
}

async function extractAndValidateCertificado({
  candidatoId,
  filePath,
  mimeType,
  tipo,
  referenciaId
}) {
  if (!VALIDATION_ENABLED) {
    logValidationEvent('info', 'skipped_disabled', { candidatoId, tipo, referenciaId });
    return {
      valid: true,
      extracted: { enabled: false }
    };
  }

  const candidate = await getCandidateContext(candidatoId);
  if (!candidate) {
    const err = new Error('CANDIDATO_NOT_FOUND');
    err.code = 'CANDIDATO_NOT_FOUND';
    throw err;
  }

  let context;
  if (tipo === 'experiencia') {
    context = await getExperienciaContext(candidatoId, referenciaId);
    if (!context) {
      const err = new Error('EXPERIENCIA_NOT_FOUND');
      err.code = 'EXPERIENCIA_NOT_FOUND';
      throw err;
    }
  } else {
    context = await getFormacionContext(candidatoId, referenciaId);
    if (!context) {
      const err = new Error('FORMACION_NOT_FOUND');
      err.code = 'FORMACION_NOT_FOUND';
      throw err;
    }
  }

  let extraction;
  try {
    extraction = await extractTextByMime(filePath, mimeType);
  } catch (error) {
    logValidationEvent('warn', 'extraction_failed', {
      candidatoId,
      tipo,
      referenciaId,
      mimeType,
      file_size_bytes: getFileSizeSafe(filePath),
      error_message: error?.message || String(error),
      error_name: error?.name || null
    });
    const err = new Error('CERTIFICADO_TEXT_EXTRACTION_FAILED');
    err.code = 'CERTIFICADO_TEXT_EXTRACTION_FAILED';
    throw err;
  }

  const extractedText = String(extraction?.text || '').trim();
  const candidateTokens = tokenize(`${candidate.nombres || ''} ${candidate.apellidos || ''}`);

  const contextRaw = tipo === 'experiencia'
    ? `${context.empresa_nombre || ''} ${context.cargo || ''}`
    : `${context.institucion || ''} ${context.nombre_programa || ''} ${context.titulo_obtenido || ''}`;
  const contextTokens = tokenize(contextRaw);

  const validation = buildValidationResult({
    extractedText,
    candidate,
    contextTokens,
    candidateTokens
  });

  const extracted = {
    engine: extraction.engine,
    tipo,
    text_preview: extractedText.slice(0, 1000),
    ...validation,
    candidate_context: {
      nombres: candidate.nombres || null,
      apellidos: candidate.apellidos || null,
      documento_identidad: candidate.documento_identidad || null
    },
    reference_context: context
  };

  logValidationEvent('info', 'validation_evaluated', {
    candidatoId,
    tipo,
    referenciaId,
    mimeType,
    engine: extraction.engine,
    text_length: extracted.text_length,
    enough_text: extracted.enough_text,
    context_matches: extracted.context_matches,
    candidate_matches: extracted.candidate_matches,
    document_match: extracted.document_match,
    matched_context_tokens: extracted.matched_context_tokens,
    matched_candidate_tokens: extracted.matched_candidate_tokens,
    thresholds: {
      min_text_chars: MIN_EXTRACTED_TEXT_CHARS,
      min_context_matches: MIN_CONTEXT_MATCHES,
      min_candidate_matches: MIN_CANDIDATE_MATCHES
    }
  });

  if (!validation.valid) {
    logValidationEvent('warn', 'validation_rejected', {
      candidatoId,
      tipo,
      referenciaId,
      text_length: extracted.text_length,
      enough_text: extracted.enough_text,
      context_matches: extracted.context_matches,
      candidate_matches: extracted.candidate_matches,
      document_match: extracted.document_match
    });
    const err = new Error('CERTIFICADO_CONTENT_MISMATCH');
    err.code = 'CERTIFICADO_CONTENT_MISMATCH';
    err.details = extracted;
    throw err;
  }

  logValidationEvent('info', 'validation_accepted', {
    candidatoId,
    tipo,
    referenciaId,
    context_matches: extracted.context_matches,
    candidate_matches: extracted.candidate_matches,
    document_match: extracted.document_match
  });

  return {
    valid: true,
    extracted
  };
}

module.exports = {
  extractAndValidateCertificado
};
