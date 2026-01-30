const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

async function logAction(adminId, actionType, resourceType, resourceId, description, ipAddress) {
    try {
        await pool.execute(
            `INSERT INTO system_logs (admin_id, action_type, resource_type, resource_id, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [adminId, actionType, resourceType, resourceId, description, ipAddress]
        );
    } catch (error) {
        console.error('Erreur lors du logging:', error);
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ erreur: 'Email et mot de passe requis' });

        const [admins] = await pool.execute('SELECT * FROM super_admins WHERE email = ? AND actif = TRUE', [email]);
        if (!admins.length) return res.status(401).json({ erreur: 'Identifiants invalides' });

        const admin = admins[0];
        const motDePasseValide = await bcrypt.compare(password, admin.mot_de_passe);
        if (!motDePasseValide) return res.status(401).json({ erreur: 'Identifiants invalides' });

        await pool.execute('UPDATE super_admins SET last_login = NOW() WHERE id = ?', [admin.id]);

        const token = jwt.sign(
            { id: admin.id, email: admin.email, type: 'super_admin', role: admin.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(admin.id, 'LOGIN', 'AUTRE', null, `Connexion super admin: ${admin.email}`, ipAddress);

        res.json({
            token,
            admin: {
                id: admin.id,
                nom: admin.nom,
                prenom: admin.prenom,
                email: admin.email,
                role: admin.role,
                photo: admin.photo
            }
        });
    } catch (error) {
        console.error('Erreur login super admin:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.logout = async (req, res) => {
    try {
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.superAdmin.id, 'LOGOUT', 'AUTRE', null, 'Déconnexion super admin', ipAddress);
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        console.error('Erreur logout:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 25, type, search } = req.query;
        const offset = (page - 1) * limit;

        // On construit une requête UNION pour récupérer clients et gérants
        let baseQuery = '';
        const params = [];
        const countParams = [];

        if (!type || type === 'client') {
            baseQuery += `
                SELECT id, nom, prenom, telephone, email, image, 'client' as type, date_inscription, date_naissance, 1 as actif, CONCAT('client_', id) as unique_key
                FROM clients
                WHERE 1=1
            `;
            if (search) {
                baseQuery += ` AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)`;
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }

        if (!type || type === 'gerant') {
            if (baseQuery) baseQuery += ' UNION ALL ';
            baseQuery += `
                SELECT id, nom, prenom, telephone, email, image, 'gerant' as type, date_inscription, date_naissance, 1 as actif, CONCAT('gerant_', id) as unique_key
                FROM gerants
                WHERE 1=1
            `;
            if (search) {
                baseQuery += ` AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)`;
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }

        if (!type || type === 'livreur') {
            if (baseQuery) baseQuery += ' UNION ALL ';
            baseQuery += `
                SELECT id, nom, prenom, telephone, email, photo as image, 'livreur' as type, date_creation as date_inscription, NULL as date_naissance, actif, CONCAT('livreur_', id) as unique_key
                FROM livreurs
                WHERE 1=1
            `;
            if (search) {
                baseQuery += ` AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)`;
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }

        // Wrap in subquery for ordering and pagination
        const query = `SELECT * FROM (${baseQuery}) as users ORDER BY date_inscription DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [users] = await pool.execute(query, params);

        // Count query
        let countQuery = '';
        if (!type || type === 'client') {
            countQuery += 'SELECT COUNT(*) as c FROM clients';
            if (search) {
                countQuery += ` WHERE (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)`;
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }
        if (!type || type === 'gerant') {
            if (countQuery) countQuery += ' UNION ALL ';
            countQuery += 'SELECT COUNT(*) as c FROM gerants';
            if (search) {
                countQuery += ` WHERE (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)`;
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }
        if (!type || type === 'livreur') {
            if (countQuery) countQuery += ' UNION ALL ';
            countQuery += 'SELECT COUNT(*) as c FROM livreurs';
            if (search) {
                countQuery += ` WHERE (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)`;
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }

        const [countResult] = await pool.execute(`SELECT SUM(c) as total FROM (${countQuery}) as counts`, countParams);
        const total = countResult[0].total || 0;

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur liste users:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { type } = req.query; // 'client', 'gerant', 'livreur'

        if (!type || !['client', 'gerant', 'livreur'].includes(type)) {
            return res.status(400).json({ erreur: 'Type utilisateur requis (client, gerant, livreur)' });
        }

        let user = null;
        let boutiques = [];
        let commandes = [];
        let livraisons = [];

        if (type === 'client') {
            const [users] = await pool.execute('SELECT id, nom, prenom, telephone, email, image, date_inscription, date_naissance FROM clients WHERE id = ?', [userId]);
            if (!users.length) return res.status(404).json({ erreur: 'Client non trouvé' });
            user = { ...users[0], type: 'client' };
            [commandes] = await pool.execute('SELECT id, statut, prix, date_creation FROM commandes WHERE utilisateur_id = ? ORDER BY date_creation DESC LIMIT 10', [userId]);
        } else if (type === 'gerant') {
            const [users] = await pool.execute('SELECT id, nom, prenom, telephone, email, image, date_inscription, date_naissance FROM gerants WHERE id = ?', [userId]);
            if (!users.length) return res.status(404).json({ erreur: 'Gérant non trouvé' });
            user = { ...users[0], type: 'gerant' };
            [boutiques] = await pool.execute('SELECT id, nom, categorie, adresse, image FROM boutiques WHERE gerant_id = ?', [userId]);
        } else if (type === 'livreur') {
            const [users] = await pool.execute('SELECT id, nom, prenom, telephone, email, photo as image, actif, date_creation as date_inscription FROM livreurs WHERE id = ?', [userId]);
            if (!users.length) return res.status(404).json({ erreur: 'Livreur non trouvé' });
            user = { ...users[0], type: 'livreur' };
            [livraisons] = await pool.execute('SELECT id, statut, prix, date_creation FROM commandes WHERE livreur_id = ? ORDER BY date_creation DESC LIMIT 10', [userId]);
        }

        res.json({ user, boutiques, commandes, livraisons });
    } catch (error) {
        console.error('Erreur détails user:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { type } = req.query; // 'client', 'gerant', 'livreur'

        if (!type || !['client', 'gerant', 'livreur'].includes(type)) {
            return res.status(400).json({ erreur: 'Type utilisateur requis (client, gerant, livreur)' });
        }

        const table = type === 'client' ? 'clients' : (type === 'gerant' ? 'gerants' : 'livreurs');
        const [users] = await pool.execute(`SELECT id, nom, prenom, email FROM ${table} WHERE id = ?`, [userId]);
        if (!users.length) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });

        await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [userId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.superAdmin.id, 'DELETE', 'UTILISATEUR', userId, `Suppression ${type}: ${users[0].nom} ${users[0].prenom} (${users[0].email})`, ipAddress);

        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression user:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.getBoutiques = async (req, res) => {
    try {
        const { page = 1, limit = 25, categorie, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT b.*, g.nom as gerant_nom, g.prenom as gerant_prenom, g.email as gerant_email
      FROM boutiques b
      LEFT JOIN gerants g ON b.gerant_id = g.id
      WHERE 1=1
    `;
        const params = [];
        if (categorie) { query += ' AND b.categorie = ?'; params.push(categorie); }
        if (search) {
            query += ' AND (b.nom LIKE ? OR b.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }
        query += ' ORDER BY b.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [boutiques] = await pool.execute(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM boutiques b WHERE 1=1';
        const countParams = [];
        if (categorie) { countQuery += ' AND b.categorie = ?'; countParams.push(categorie); }
        if (search) {
            countQuery += ' AND (b.nom LIKE ? OR b.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm);
        }
        const [countResult] = await pool.execute(countQuery, countParams);

        res.json({
            boutiques,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur liste boutiques:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.deleteBoutique = async (req, res) => {
    try {
        const boutiqueId = parseInt(req.params.id);
        const [boutiques] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [boutiqueId]);
        if (!boutiques.length) return res.status(404).json({ erreur: 'Boutique non trouvée' });

        await pool.execute('DELETE FROM boutiques WHERE id = ?', [boutiqueId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.superAdmin.id, 'DELETE', 'BOUTIQUE', boutiqueId, `Suppression boutique: ${boutiques[0].nom}`, ipAddress);

        res.json({ message: 'Boutique supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression boutique:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.getBoutiqueDetails = async (req, res) => {
    try {
        const boutiqueId = parseInt(req.params.id);

        // Récupérer la boutique avec info gérant
        const [boutiques] = await pool.execute(`
            SELECT b.*, g.nom as gerant_nom, g.prenom as gerant_prenom, g.email as gerant_email, g.telephone as gerant_telephone
            FROM boutiques b
            LEFT JOIN gerants g ON b.gerant_id = g.id
            WHERE b.id = ?
        `, [boutiqueId]);

        if (!boutiques.length) {
            return res.status(404).json({ erreur: 'Boutique non trouvée' });
        }

        const boutique = boutiques[0];

        // Récupérer les produits de la boutique (requête simplifiée)
        let produits = [];
        try {
            const [prodResult] = await pool.execute(`
                SELECT * FROM produits WHERE boutique_id = ? ORDER BY id DESC LIMIT 20
            `, [boutiqueId]);
            produits = prodResult;
        } catch (e) {
            console.log('Pas de table produits ou erreur:', e.message);
        }

        // Récupérer les commandes liées à la boutique (requête simplifiée)
        let commandes = [];
        try {
            const [cmdResult] = await pool.execute(`
                SELECT c.*, cl.prenom as client_prenom, cl.nom as client_nom
                FROM commandes c
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE c.boutique_id = ?
                ORDER BY c.id DESC
                LIMIT 10
            `, [boutiqueId]);
            commandes = cmdResult;
        } catch (e) {
            console.log('Pas de commandes ou erreur:', e.message);
        }

        // Récupérer les livreurs de la boutique
        let livreurs = [];
        try {
            const [livResult] = await pool.execute(`
                SELECT id, nom, prenom, email, telephone, actif FROM livreurs WHERE boutique_id = ?
            `, [boutiqueId]);
            livreurs = livResult;
        } catch (e) {
            console.log('Pas de livreurs ou erreur:', e.message);
        }

        // Stats
        let total_commandes = 0, ca_total = 0;
        try {
            const [statsCmd] = await pool.execute(`
                SELECT COUNT(*) as total_commandes, COALESCE(SUM(total), 0) as ca_total
                FROM commandes WHERE boutique_id = ?
            `, [boutiqueId]);
            total_commandes = statsCmd[0]?.total_commandes || 0;
            ca_total = statsCmd[0]?.ca_total || 0;
        } catch (e) {
            console.log('Erreur stats:', e.message);
        }

        res.json({
            boutique,
            produits,
            commandes,
            livreurs,
            stats: {
                total_commandes,
                ca_total,
                total_produits: produits.length,
                total_livreurs: livreurs.length
            }
        });
    } catch (error) {
        console.error('Erreur détails boutique:', error);
        res.status(500).json({ erreur: 'Erreur serveur: ' + error.message });
    }
};

exports.getStatsOverview = async (req, res) => {
    try {
        // Compter les utilisateurs par type depuis les vraies tables
        const [clientsCount] = await pool.execute('SELECT COUNT(*) as count FROM clients');
        const [gerantsCount] = await pool.execute('SELECT COUNT(*) as count FROM gerants');
        const [livreursCount] = await pool.execute('SELECT COUNT(*) as count FROM livreurs');
        const [livreursActifsCount] = await pool.execute('SELECT COUNT(*) as count FROM livreurs WHERE actif = TRUE');

        const totalUsers = {
            client: clientsCount[0].count,
            gerant: gerantsCount[0].count,
            livreur: livreursCount[0].count,
            livreursActifs: livreursActifsCount[0].count
        };

        const [boutiquesCount] = await pool.execute('SELECT COUNT(*) as total FROM boutiques');
        const [commandesCount] = await pool.execute('SELECT COUNT(*) as total, SUM(prix) as revenue FROM commandes');
        const [commandesEnCours] = await pool.execute(`SELECT COUNT(*) as count FROM commandes WHERE statut IN ('en attente', 'acceptée', 'en préparation', 'en cours de livraison')`);
        const [commandesLivrees] = await pool.execute(`SELECT COUNT(*) as count FROM commandes WHERE statut = 'livrée'`);
        const [revenueMonth] = await pool.execute(`SELECT SUM(prix) as total FROM commandes WHERE MONTH(date_creation) = MONTH(CURRENT_DATE()) AND YEAR(date_creation) = YEAR(CURRENT_DATE())`);
        const [commandesToday] = await pool.execute(`SELECT COUNT(*) as count FROM commandes WHERE DATE(date_creation) = CURDATE()`);

        // Statistiques des signalements
        const [signalementsEnAttente] = await pool.execute(`SELECT COUNT(*) as count FROM signalements WHERE statut = 'EN_ATTENTE'`);

        // Dernières activités (logs)
        const [recentLogs] = await pool.execute(`SELECT COUNT(*) as count FROM system_logs WHERE DATE(created_at) = CURDATE()`);

        res.json({
            totalUsers,
            totalBoutiques: boutiquesCount[0].total,
            totalCommandes: {
                total: commandesCount[0].total || 0,
                enCours: commandesEnCours[0].count || 0,
                livrees: commandesLivrees[0].count || 0,
                aujourdhui: commandesToday[0].count || 0
            },
            revenue: {
                total: commandesCount[0].revenue || 0,
                thisMonth: revenueMonth[0].total || 0
            },
            signalements: {
                enAttente: signalementsEnAttente[0].count || 0
            },
            activitesAujourdhui: recentLogs[0].count || 0
        });
    } catch (error) {
        console.error('Erreur stats overview:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.getSignalements = async (req, res) => {
    try {
        const { statut = 'EN_ATTENTE', page = 1, limit = 25 } = req.query;
        const offset = (page - 1) * limit;

        const [signalements] = await pool.execute(`
      SELECT s.*, u.nom as reporter_nom, u.prenom as reporter_prenom
      FROM signalements s
      JOIN utilisateurs u ON s.reported_by = u.id
      WHERE s.statut = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [statut, parseInt(limit), offset]);

        const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM signalements WHERE statut = ?', [statut]);

        res.json({
            signalements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur liste signalements:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.resolveSignalement = async (req, res) => {
    try {
        const signalementId = parseInt(req.params.id);
        const { resolution } = req.body;

        await pool.execute(`UPDATE signalements SET statut = 'RESOLU', resolution = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?`, [resolution, req.superAdmin.id, signalementId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.superAdmin.id, 'APPROVE', 'SIGNALEMENT', signalementId, `Résolution signalement`, ipAddress);

        res.json({ message: 'Signalement résolu' });
    } catch (error) {
        console.error('Erreur résolution signalement:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, action_type, resource_type } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT l.*, a.nom as admin_nom, a.prenom as admin_prenom
      FROM system_logs l
      LEFT JOIN super_admins a ON l.admin_id = a.id
      WHERE 1=1
    `;
        const params = [];
        if (action_type) { query += ' AND l.action_type = ?'; params.push(action_type); }
        if (resource_type) { query += ' AND l.resource_type = ?'; params.push(resource_type); }

        query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [logs] = await pool.execute(query, params);
        res.json({ logs });
    } catch (error) {
        console.error('Erreur logs:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { type, durationInDays } = req.body; // 'client', 'gerant', 'livreur', optional durationInDays

        if (!['client', 'gerant', 'livreur'].includes(type)) {
            return res.status(400).json({ erreur: 'Type utilisateur invalide' });
        }

        let table = type === 'client' ? 'clients' : (type === 'gerant' ? 'gerants' : 'livreurs');

        // Vérifier si la colonne actif existe
        try {
            await pool.execute(`SELECT actif FROM ${table} LIMIT 1`);
        } catch (e) {
            console.log(`Ajout de la colonne actif à la table ${table}`);
            await pool.execute(`ALTER TABLE ${table} ADD COLUMN actif TINYINT(1) DEFAULT 1`);
        }

        // Vérifier si la colonne date_fin_activation existe
        try {
            await pool.execute(`SELECT date_fin_activation FROM ${table} LIMIT 1`);
        } catch (e) {
            console.log(`Ajout de la colonne date_fin_activation à la table ${table}`);
            await pool.execute(`ALTER TABLE ${table} ADD COLUMN date_fin_activation DATETIME NULL DEFAULT NULL`);
        }

        // Vérifier l'utilisateur
        const [users] = await pool.execute(`SELECT id, actif, email FROM ${table} WHERE id = ?`, [userId]);
        if (!users.length) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });

        const user = users[0];

        let newStatus;
        let newDateFin = null;
        let actionDesc = '';

        if (durationInDays !== undefined) {
            // Si durationInDays est fourni, c'est forcément une activation (ou réactivation)
            newStatus = 1;
            if (durationInDays > 0) {
                const date = new Date();
                date.setDate(date.getDate() + parseInt(durationInDays));
                newDateFin = date;
                actionDesc = `Activation ${type} pour ${durationInDays} jours`;
            } else {
                // Permanent
                newDateFin = null;
                actionDesc = `Activation ${type} permanente`;
            }
        } else {
            // Comportement toggle simple (si pas de durée spécifiée, ou pour désactivation)
            const currentStatus = user.actif === 1 || user.actif === true;
            newStatus = !currentStatus ? 1 : 0;
            // Si on désactive, on clear la date. Si on active sans durée, c'est permanent (null)
            newDateFin = null;
            actionDesc = `${newStatus ? 'Activation' : 'Désactivation'} ${type}`;
        }

        await pool.execute(`UPDATE ${table} SET actif = ?, date_fin_activation = ? WHERE id = ?`, [newStatus, newDateFin, userId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.superAdmin.id, 'UPDATE', 'UTILISATEUR', userId, `${actionDesc}: ${user.email}`, ipAddress);

        res.json({ message: `Compte mis à jour avec succès`, actif: !!newStatus, date_fin_activation: newDateFin });
    } catch (error) {
        console.error('Erreur toggle status:', error);
        res.status(500).json({ erreur: 'Erreur serveur: ' + error.message });
    }
};

exports.getLivreurs = async (req, res) => {
    try {
        const { page = 1, limit = 25, search, actif } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                l.id, l.nom, l.prenom, l.email, l.telephone, l.actif, l.photo,
                (SELECT COUNT(*) FROM commandes c WHERE c.livreur_id = l.id) as total_livraisons,
                (SELECT COUNT(*) FROM commandes c WHERE c.livreur_id = l.id AND c.statut = 'livrée') as livraisons_completees
            FROM livreurs l
            WHERE 1=1
        `;
        const params = [];

        if (actif !== undefined && actif !== '') {
            query += ' AND l.actif = ?';
            params.push(actif === 'true' || actif === 1);
        }

        if (search) {
            query += ' AND (l.nom LIKE ? OR l.prenom LIKE ? OR l.email LIKE ? OR l.telephone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [livreurs] = await pool.execute(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM livreurs l WHERE 1=1';
        const countParams = [];

        if (actif !== undefined && actif !== '') {
            countQuery += ' AND l.actif = ?';
            countParams.push(actif === 'true' || actif === 1);
        }

        if (search) {
            countQuery += ' AND (l.nom LIKE ? OR l.prenom LIKE ? OR l.email LIKE ? OR l.telephone LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const [countResult] = await pool.execute(countQuery, countParams);

        res.json({
            livreurs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur getLivreurs:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

// Activités récentes de toutes les applications
exports.getActivities = async (req, res) => {
    try {
        const { page = 1, limit = 50, type } = req.query;
        const offset = (page - 1) * limit;

        // On combine les logs système avec les activités des différentes apps
        let activities = [];

        // 1. Logs système (actions admin)
        const [logs] = await pool.execute(`
            SELECT 
                l.id,
                'ADMIN' as source,
                l.action_type as type,
                l.resource_type as resource,
                l.description,
                l.created_at,
                CONCAT(a.prenom, ' ', a.nom) as user_name,
                'super_admin' as user_type
            FROM system_logs l
            LEFT JOIN super_admins a ON l.admin_id = a.id
            ORDER BY l.created_at DESC
            LIMIT 20
        `);
        activities = activities.concat(logs.map(l => ({ ...l, source: 'ADMIN' })));

        // 2. Commandes récentes (activité client/gerant/livreur)
        const [commandes] = await pool.execute(`
            SELECT 
                c.id,
                'COMMANDE' as source,
                c.statut as type,
                'COMMANDE' as resource,
                CONCAT('Commande #', c.id, ' - ', c.statut, ' - ', c.prix, ' GNF') as description,
                c.date_creation as created_at,
                cl.nom as user_name,
                'client' as user_type
            FROM commandes c
            LEFT JOIN clients cl ON c.utilisateur_id = cl.id
            ORDER BY c.date_creation DESC
            LIMIT 20
        `);
        activities = activities.concat(commandes);

        // 3. Nouvelles inscriptions clients
        const [newClients] = await pool.execute(`
            SELECT 
                id,
                'INSCRIPTION' as source,
                'CREATE' as type,
                'CLIENT' as resource,
                CONCAT('Nouveau client: ', prenom, ' ', nom) as description,
                date_inscription as created_at,
                CONCAT(prenom, ' ', nom) as user_name,
                'client' as user_type
            FROM clients
            ORDER BY date_inscription DESC
            LIMIT 10
        `);
        activities = activities.concat(newClients);

        // 4. Nouvelles boutiques
        const [newBoutiques] = await pool.execute(`
            SELECT 
                b.id,
                'BOUTIQUE' as source,
                'CREATE' as type,
                'BOUTIQUE' as resource,
                CONCAT('Nouvelle boutique: ', b.nom) as description,
                g.date_inscription as created_at,
                CONCAT(g.prenom, ' ', g.nom) as user_name,
                'gerant' as user_type
            FROM boutiques b
            LEFT JOIN gerants g ON b.gerant_id = g.id
            ORDER BY b.id DESC
            LIMIT 10
        `);
        activities = activities.concat(newBoutiques);

        // 5. Livraisons
        const [livraisons] = await pool.execute(`
            SELECT 
                c.id,
                'LIVRAISON' as source,
                c.statut as type,
                'LIVRAISON' as resource,
                CONCAT('Livraison #', c.id, ' par ', l.prenom, ' ', l.nom, ' - ', c.statut) as description,
                c.date_creation as created_at,
                CONCAT(l.prenom, ' ', l.nom) as user_name,
                'livreur' as user_type
            FROM commandes c
            INNER JOIN livreurs l ON c.livreur_id = l.id
            WHERE c.livreur_id IS NOT NULL
            ORDER BY c.date_creation DESC
            LIMIT 15
        `);
        activities = activities.concat(livraisons);

        // Trier par date décroissante
        activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Filtrer par type si spécifié
        if (type) {
            activities = activities.filter(a => a.source === type || a.user_type === type);
        }

        // Paginer
        const paginatedActivities = activities.slice(offset, offset + parseInt(limit));

        res.json({
            activities: paginatedActivities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: activities.length,
                pages: Math.ceil(activities.length / limit)
            }
        });
    } catch (error) {
        console.error('Erreur getActivities:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};
exports.getNotifications = async (req, res) => {
    try {
        const adminId = req.superAdmin.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Récupérer les notifs
        const [notifications] = await pool.execute(
            `SELECT * FROM admin_notifications 
             WHERE admin_id = ? 
             ORDER BY date DESC 
             LIMIT ? OFFSET ?`,
            [adminId, limit, offset]
        );

        // Compter les non-lues
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as unread FROM admin_notifications WHERE admin_id = ? AND lu = 0`,
            [adminId]
        );

        // Compter total pour pagination
        const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM admin_notifications WHERE admin_id = ?', [adminId]);

        res.json({
            notifications,
            unreadCount: countResult[0].unread,
            pagination: {
                page,
                limit,
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur getNotifications:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const adminId = req.superAdmin.id;
        const notifId = req.params.id;

        if (notifId === 'all') {
            await pool.execute(
                'UPDATE admin_notifications SET lu = 1 WHERE admin_id = ? AND lu = 0',
                [adminId]
            );
        } else {
            await pool.execute(
                'UPDATE admin_notifications SET lu = 1 WHERE id = ? AND admin_id = ?',
                [notifId, adminId]
            );
        }

        res.json({ message: 'Marqué comme lu' });
    } catch (error) {
        console.error('Erreur markAsRead:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
};
