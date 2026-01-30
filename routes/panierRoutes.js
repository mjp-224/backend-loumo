const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panierController');
const verifierToken = require('../middleware/auth');

// Prefix: /panier
router.get('/', verifierToken, panierController.getPanier);
router.post('/add', verifierToken, panierController.addToPanier);
router.put('/update', verifierToken, panierController.updateQuantite);
router.delete('/remove/:id', verifierToken, panierController.removeFromPanier);
router.delete('/clear', verifierToken, panierController.clearPanier);

module.exports = router;
