const {
  obtenerHojaVidaPorEstudianteId,
  generarHojaVidaPdfPorEstudianteId
} = require('../services/hojaVida.service');

async function getHojaVida(req, res) {
  const estudianteId = Number(req.params.estudianteId);
  if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
    return res.status(400).json({ error: 'INVALID_ESTUDIANTE_ID' });
  }

  try {
    const hojaVida = await obtenerHojaVidaPorEstudianteId(estudianteId);
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
    const pdf = await generarHojaVidaPdfPorEstudianteId(estudianteId);
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
