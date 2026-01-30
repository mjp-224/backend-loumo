const express = require('express');
const router = express.Router();
const historiqueController = require('../controllers/historiqueController');
const { verifierToken } = require('../middleware/auth');

router.get('/historique_visites', verifierToken, historiqueController.listerHistoriqueVisites);
router.get('/depenses', verifierToken, historiqueController.getDepenses);

module.exports = router;