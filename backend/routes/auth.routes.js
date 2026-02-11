const express = require('express');
const { bootstrap, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/bootstrap', bootstrap);
router.post('/login', login);

module.exports = router;
