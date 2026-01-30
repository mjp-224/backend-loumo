const express = require('express');
const router = express.Router({ mergeParams: true });
const livreurController = require('../controllers/livreurController');
const { verifierToken } = require('../middleware/auth');

router.post('/', verifierToken, livreurController.creerLivreur);
router.get('/', verifierToken, livreurController.listerLivreurs);
router.put('/:livreurId', verifierToken, livreurController.mettreAJourLivreur);
router.delete('/:livreurId', verifierToken, livreurController.supprimerLivreur);

module.exports = router;