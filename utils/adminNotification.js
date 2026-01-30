const pool = require('../config/db');

/**
 * Envoie une notification à tous les administrateurs actifs
 * @param {string} message - Le message de la notification
 * @param {string} type - Le type ('commande', 'livraison', 'reduction', 'info', 'alerte')
 * @param {object} details - Détails additionnels (ex: { commande_id: 123, boutique_id: 456 })
 */
exports.notifyAdmins = async (message, type = 'info', details = null) => {
    try {
        // 1. Récupérer les admins actifs
        const [admins] = await pool.execute('SELECT id FROM super_admins WHERE actif = 1');

        if (admins.length === 0) return;

        const detailsJson = details ? JSON.stringify(details) : null;

        // 2. Insérer une notification pour chaque admin
        const promises = admins.map(admin => {
            return pool.execute(
                `INSERT INTO admin_notifications (admin_id, message, type, details, date, lu)
                 VALUES (?, ?, ?, ?, NOW(), 0)`,
                [admin.id, message, type, detailsJson]
            );
        });

        await Promise.all(promises);
        // console.log(`[AdminNotif] Envoyée à ${admins.length} admins: ${message}`);

    } catch (error) {
        console.error('Erreur notifyAdmins:', error);
    }
};
