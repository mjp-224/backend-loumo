const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/multer');

router.post('/inscription', upload.single('image'), authController.inscription);
router.post('/connexion', authController.connexion);

module.exports = router;