const express = require('express');
const { bootstrap, login, changePassword } = require('../controllers/auth.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/bootstrap', bootstrap);
router.post('/login', login);
router.post('/change-password', authRequired, changePassword);

module.exports = router;
