const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');
const verifierToken = require('../middleware/auth');

// Note: Ces routes seront montées sur '/auth' ou '/', selon configuration serveur
// ou sur '/auth' si on décide de changer (mais attention aux applis mobiles)

// Routes publiques
router.post('/connexion', authController.connexion);
router.post('/connexion/livreur', authController.connexionLivreur);
router.post('/inscription', upload.single('image'), authController.inscription);

// Routes protégées
router.post('/refresh-token', authController.refreshToken);
router.post('/deconnexion', verifierToken, authController.deconnexion);

module.exports = router;
