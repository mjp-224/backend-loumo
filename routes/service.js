const express = require('express');
const router = express.Router({ mergeParams: true });
const serviceController = require('../controllers/serviceController');
const { verifierToken } = require('../middleware/auth');
const upload = require('../middleware/multer');

router.post('/', verifierToken, upload.single('image'), serviceController.creerService);
router.put('/:serviceId', verifierToken, upload.single('image'), serviceController.mettreAJourService);
router.delete('/:serviceId', verifierToken, serviceController.supprimerService);
router.get('/', serviceController.listerServices);

module.exports = router;