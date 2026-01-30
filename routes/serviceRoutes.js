const express = require('express');
const router = express.Router({ mergeParams: true });
const serviceController = require('../controllers/serviceController');
const verifierToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /boutiques/:id/services
router.post('/boutiques/:id/services', verifierToken, upload.single('image'), serviceController.createService);

// PUT /boutiques/:id/services/:serviceId
router.put('/boutiques/:id/services/:serviceId', verifierToken, upload.single('image'), serviceController.updateService);

// DELETE /boutiques/:id/services/:serviceId
router.delete('/boutiques/:id/services/:serviceId', verifierToken, serviceController.deleteService);

// GET /services/:id
router.get('/services/:id', serviceController.getServiceById);

module.exports = router;
