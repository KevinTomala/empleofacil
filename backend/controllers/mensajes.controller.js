const {
  toPositiveIntOrNull,
  createOrGetVacanteConversation,
  createOrGetDirectConversation,
  listConversationsForUser,
  getConversationListItemForUser,
  getConversationByIdForUser,
  listMessagesByConversation,
  sendMessageToConversation,
  markConversationRead,
  getUnreadSummaryByUser,
  backfillVacanteSeedMessagesForUser
} = require('../services/mensajes.service');
const { findCandidatoIdByUserId } = require('../services/postulaciones.service');
const { getIO } = require('../realtime/socket');

function mapMensajesError(error) {
  const code = String(error?.code || '');

  if (code === 'INVALID_PAYLOAD' || code === 'INVALID_IDS' || code === 'INVALID_TARGET') {
    return { status: 400, error: code || 'INVALID_PAYLOAD' };
  }
  if (code === 'MESSAGE_EMPTY' || code === 'MESSAGE_TOO_LONG') {
    return { status: 400, error: code };
  }
  if (code === 'VACANTE_NOT_FOUND' || code === 'CANDIDATO_NOT_FOUND' || code === 'CONVERSACION_NOT_FOUND' || code === 'MESSAGE_NOT_FOUND') {
    return { status: 404, error: code };
  }
  if (code === 'FORBIDDEN') return { status: 403, error: code };
  if (code === 'POSTULACION_REQUIRED' || code === 'CANDIDATO_USER_NOT_FOUND') return { status: 409, error: code };

  return { status: 500, error: 'MESSAGES_FAILED' };
}

async function emitConversationSummaryByUser(io, conversationId, userId) {
  const summary = await getConversationListItemForUser({ conversationId, userId });
  if (summary) {
    io.to(`user:${userId}`).emit('mensajes:conversacion_actualizada', {
      conversacion: summary
    });
  }

  const unreadSummary = await getUnreadSummaryByUser({ userId });
  io.to(`user:${userId}`).emit('mensajes:unread_resumen', unreadSummary);
}

async function listConversationsHandler(req, res) {
  try {
    await backfillVacanteSeedMessagesForUser({
      userId: req.user?.id,
      userRole: req.user?.rol,
      includeAll: false
    });

    const result = await listConversationsForUser({
      userId: req.user?.id,
      page: req.query.page,
      pageSize: req.query.page_size,
      q: req.query.q,
      tipo: req.query.tipo
    });
    return res.json(result);
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function backfillSeedMessagesHandler(req, res) {
  try {
    const includeAll = (req.user?.rol === 'administrador' || req.user?.rol === 'superadmin')
      && String(req.body?.scope || '').trim().toLowerCase() === 'all';

    const result = await backfillVacanteSeedMessagesForUser({
      userId: req.user?.id,
      userRole: req.user?.rol,
      includeAll
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function getConversationHandler(req, res) {
  const conversacionId = toPositiveIntOrNull(req.params.conversacionId);
  if (!conversacionId) return res.status(400).json({ error: 'INVALID_CONVERSACION_ID' });

  try {
    const conversacion = await getConversationByIdForUser({
      conversationId: conversacionId,
      userId: req.user?.id,
      isAdmin: req.user?.rol === 'administrador' || req.user?.rol === 'superadmin'
    });
    return res.json({ conversacion });
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function listConversationMessagesHandler(req, res) {
  const conversacionId = toPositiveIntOrNull(req.params.conversacionId);
  if (!conversacionId) return res.status(400).json({ error: 'INVALID_CONVERSACION_ID' });

  try {
    const result = await listMessagesByConversation({
      conversationId: conversacionId,
      userId: req.user?.id,
      isAdmin: req.user?.rol === 'administrador' || req.user?.rol === 'superadmin',
      page: req.query.page,
      pageSize: req.query.page_size
    });
    return res.json(result);
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function createConversationHandler(req, res) {
  const tipo = String(req.body?.tipo || 'vacante').trim().toLowerCase();

  try {
    if (tipo === 'directa') {
      const targetUserId = toPositiveIntOrNull(req.body?.usuario_objetivo_id);
      if (!targetUserId) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

      const conversacion = await createOrGetDirectConversation({
        actorUserId: req.user?.id,
        actorRole: req.user?.rol,
        targetUserId
      });
      return res.status(201).json({ ok: true, conversacion });
    }

    const vacanteId = toPositiveIntOrNull(req.body?.vacante_id);
    if (!vacanteId) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

    let candidatoId = toPositiveIntOrNull(req.body?.candidato_id);
    if (!candidatoId && req.user?.rol === 'candidato') {
      candidatoId = await findCandidatoIdByUserId(req.user?.id);
    }
    if (!candidatoId) return res.status(400).json({ error: 'CANDIDATO_ID_REQUIRED' });

    const conversacion = await createOrGetVacanteConversation({
      actorUserId: req.user?.id,
      actorRole: req.user?.rol,
      vacanteId,
      candidatoId
    });

    return res.status(201).json({ ok: true, conversacion });
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function sendMessageHandler(req, res) {
  const conversacionId = toPositiveIntOrNull(req.params.conversacionId);
  if (!conversacionId) return res.status(400).json({ error: 'INVALID_CONVERSACION_ID' });

  try {
    const mensaje = await sendMessageToConversation({
      conversationId: conversacionId,
      userId: req.user?.id,
      userRole: req.user?.rol,
      body: req.body?.cuerpo
    });

    const io = getIO();
    if (io && mensaje) {
      io.to(`conversacion:${conversacionId}`).emit('mensajes:new', { mensaje });

      const detail = await getConversationByIdForUser({
        conversationId: conversacionId,
        userId: req.user?.id,
        isAdmin: req.user?.rol === 'administrador' || req.user?.rol === 'superadmin'
      });

      const participantIds = Array.from(
        new Set(
          (Array.isArray(detail?.participantes) ? detail.participantes : [])
            .map((item) => Number(item?.usuario_id || 0))
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      );

      await Promise.all(participantIds.map((userId) => emitConversationSummaryByUser(io, conversacionId, userId)));
    }

    return res.status(201).json({ ok: true, mensaje });
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function markReadHandler(req, res) {
  const conversacionId = toPositiveIntOrNull(req.params.conversacionId);
  if (!conversacionId) return res.status(400).json({ error: 'INVALID_CONVERSACION_ID' });

  try {
    const result = await markConversationRead({
      conversationId: conversacionId,
      userId: req.user?.id,
      userRole: req.user?.rol,
      messageId: req.body?.mensaje_id
    });

    const io = getIO();
    if (io) {
      io.to(`conversacion:${conversacionId}`).emit('mensajes:read', {
        conversacion_id: conversacionId,
        usuario_id: Number(req.user?.id || 0),
        ultimo_leido_mensaje_id: Number(result?.ultimo_leido_mensaje_id || 0) || null
      });

      const unreadSummary = await getUnreadSummaryByUser({ userId: req.user?.id });
      io.to(`user:${req.user?.id}`).emit('mensajes:unread_resumen', unreadSummary);
    }

    return res.json(result);
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

async function getUnreadSummaryHandler(req, res) {
  try {
    const resumen = await getUnreadSummaryByUser({ userId: req.user?.id });
    return res.json(resumen);
  } catch (error) {
    const mapped = mapMensajesError(error);
    return res.status(mapped.status).json({
      error: mapped.error,
      details: mapped.status >= 500 ? String(error.message || error) : undefined
    });
  }
}

module.exports = {
  listConversationsHandler,
  getConversationHandler,
  listConversationMessagesHandler,
  createConversationHandler,
  sendMessageHandler,
  markReadHandler,
  getUnreadSummaryHandler,
  backfillSeedMessagesHandler
};
