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
