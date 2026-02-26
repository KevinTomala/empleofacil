const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { ensureConversationAccess, toPositiveIntOrNull } = require('../services/mensajes.service');

let ioInstance = null;

function extractTokenFromHandshake(socket) {
  const authToken = String(socket?.handshake?.auth?.token || '').trim();
  if (authToken) return authToken;

  const header = String(socket?.handshake?.headers?.authorization || '');
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  return '';
}

function emitSocketError(socket, error, details = undefined) {
  socket.emit('mensajes:error', {
    error,
    ...(details ? { details } : {})
  });
}

function normalizeConversationId(payload = {}) {
  return toPositiveIntOrNull(payload?.conversacion_id);
}

function initSocket(server) {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    }
  });

  ioInstance.use((socket, next) => {
    const token = extractTokenFromHandshake(socket);
    if (!token) {
      const error = new Error('AUTH_REQUIRED');
      error.code = 'AUTH_REQUIRED';
      return next(error);
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = payload;
      return next();
    } catch (_err) {
      const error = new Error('INVALID_TOKEN');
      error.code = 'INVALID_TOKEN';
      return next(error);
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = toPositiveIntOrNull(socket?.data?.user?.id);
    if (!userId) {
      emitSocketError(socket, 'INVALID_USER');
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);

    socket.on('mensajes:join_conversacion', async (payload = {}, ack) => {
      const conversationId = normalizeConversationId(payload);
      if (!conversationId) {
        emitSocketError(socket, 'INVALID_CONVERSACION_ID');
        if (typeof ack === 'function') ack({ ok: false, error: 'INVALID_CONVERSACION_ID' });
        return;
      }

      try {
        await ensureConversationAccess({
          conversationId,
          userId,
          isAdmin: socket?.data?.user?.rol === 'administrador' || socket?.data?.user?.rol === 'superadmin',
          autoJoinAdmin: false
        });

        socket.join(`conversacion:${conversationId}`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) {
        const code = String(error?.code || 'FORBIDDEN');
        emitSocketError(socket, code);
        if (typeof ack === 'function') ack({ ok: false, error: code });
      }
    });

    socket.on('mensajes:leave_conversacion', (payload = {}, ack) => {
      const conversationId = normalizeConversationId(payload);
      if (!conversationId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'INVALID_CONVERSACION_ID' });
        return;
      }

      socket.leave(`conversacion:${conversationId}`);
      if (typeof ack === 'function') ack({ ok: true });
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO
};
