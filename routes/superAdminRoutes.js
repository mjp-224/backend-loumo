// const express = require('express');
// const router = express.Router();
// const superAdminController = require('../controllers/superAdminController');
// const jwt = require('jsonwebtoken');
// const pool = require('../config/db'); // Needed for middleware if defined here or imported

// // Middleware Super Admin
// // définissons-le ici ou importons-le s'il est dans un fichier middleware commun.
// // serveur.js avait `verifierSuperAdmin` fonction. Je vais la mettre dans ce fichier pour l'instant ou `middleware/auth.js` ?
// // Mieux dans `middleware/auth.js`. Je vais supposer qu'il y sera (je dois l'ajouter).
// // Pour l'instant, je le mets inline ou j'update `auth.js` après.
// // Je vais le mettre inline ici pour éviter de modifier `auth.js` maintenant et risquer des erreurs.

// const verifierSuperAdmin = async (req, res, next) => {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(401).json({ erreur: 'Token manquant' });

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         if (decoded.type !== 'super_admin') {
//             return res.status(403).json({ erreur: 'Accès refusé. Seuls les super admins peuvent accéder à cette ressource.' });
//         }
//         req.admin = decoded;
//         next();
//     } catch (error) {
//         return res.status(401).json({ erreur: 'Token invalide' });
//     }
// };

// // Auth
// router.post('/login', superAdminController.login);
// router.post('/logout', verifierSuperAdmin, superAdminController.logout);

// // Users
// router.get('/users', verifierSuperAdmin, superAdminController.getUsers);
// router.get('/users/:id', verifierSuperAdmin, superAdminController.getUserDetails);
// router.delete('/users/:id', verifierSuperAdmin, superAdminController.deleteUser);
// router.patch('/users/:id/status', verifierSuperAdmin, superAdminController.toggleUserStatus);

// // Boutiques
// router.get('/boutiques', verifierSuperAdmin, superAdminController.getBoutiques);
// router.delete('/boutiques/:id', verifierSuperAdmin, superAdminController.deleteBoutique);

// // Livreurs
// router.get('/livreurs', verifierSuperAdmin, superAdminController.getLivreurs);

// // Stats
// router.get('/stats/overview', verifierSuperAdmin, superAdminController.getStatsOverview);

// // Signalements
// router.get('/signalements', verifierSuperAdmin, superAdminController.getSignalements);
// router.put('/signalements/:id/resolve', verifierSuperAdmin, superAdminController.resolveSignalement);

// // Logs
// router.get('/logs', verifierSuperAdmin, superAdminController.getLogs);

// module.exports = router;





const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const superAdminController = require('../controllers/superAdminController');

/* =======================
   Middleware Super Admin
======================= */
const verifierSuperAdmin = (req, res, next) => {
   const authHeader = req.headers.authorization;
   if (!authHeader) {
      return res.status(401).json({ erreur: 'Token manquant' });
   }

   const token = authHeader.split(' ')[1];

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'super_admin') {
         return res.status(403).json({
            erreur: 'Accès refusé'
         });
      }

      req.superAdmin = decoded;
      next();
   } catch {
      return res.status(401).json({ erreur: 'Token invalide' });
   }
};

/* =======================
   Authentification
======================= */
router.post('/auth/login', superAdminController.login);
router.post('/auth/logout', verifierSuperAdmin, superAdminController.logout);

/* =======================
   Utilisateurs
======================= */
router.get('/users', verifierSuperAdmin, superAdminController.getUsers);
router.get('/users/:id', verifierSuperAdmin, superAdminController.getUserDetails);
router.patch('/users/:id/status', verifierSuperAdmin, superAdminController.toggleUserStatus);
router.delete('/users/:id', verifierSuperAdmin, superAdminController.deleteUser);

/* =======================
   Boutiques
======================= */
router.get('/boutiques', verifierSuperAdmin, superAdminController.getBoutiques);
router.get('/boutiques/:id', verifierSuperAdmin, superAdminController.getBoutiqueDetails);
router.delete('/boutiques/:id', verifierSuperAdmin, superAdminController.deleteBoutique);

/* =======================
   Livreurs
======================= */
router.get('/livreurs', verifierSuperAdmin, superAdminController.getLivreurs);

/* =======================
   Statistiques
======================= */
router.get('/stats/overview', verifierSuperAdmin, superAdminController.getStatsOverview);

/* =======================
   Signalements
======================= */
router.get('/signalements', verifierSuperAdmin, superAdminController.getSignalements);
router.patch('/signalements/:id/resolve', verifierSuperAdmin, superAdminController.resolveSignalement);

/* =======================
   Logs
======================= */
router.get('/logs', verifierSuperAdmin, superAdminController.getLogs);

/* =======================
   Activités (toutes les apps)
======================= */
router.get('/activities', verifierSuperAdmin, superAdminController.getActivities);

/* =======================
   Notifications
======================= */
router.get('/notifications', verifierSuperAdmin, superAdminController.getNotifications);
router.patch('/notifications/:id/read', verifierSuperAdmin, superAdminController.markAsRead);

module.exports = router;
