// ==================== MIDDLEWARE SUPER ADMIN ====================

// Middleware pour vérifier qu'un utilisateur est super admin
function verifierSuperAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ erreur: 'Token manquant' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'super_admin') {
            return res.status(403).json({ erreur: 'Accès refusé. Seuls les super admins peuvent accéder à cette ressource.' });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ erreur: 'Token invalide' });
    }
}

// Fonction helper pour logger les actions
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

// ==================== ROUTES AUTHENTIFICATION ====================

// POST /super-admin/login - Connexion super admin
app.post('/super-admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ erreur: 'Email et mot de passe requis' });
        }

        // Récupérer le super admin
        const [admins] = await pool.execute(
            'SELECT * FROM super_admins WHERE email = ? AND actif = TRUE',
            [email]
        );

        if (!admins.length) {
            return res.status(401).json({ erreur: 'Identifiants invalides' });
        }

        const admin = admins[0];

        // Vérifier le mot de passe
        const motDePasseValide = await bcrypt.compare(password, admin.mot_de_passe);
        if (!motDePasseValide) {
            return res.status(401).json({ erreur: 'Identifiants invalides' });
        }

        // Mettre à jour last_login
        await pool.execute(
            'UPDATE super_admins SET last_login = NOW() WHERE id = ?',
            [admin.id]
        );

        // Générer le token
        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                type: 'super_admin',
                role: admin.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Logger la connexion
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
});

// POST /super-admin/logout - Déconnexion
app.post('/super-admin/logout', verifierSuperAdmin, async (req, res) => {
    try {
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.admin.id, 'LOGOUT', 'AUTRE', null, 'Déconnexion super admin', ipAddress);
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        console.error('Erreur logout:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// ==================== GESTION UTILISATEURS ====================

// GET /super-admin/users - Liste tous les utilisateurs (paginée)
app.get('/super-admin/users', verifierSuperAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 25, type, search, statut } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id, nom, prenom, telephone, email, type, date_inscription, date_naissance FROM utilisateurs WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (search) {
            query += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY date_inscription DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [users] = await pool.execute(query, params);

        // Compter le total
        let countQuery = 'SELECT COUNT(*) as total FROM utilisateurs WHERE 1=1';
        const countParams = [];
        if (type) {
            countQuery += ' AND type = ?';
            countParams.push(type);
        }
        if (search) {
            countQuery += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur liste users:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// GET /super-admin/users/:id - Détails d'un utilisateur
app.get('/super-admin/users/:id', verifierSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const [users] = await pool.execute(
            'SELECT * FROM utilisateurs WHERE id = ?',
            [userId]
        );

        if (!users.length) {
            return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
        }

        // Récupérer les boutiques si gérant
        let boutiques = [];
        if (users[0].type === 'gerant') {
            [boutiques] = await pool.execute(
                'SELECT id, nom, categorie, adresse FROM boutiques WHERE gerant_id = ?',
                [userId]
            );
        }

        // Récupérer les commandes récentes
        const [commandes] = await pool.execute(
            'SELECT id, statut, prix, date_creation FROM commandes WHERE utilisateur_id = ? ORDER BY date_creation DESC LIMIT 10',
            [userId]
        );

        res.json({
            user: users[0],
            boutiques,
            commandes
        });
    } catch (error) {
        console.error('Erreur détails user:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// DELETE /super-admin/users/:id - Supprimer un utilisateur
app.delete('/super-admin/users/:id', verifierSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const [users] = await pool.execute('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
        if (!users.length) {
            return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
        }

        await pool.execute('DELETE FROM utilisateurs WHERE id = ?', [userId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(
            req.admin.id,
            'DELETE',
            'UTILISATEUR',
            userId,
            `Suppression utilisateur: ${users[0].nom} ${users[0].prenom} (${users[0].email})`,
            ipAddress
        );

        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression user:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// ==================== GESTION BOUTIQUES ====================

// GET /super-admin/boutiques - Liste toutes les boutiques
app.get('/super-admin/boutiques', verifierSuperAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 25, categorie, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT b.*, u.nom as gerant_nom, u.prenom as gerant_prenom, u.email as gerant_email
      FROM boutiques b
      JOIN utilisateurs u ON b.gerant_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (categorie) {
            query += ' AND b.categorie = ?';
            params.push(categorie);
        }

        if (search) {
            query += ' AND (b.nom LIKE ? OR b.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY b.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [boutiques] = await pool.execute(query, params);

        // Compter le total
        let countQuery = 'SELECT COUNT(*) as total FROM boutiques b WHERE 1=1';
        const countParams = [];
        if (categorie) {
            countQuery += ' AND b.categorie = ?';
            countParams.push(categorie);
        }
        if (search) {
            countQuery += ' AND (b.nom LIKE ? OR b.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            boutiques,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur liste boutiques:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// DELETE /super-admin/boutiques/:id - Supprimer une boutique
app.delete('/super-admin/boutiques/:id', verifierSuperAdmin, async (req, res) => {
    try {
        const boutiqueId = parseInt(req.params.id);

        const [boutiques] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [boutiqueId]);
        if (!boutiques.length) {
            return res.status(404).json({ erreur: 'Boutique non trouvée' });
        }

        await pool.execute('DELETE FROM boutiques WHERE id = ?', [boutiqueId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(
            req.admin.id,
            'DELETE',
            'BOUTIQUE',
            boutiqueId,
            `Suppression boutique: ${boutiques[0].nom}`,
            ipAddress
        );

        res.json({ message: 'Boutique supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression boutique:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// ==================== STATISTIQUES GLOBALES ====================

// GET /super-admin/stats/overview - Vue d'ensemble
app.get('/super-admin/stats/overview', verifierSuperAdmin, async (req, res) => {
    try {
        // Compter les utilisateurs par type
        const [usersCount] = await pool.execute(`
      SELECT type, COUNT(*) as count
      FROM utilisateurs
      GROUP BY type
    `);

        const totalUsers = {};
        usersCount.forEach(row => {
            totalUsers[row.type] = row.count;
        });

        // Compter les boutiques
        const [boutiquesCount] = await pool.execute('SELECT COUNT(*) as total FROM boutiques');

        // Compter les commandes
        const [commandesCount] = await pool.execute('SELECT COUNT(*) as total, SUM(prix) as revenue FROM commandes');

        // Commandes en cours
        const [commandesEnCours] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM commandes
      WHERE statut IN ('en attente', 'acceptée', 'en préparation', 'en cours de livraison')
    `);

        // Revenue du mois en cours
        const [revenueMonth] = await pool.execute(`
      SELECT SUM(prix) as total
      FROM commandes
      WHERE MONTH(date_creation) = MONTH(CURRENT_DATE())
      AND YEAR(date_creation) = YEAR(CURRENT_DATE())
    `);

        res.json({
            totalUsers,
            totalBoutiques: boutiquesCount[0].total,
            totalCommandes: {
                total: commandesCount[0].total,
                enCours: commandesEnCours[0].count
            },
            revenue: {
                total: commandesCount[0].revenue || 0,
                thisMonth: revenueMonth[0].total || 0
            }
        });
    } catch (error) {
        console.error('Erreur stats overview:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// ==================== SIGNALEMENTS ====================

// GET /super-admin/signalements - Liste des signalements
app.get('/super-admin/signalements', verifierSuperAdmin, async (req, res) => {
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

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM signalements WHERE statut = ?',
            [statut]
        );

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
});

// PUT /super-admin/signalements/:id/resolve - Résoudre un signalement
app.put('/super-admin/signalements/:id/resolve', verifierSuperAdmin, async (req, res) => {
    try {
        const signalementId = parseInt(req.params.id);
        const { resolution } = req.body;

        await pool.execute(`
      UPDATE signalements
      SET statut = 'RESOLU', resolution = ?, resolved_by = ?, resolved_at = NOW()
      WHERE id = ?
    `, [resolution, req.admin.id, signalementId]);

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(req.admin.id, 'APPROVE', 'SIGNALEMENT', signalementId, `Résolution signalement`, ipAddress);

        res.json({ message: 'Signalement résolu' });
    } catch (error) {
        console.error('Erreur résolution signalement:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// ==================== LOGS ====================

// GET /super-admin/logs - Historique des actions
app.get('/super-admin/logs', verifierSuperAdmin, async (req, res) => {
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

        if (action_type) {
            query += ' AND l.action_type = ?';
            params.push(action_type);
        }

        if (resource_type) {
            query += ' AND l.resource_type = ?';
            params.push(resource_type);
        }

        query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [logs] = await pool.execute(query, params);

        res.json({ logs });
    } catch (error) {
        console.error('Erreur logs:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});
// ==================== NOUVELLES ROUTES - GESTION AVANCÉE ====================

// PUT /super-admin/users/:id/toggle-status - Activer/Désactiver un utilisateur
app.put('/super-admin/users/:id/toggle-status', verifierSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { actif } = req.body;

        const [users] = await pool.execute('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
        if (!users.length) {
            return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
        }

        const newStatus = actif !== undefined ? actif : !users[0].actif;

        await pool.execute(
            'UPDATE utilisateurs SET actif = ? WHERE id = ?',
            [newStatus, userId]
        );

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await logAction(
            req.admin.id,
            'UPDATE',
            'UTILISATEUR',
            userId,
            `${newStatus ? 'Activation' : 'Désactivation'} compte: ${users[0].nom} ${users[0].prenom}`,
            ipAddress
        );

        res.json({
            message: newStatus ? 'Compte activé' : 'Compte désactivé',
            actif: newStatus
        });
    } catch (error) {
        console.error('Erreur toggle status:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// GET /super-admin/livreurs - Liste tous les livreurs
app.get('/super-admin/livreurs', verifierSuperAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, search, actif } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT l.*, u.nom, u.prenom, u.telephone, u.email, u.actif,
             COUNT(DISTINCT c.id) as total_livraisons,
             COUNT(DISTINCT CASE WHEN c.statut = 'livrée' THEN c.id END) as livraisons_completees
      FROM livreurs l
      JOIN utilisateurs u ON l.utilisateur_id = u.id
      LEFT JOIN commandes c ON c.livreur_id = l.id
      WHERE u.type = 'livreur'
    `;
        const params = [];

        if (search) {
            query += ' AND (u.nom LIKE ? OR u.prenom LIKE ? OR u.telephone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (actif !== undefined) {
            query += ' AND u.actif = ?';
            params.push(actif === 'true' ? 1 : 0);
        }

        query += ' GROUP BY l.id ORDER BY u.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [livreurs] = await pool.execute(query, params);

        // Compter total
        let countQuery = `
      SELECT COUNT(DISTINCT l.id) as total
      FROM livreurs l
      JOIN utilisateurs u ON l.utilisateur_id = u.id
      WHERE u.type = 'livreur'
    `;
        const countParams = [];

        if (search) {
            countQuery += ' AND (u.nom LIKE ? OR u.prenom LIKE ? OR u.telephone LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (actif !== undefined) {
            countQuery += ' AND u.actif = ?';
            countParams.push(actif === 'true' ? 1 : 0);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            livreurs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur liste livreurs:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// GET /super-admin/livraisons - Historique complet des livraisons
app.get('/super-admin/livraisons', verifierSuperAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, statut, livreur_id, date_debut, date_fin } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT 
        c.id,
        c.statut,
        c.prix,
        c.adresse_livraison,
        c.date_creation,
        c.date_livraison,
        u_client.nom as client_nom,
        u_client.prenom as client_prenom,
        u_client.telephone as client_telephone,
        u_livreur.nom as livreur_nom,
        u_livreur.prenom as livreur_prenom,
        u_livreur.telephone as livreur_telephone,
        b.nom as boutique_nom
      FROM commandes c
      LEFT JOIN utilisateurs u_client ON c.utilisateur_id = u_client.id
      LEFT JOIN livreurs l ON c.livreur_id = l.id
      LEFT JOIN utilisateurs u_livreur ON l.utilisateur_id = u_livreur.id
      LEFT JOIN boutiques b ON c.boutique_id = b.id
      WHERE c.livreur_id IS NOT NULL
    `;
        const params = [];

        if (statut) {
            query += ' AND c.statut = ?';
            params.push(statut);
        }

        if (livreur_id) {
            query += ' AND c.livreur_id = ?';
            params.push(parseInt(livreur_id));
        }

        if (date_debut) {
            query += ' AND DATE(c.date_creation) >= ?';
            params.push(date_debut);
        }

        if (date_fin) {
            query += ' AND DATE(c.date_creation) <= ?';
            params.push(date_fin);
        }

        query += ' ORDER BY c.date_creation DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [livraisons] = await pool.execute(query, params);

        // Compter total
        let countQuery = `
      SELECT COUNT(*) as total
      FROM commandes c
      WHERE c.livreur_id IS NOT NULL
    `;
        const countParams = [];

        if (statut) {
            countQuery += ' AND c.statut = ?';
            countParams.push(statut);
        }

        if (livreur_id) {
            countQuery += ' AND c.livreur_id = ?';
            countParams.push(parseInt(livreur_id));
        }

        if (date_debut) {
            countQuery += ' AND DATE(c.date_creation) >= ?';
            countParams.push(date_debut);
        }

        if (date_fin) {
            countQuery += ' AND DATE(c.date_creation) <= ?';
            countParams.push(date_fin);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            livraisons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur historique livraisons:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// GET /super-admin/livraisons/stats - Statistiques des livraisons
app.get('/super-admin/livraisons/stats', verifierSuperAdmin, async (req, res) => {
    try {
        // Total livraisons
        const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM commandes
      WHERE livreur_id IS NOT NULL
    `);

        // Livraisons par statut
        const [parStatut] = await pool.execute(`
      SELECT statut, COUNT(*) as count
      FROM commandes
      WHERE livreur_id IS NOT NULL
      GROUP BY statut
    `);

        // Livraisons ce mois
        const [ceMois] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM commandes
      WHERE livreur_id IS NOT NULL
      AND MONTH(date_creation) = MONTH(CURRENT_DATE())
      AND YEAR(date_creation) = YEAR(CURRENT_DATE())
    `);

        // Top 5 livreurs
        const [topLivreurs] = await pool.execute(`
      SELECT 
        u.nom,
        u.prenom,
        COUNT(c.id) as total_livraisons,
        COUNT(CASE WHEN c.statut = 'livrée' THEN 1 END) as livraisons_completees
      FROM livreurs l
      JOIN utilisateurs u ON l.utilisateur_id = u.id
      LEFT JOIN commandes c ON c.livreur_id = l.id
      GROUP BY l.id
      ORDER BY total_livraisons DESC
      LIMIT 5
    `);

        // Revenu total livraisons
        const [revenu] = await pool.execute(`
      SELECT SUM(prix) as total
      FROM commandes
      WHERE livreur_id IS NOT NULL
      AND statut = 'livrée'
    `);

        res.json({
            totalLivraisons: totalCount[0].total,
            parStatut,
            ceMois: ceMois[0].count,
            topLivreurs,
            revenuTotal: revenu[0].total || 0
        });
    } catch (error) {
        console.error('Erreur stats livraisons:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// GET /super-admin/livreurs/:id/livraisons - Livraisons d'un livreur spécifique
app.get('/super-admin/livreurs/:id/livraisons', verifierSuperAdmin, async (req, res) => {
    try {
        const livreurId = parseInt(req.params.id);
        const { page = 1, limit = 25 } = req.query;
        const offset = (page - 1) * limit;

        const [livraisons] = await pool.execute(`
      SELECT 
        c.id,
        c.statut,
        c.prix,
        c.adresse_livraison,
        c.date_creation,
        c.date_livraison,
        u.nom as client_nom,
        u.prenom as client_prenom,
        b.nom as boutique_nom
      FROM commandes c
      JOIN utilisateurs u ON c.utilisateur_id = u.id
      LEFT JOIN boutiques b ON c.boutique_id = b.id
      WHERE c.livreur_id = ?
      ORDER BY c.date_creation DESC
      LIMIT ? OFFSET ?
    `, [livreurId, parseInt(limit), offset]);

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM commandes WHERE livreur_id = ?',
            [livreurId]
        );

        res.json({
            livraisons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Erreur livraisons livreur:', error);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});
