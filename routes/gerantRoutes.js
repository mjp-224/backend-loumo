const express = require('express');
const router = express.Router();
const boutiqueController = require('../controllers/boutiqueController');
const verifierToken = require('../middleware/auth');

const commandeController = require('../controllers/commandeController');
router.get('/commandes', verifierToken, commandeController.getCommandes);
router.get('/boutiques', verifierToken, boutiqueController.getMesBoutiques);

module.exports = router;
