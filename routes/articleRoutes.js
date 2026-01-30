const express = require('express');
const router = express.Router({ mergeParams: true });
const articleController = require('../controllers/articleController');
const verifierToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Routes
// POST /boutiques/:id/articles
router.post('/boutiques/:id/articles', verifierToken, upload.single('image'), articleController.createArticle);

// PUT /boutiques/:id/articles/:articleId
router.put('/boutiques/:id/articles/:articleId', verifierToken, upload.single('image'), articleController.updateArticle);

// DELETE /boutiques/:id/articles/:articleId
router.delete('/boutiques/:id/articles/:articleId', verifierToken, articleController.deleteArticle);

// GET /articles/:id (Public?)
router.get('/articles/:id', articleController.getArticleById);

module.exports = router;
