const express = require('express');
const router = express.Router();
const reductionController = require('../controllers/reductionController');
const { verifierToken } = require('../middleware/auth');

router.post('/commandes/:id/reduction', verifierToken, reductionController.demanderReduction);
router.get('/', verifierToken, reductionController.listerReductions);
router.put('/:id', verifierToken, reductionController.mettreAJourReduction);

module.exports = router;