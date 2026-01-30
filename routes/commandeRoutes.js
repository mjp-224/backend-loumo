const express = require('express');
const router = express.Router();
const commandeController = require('../controllers/commandeController');
const verifierToken = require('../middleware/auth');

router.get('/', verifierToken, commandeController.getCommandes);
router.get('/:id', verifierToken, commandeController.getCommandeById);
router.post('/', verifierToken, commandeController.createCommande);
router.put('/:id', verifierToken, commandeController.updateStatut);
router.post('/:id/paiement', verifierToken, commandeController.confirmerPaiement);
router.get('/:id/payer', verifierToken, commandeController.payerCommande); // Simplified version
router.post('/:id/reduction', verifierToken, commandeController.demanderReduction);
router.delete('/:id', verifierToken, commandeController.deleteCommande);
router.post('/:id/livrer', verifierToken, commandeController.livrerCommande);
router.post('/:id/assigner', verifierToken, commandeController.assignerCommande);

module.exports = router;
