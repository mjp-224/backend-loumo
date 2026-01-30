const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panierController');
const { verifierToken } = require('../middleware/auth');

router.post('/', verifierToken, panierController.ajouterAuPanier);
router.get('/', verifierToken, panierController.listerPanier);
router.delete('/:id', verifierToken, panierController.supprimerDuPanier);

module.exports = router;