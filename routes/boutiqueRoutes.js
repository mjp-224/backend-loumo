const express = require('express');
const router = express.Router();
const boutiqueController = require('../controllers/boutiqueController');
const articleController = require('../controllers/articleController');
const serviceController = require('../controllers/serviceController');
const livreurController = require('../controllers/livreurController');
const upload = require('../middleware/upload');
const verifierToken = require('../middleware/auth');

// Routes Boutiques
router.get('/', boutiqueController.getAllBoutiques);
router.post('/', verifierToken, upload.single('image'), boutiqueController.createBoutique);
router.get('/:id', boutiqueController.getBoutiqueById);
router.put('/:id', verifierToken, upload.single('image'), boutiqueController.updateBoutique);
router.delete('/:id', verifierToken, boutiqueController.deleteBoutique);

// Statistiques
router.get('/:id/visiteurs', verifierToken, boutiqueController.getVisiteurs);
router.get('/:id/statistiques', verifierToken, boutiqueController.getBoutiqueStats);

// Sous-ressources: Articles
router.get('/:id/articles', articleController.getArticles);
router.get('/:id/articles/:articleId', articleController.getArticleById);
router.post('/:id/articles', verifierToken, upload.single('image'), articleController.createArticle);
router.delete('/:id/articles/:articleId', verifierToken, articleController.deleteArticle);
// router.put('/:id/articles/:articleId', ...) // Pas implémenté car commenté dans source

// Sous-ressources: Services
router.get('/:id/services', serviceController.getServices);
router.get('/:id/services/:serviceId', serviceController.getServiceById);

// Correction immédiate:
router.post('/:id/services', verifierToken, upload.single('image'), serviceController.createService);
router.put('/:id/services/:serviceId', verifierToken, upload.single('image'), serviceController.updateService);
router.delete('/:id/services/:serviceId', verifierToken, serviceController.deleteService);

// Sous-ressources: Livreurs
// router.post('/:id/livreurs', ...) // Pas implémenté car commenté/absent du bloc
router.put('/:id/livreurs/:livreurId', verifierToken, upload.single('photo'), livreurController.updateLivreur);
router.delete('/:id/livreurs/:livreurId', verifierToken, livreurController.deleteLivreur);

const commandeController = require('../controllers/commandeController');
router.post('/:id/commandes', verifierToken, commandeController.createCommande);
router.get('/:id/commandes', verifierToken, commandeController.getCommandesByBoutique);
// Note: Liste des commandes pour le client, c'est dans /commandes

// Sous-ressources: Commentaires
const commentaireController = require('../controllers/commentaireController');
router.get('/:id/commentaires', verifierToken, commentaireController.getCommentaires);
router.post('/:id/commentaires', verifierToken, commentaireController.addCommentaire);
router.put('/:boutiqueId/commentaires/:commentId', verifierToken, commentaireController.updateCommentaire);
router.delete('/:boutiqueId/commentaires/:commentId', verifierToken, commentaireController.deleteCommentaire);


module.exports = router;
