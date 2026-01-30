const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');
const verifierToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Les routes sont montées sur /boutiques/:id/personnel ou /personnel/:id
// Mais attention, dans server.js, c'était:
// app.post('/boutiques/:id/personnel', ...)
// app.get('/boutiques/:id/personnel', ...)
// app.get('/personnel/:id', ...)
// app.put('/personnel/:id', ...)
// app.delete('/personnel/:id', ...)

// Si je monte ce routeur sur /, je dois définir les paths complets.
// OU je monte sur /boutiques pour certaines et /personnel pour d'autres.
// Pour simplicité, je vais définir les routes avec les paths complets ici et monter le routeur sur /
// Ou séparer en 2 fichiers routes ? Non.

// Routes liées aux boutiques
router.post('/boutiques/:id/personnel', verifierToken, upload.single('photo'), personnelController.createPersonnel);
router.get('/boutiques/:id/personnel', verifierToken, personnelController.getPersonnel);

// Routes liées à l'ID du personnel
router.get('/personnel/:id', verifierToken, personnelController.getPersonnelById);
router.put('/personnel/:id', verifierToken, upload.single('photo'), personnelController.updatePersonnel);
router.delete('/personnel/:id', verifierToken, personnelController.deletePersonnel);

module.exports = router;
