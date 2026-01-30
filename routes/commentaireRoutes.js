const express = require('express');
const router = express.Router();
const commentaireController = require('../controllers/commentaireController');
const verifierToken = require('../middleware/auth');

// POST /boutiques/:id/commentaires (Correct logic: comment is often posted to a boutique context or generic?)
// Controller addCommentaire expects req.params.id as boutique ID.
// So route should be /boutiques/:id/commentaires
router.post('/boutiques/:id/commentaires', verifierToken, commentaireController.addCommentaire);

// PUT /commentaires/:id
router.put('/commentaires/:id', verifierToken, commentaireController.updateCommentaire);

// DELETE /commentaires/:id
router.delete('/commentaires/:id', verifierToken, commentaireController.deleteCommentaire);

// GET /boutiques/:id/commentaires (List)
router.get('/boutiques/:id/commentaires', commentaireController.getCommentaires);

module.exports = router;
