const express = require('express');
const router = express.Router({ mergeParams: true });
const livreurController = require('../controllers/livreurController');
const verifierToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Routes mounted at /livreurs via server.js usually, OR /boutiques/:id/livreurs
// Given server.js mounts at '/', full paths should be used if not handled by mount point.
// However, standard practice in this project seems:
// /boutiques/:id/livreurs -> create, list
// /livreurs/:id -> update, delete, get

// Create (POST /boutiques/:id/livreurs)
router.post('/boutiques/:id/livreurs', verifierToken, upload.single('photo'), livreurController.createLivreur);

// List (GET /boutiques/:id/livreurs)
router.get('/boutiques/:id/livreurs', verifierToken, livreurController.getLivreurs);

// Update (PUT /livreurs/:id) - Note: parameter is :livreurId in controller? No, controller uses req.params.id for boutiqueId usually? 
// Check livreurController.updateLivreur: 
// const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
// It seems it expects :id to be boutiqueId??? 
// Wait, updateLivreur lines 95: SELECT ... WHERE id = req.params.id 
// AND line 101: id != req.params.livreurId. 
// So it expects /boutiques/:id/livreurs/:livreurId
router.put('/boutiques/:id/livreurs/:livreurId', verifierToken, upload.single('photo'), livreurController.updateLivreur);

// Delete (DELETE /boutiques/:id/livreurs/:livreurId)
router.delete('/boutiques/:id/livreurs/:livreurId', verifierToken, livreurController.deleteLivreur);

// Profil (GET /livreur/profil) - Mounted at root
router.get('/livreur/profil', verifierToken, livreurController.getProfil);
router.put('/livreur/profil', verifierToken, upload.single('photo'), livreurController.updateProfil);

// Legacy/Direct aliases
// GET /livreur/commandes -> CommandeController.getCommandes (handles livreur type)
const commandeController = require('../controllers/commandeController');
router.get('/livreur/commandes', verifierToken, commandeController.getCommandes);

// GET /livreur/notifications -> NotificationController.getNotifications
const notificationController = require('../controllers/notificationController');
router.get('/livreur/notifications', verifierToken, notificationController.getNotifications);

// Routes directes pour livreurs (sans boutiqueId dans l'URL)
router.put('/livreurs/:livreurId', verifierToken, upload.single('photo'), livreurController.updateLivreurDirect);
router.delete('/livreurs/:livreurId', verifierToken, livreurController.deleteLivreurDirect);

module.exports = router;
