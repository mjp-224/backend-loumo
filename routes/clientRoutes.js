const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const verifierToken = require('../middleware/auth');

// Prefix: /
// Some routes are root level in serveur.js, some are nested. 
// I will group them here but server.js needs to mount them correctly.
// For example, if I mount this router at '/', then I can define full paths if needed,
// OR ideally mount at '/client' but existing frontend uses paths like '/commandes/depenses'.

// Route: /historique_visites
router.get('/historique_visites', verifierToken, clientController.getHistoriqueVisites);

// Route: /depenses (Simple total)
router.get('/depenses', verifierToken, clientController.getDepenses);

// Route: /commandes/historique
router.get('/commandes/historique', verifierToken, clientController.getHistoriqueCommandes);

// Route: /commandes/depenses (Simple total v2)
router.get('/commandes/depenses', verifierToken, clientController.getDepensesSimple);

// Route: /commandes/depenses/detail
router.get('/commandes/depenses/detail', verifierToken, clientController.getDepensesDetail);

// Route: /statistiques/navigation
router.get('/statistiques/navigation', verifierToken, clientController.getStatistiquesNavigation);

// Route: /visites
router.post('/visites', verifierToken, clientController.recordVisite);

// Route: /clients/depenses (Dashboard Advanced)
router.get('/clients/depenses', verifierToken, clientController.getClientDepenses);

// Route: /client/profil (Alias)
// Note: UtilisateurRoutes uses /utilisateur, but app calls /client/profil.
// Ideally should be handled by clientRoutes mounting, but aliases are safer.
const utilisateurController = require('../controllers/utilisateurController');
router.get('/client/profil', verifierToken, utilisateurController.getProfil);
router.put('/client/profil', verifierToken, utilisateurController.updateProfil);


module.exports = router;
