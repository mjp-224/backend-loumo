const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');
const verifierToken = require('../middleware/auth');

const upload = require('../middleware/upload');

router.get('/', verifierToken, utilisateurController.getProfil);
router.put('/', verifierToken, upload.single('image'), utilisateurController.updateProfil);


module.exports = router;
