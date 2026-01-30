const express = require('express');
const router = express.Router({ mergeParams: true });
const commentaireController = require('../controllers/commentaireController');
const { verifierToken } = require('../middleware/auth');

router.post('/', verifierToken, commentaireController.ajouterCommentaire);

module.exports = router;