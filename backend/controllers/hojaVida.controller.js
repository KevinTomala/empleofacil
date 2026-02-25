const {
  obtenerHojaVidaPorEstudianteId,
  generarHojaVidaPdfPorEstudianteId
} = require('../services/hojaVida.service');
const { findCandidatoIdByUserId } = require('../services/perfilCandidato.service');

async function ensureCandidateOwnership(req, res, estudianteId) {
  if (req.user?.rol !== 'candidato') return true;

  const ownCandidatoId = await findCandidatoIdByUserId(req.user?.id);
  if (!ownCandidatoId) {
    res.status(404).json({ error: 'CANDIDATO_NOT_FOUND' });
    return false;
  }
  if (ownCandidatoId !== estudianteId) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return false;
  }
  return true;
}

async function getHojaVida(req, res) {
  const estudianteId = Number(req.params.estudianteId);
  if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
    return res.status(400).json({ error: 'INVALID_ESTUDIANTE_ID' });
  }

  try {
    if (!(await ensureCandidateOwnership(req, res, estudianteId))) return;

    const hojaVida = await obtenerHojaVidaPorEstudianteId(estudianteId, {
      viewerRole: req.user?.rol || ''
    });
    if (!hojaVida) {
      return res.status(404).json({ error: 'ESTUDIANTE_NOT_FOUND' });
    }
    return res.json(hojaVida);
  } catch (error) {
    return res.status(500).json({
      error: 'HOJA_VIDA_FETCH_FAILED',
      details: String(error.message || error)
    });
  }
}

async function getHojaVidaPdf(req, res) {
  const estudianteId = Number(req.params.estudianteId);
  if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
    return res.status(400).json({ error: 'INVALID_ESTUDIANTE_ID' });
  }

  try {
    if (!(await ensureCandidateOwnership(req, res, estudianteId))) return;

    const pdf = await generarHojaVidaPdfPorEstudianteId(estudianteId, {
      viewerRole: req.user?.rol || ''
    });
    if (!pdf) {
      return res.status(404).json({ error: 'ESTUDIANTE_NOT_FOUND' });
    }

    const pdfBuffer = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdf.fileName}"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('[hoja_vida_pdf] request failed', {
      estudianteId,
      message: error?.message || String(error),
      stack: error?.stack || null
    });
    return res.status(500).json({
      error: 'HOJA_VIDA_PDF_FAILED',
      details: String(error.message || error)
    });
  }
}

module.exports = {
  getHojaVida,
  getHojaVidaPdf
};
