const express = require('express');
const router = express.Router();
const boutiqueController = require('../controllers/boutiqueController');
const { verifierToken } = require('../middleware/auth');
const upload = require('../middleware/multer');

router.post('/', verifierToken, upload.single('image'), boutiqueController.creerBoutique);
router.put('/:id', verifierToken, upload.single('image'), boutiqueController.mettreAJourBoutique);
router.get('/', boutiqueController.listerBoutiques);
router.delete('/:id', verifierToken, boutiqueController.supprimerBoutique);
router.get('/:id', boutiqueController.getBoutique);
router.get('/:id/visiteurs', verifierToken, boutiqueController.getVisiteursBoutique);

module.exports = router;