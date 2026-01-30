const express = require('express');
const router = express.Router({ mergeParams: true });
const articleController = require('../controllers/articleController');
const { verifierToken } = require('../middleware/auth');
const upload = require('../middleware/multer');

router.post('/', verifierToken, upload.single('image'), articleController.creerArticle);
router.put('/:articleId', verifierToken, upload.single('image'), articleController.mettreAJourArticle);
router.delete('/:articleId', verifierToken, articleController.supprimerArticle);
router.get('/', articleController.listerArticles);

module.exports = router;