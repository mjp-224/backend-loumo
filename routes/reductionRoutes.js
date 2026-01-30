const express = require('express');
const router = express.Router();
const reductionController = require('../controllers/reductionController');
const verifierToken = require('../middleware/auth');

router.get('/', verifierToken, reductionController.getReductions);
router.put('/:id', verifierToken, reductionController.updateReduction);

module.exports = router;
