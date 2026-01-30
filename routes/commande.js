const express = require('express');
const router = express.Router({ mergeParams: true });
const commandeController = require('../controllers/commandeController');
const { verifierToken } = require('../middleware/auth');

router.post('/', verifierToken, commandeController.creerCommande);
router.get('/', verifierToken, commandeController.listerCommandes);
router.put('/:id', verifierToken, commandeController.mettreAJourCommande);
router.delete('/:id', verifierToken, commandeController.supprimerCommande);
router.get('/:id/payer', verifierToken, commandeController.payerCommande);

module.exports = router;