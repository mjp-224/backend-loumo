const pool = require('../config/db');

exports.getNotifications = async (req, res) => {
    const { boutique_id } = req.query;
    const userId = req.utilisateur.id;
    const userType = req.utilisateur.type;

    try {
        let notifications;

        if (userType === 'gerant') {
            let query;
            let params = [userId];

            if (boutique_id && !isNaN(parseInt(boutique_id))) {
                const [boutique] = await pool.execute(
                    'SELECT id, gerant_id FROM boutiques WHERE id = ? AND gerant_id = ?',
                    [parseInt(boutique_id), userId]
                );
                if (!boutique.length) {
                    return res.status(403).json({ erreur: 'Boutique non trouvée ou vous n\'êtes pas autorisé à y accéder' });
                }
                query = `
          SELECT n.*, b.nom AS boutique_nom
          FROM notifications n
          JOIN boutiques b ON n.boutique_id = b.id
          WHERE n.utilisateur_id = ? AND n.boutique_id = ?
          ORDER BY n.date DESC
        `;
                params.push(parseInt(boutique_id));
            } else {
                query = `
          SELECT n.*, b.nom AS boutique_nom
          FROM notifications n
          JOIN boutiques b ON n.boutique_id = b.id
          WHERE n.utilisateur_id = ? AND b.gerant_id = ?
          ORDER BY n.date DESC
        `;
                params.push(userId);
            }

            [notifications] = await pool.execute(query, params);
        } else if (userType === 'client') {
            [notifications] = await pool.execute(
                `SELECT n.*, b.nom AS boutique_nom
         FROM notifications n
         JOIN boutiques b ON n.boutique_id = b.id
         WHERE n.utilisateur_id = ?
         ORDER BY n.date DESC`,
                [userId]
            );
        } else if (userType === 'livreur') {
            [notifications] = await pool.execute(
                `SELECT n.*, b.nom AS boutique_nom
         FROM notifications n
         JOIN boutiques b ON n.boutique_id = b.id
         WHERE n.utilisateur_id = ? AND n.boutique_id = ?
         AND (
             n.message LIKE '%assignée%' 
             OR n.message LIKE '%mission%' 
             OR n.message LIKE '%livré%'
             OR n.message LIKE '%annulée%'
         )
         ORDER BY n.date DESC`,
                [userId, req.utilisateur.boutique_id]
            );
        } else {
            return res.status(403).json({ erreur: 'Accès refusé' });
        }

        res.json(notifications);
    } catch (erreur) {
        console.error('Erreur dans GET /notifications:', erreur);
        res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    const notificationId = parseInt(req.params.id);
    try {
        const [notification] = await pool.execute(
            'SELECT utilisateur_id FROM notifications WHERE id = ?',
            [notificationId]
        );

        if (notification.length === 0) {
            return res.status(404).json({ erreur: 'Notification non trouvée' });
        }

        if (notification[0].utilisateur_id != req.utilisateur.id) {
            return res.status(403).json({ erreur: 'Accès refusé' });
        }

        await pool.execute(
            'UPDATE notifications SET lu = 1 WHERE id = ?',
            [notificationId]
        );

        res.json({ message: 'Notification marquée comme lue' });
    } catch (error) {
        console.error('Erreur mark read:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.deleteNotification = async (req, res) => {
    const notificationId = parseInt(req.params.id);
    try {
        const [notification] = await pool.execute(
            'SELECT utilisateur_id FROM notifications WHERE id = ?',
            [notificationId]
        );

        if (notification.length === 0) {
            return res.status(404).json({ erreur: 'Notification non trouvée' });
        }

        if (notification[0].utilisateur_id != req.utilisateur.id) {
            return res.status(403).json({ erreur: 'Accès refusé' });
        }

        await pool.execute(
            'DELETE FROM notifications WHERE id = ?',
            [notificationId]
        );

        res.json({ message: 'Notification supprimée' });
    } catch (error) {
        console.error('Erreur delete notification:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};
