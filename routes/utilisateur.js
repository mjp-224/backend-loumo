const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');
const { verifierToken } = require('../middleware/auth');

router.get('/', verifierToken, utilisateurController.getUtilisateur);

module.exports = router;