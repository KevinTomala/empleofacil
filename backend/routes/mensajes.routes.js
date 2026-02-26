const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth.middleware');
const {
  listConversationsHandler,
  getConversationHandler,
  listConversationMessagesHandler,
  createConversationHandler,
  sendMessageHandler,
  markReadHandler,
  getUnreadSummaryHandler,
  backfillSeedMessagesHandler
} = require('../controllers/mensajes.controller');

const router = express.Router();

router.get('/resumen', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), getUnreadSummaryHandler);
router.post('/backfill/seed', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), backfillSeedMessagesHandler);
router.get('/conversaciones', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listConversationsHandler);
router.post('/conversaciones', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), createConversationHandler);
router.get('/conversaciones/:conversacionId', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), getConversationHandler);
router.get('/conversaciones/:conversacionId/mensajes', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), listConversationMessagesHandler);
router.post('/conversaciones/:conversacionId/mensajes', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), sendMessageHandler);
router.post('/conversaciones/:conversacionId/leer', authRequired, requireRole(['candidato', 'empresa', 'administrador', 'superadmin']), markReadHandler);

module.exports = router;
