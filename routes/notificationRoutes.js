const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifierToken = require('../middleware/auth');

router.get('/', verifierToken, notificationController.getNotifications);
router.post('/:id/lu', verifierToken, notificationController.markAsRead);
router.delete('/:id', verifierToken, notificationController.deleteNotification);

module.exports = router;
