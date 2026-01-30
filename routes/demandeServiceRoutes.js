const express = require('express');
const router = express.Router();
const demandeServiceController = require('../controllers/demandeServiceController');
const verifierToken = require('../middleware/auth');

router.post('/demandes-services', verifierToken, demandeServiceController.createDemandeService);

module.exports = router;
