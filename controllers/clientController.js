const pool = require('../config/db');

exports.getHistoriqueVisites = async (req, res) => {
    if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
    try {
        const [visites] = await pool.execute(
            'SELECT b.nom, b.categorie, h.frequence, h.date_visite FROM historique_visites h JOIN boutiques b ON h.boutique_id = b.id WHERE h.utilisateur_id = ? ORDER BY h.date_visite DESC',
            [req.utilisateur.id]
        );
        res.json(visites);
    } catch (erreur) {
        console.error(erreur);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
};

exports.getDepenses = async (req, res) => {
    if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
    try {
        const [depenses] = await pool.execute(
            'SELECT SUM(prix) as total FROM commandes WHERE utilisateur_id = ?',
            [req.utilisateur.id]
        );
        res.json({ total: depenses[0].total || 0 });
    } catch (erreur) {
        console.error(erreur);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
};

exports.getHistoriqueCommandes = async (req, res) => {
    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leur historique.' });
    }
    try {
        // Récupérer toutes les commandes (sauf brouillon)
        const [commandes] = await pool.execute(
            `SELECT c.*, b.nom AS boutique_nom
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.utilisateur_id = ? AND c.statut != 'brouillon'
       ORDER BY c.date_creation DESC`,
            [req.utilisateur.id]
        );
        // Récupérer les articles pour chaque commande
        const commandesWithDetails = await Promise.all(
            commandes.map(async (commande) => {
                // Si article_id existe directement dans la commande
                let articles = [];
                if (commande.article_id) {
                    const [articleData] = await pool.execute(
                        `SELECT a.*, ? as quantite FROM articles a WHERE a.id = ?`,
                        [commande.quantite || 1, commande.article_id]
                    );
                    articles = articleData;
                }
                return { ...commande, articles };
            })
        );
        res.json(commandesWithDetails);
    } catch (erreur) {
        console.error('Erreur dans GET /commandes/historique:', erreur);
        res.status(500).json({ erreur: 'Erreur serveur lors de la récupération de l\'historique' });
    }
};


exports.getDepensesSimple = async (req, res) => {
    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leurs dépenses.' });
    }
    try {
        const [result] = await pool.execute(
            `SELECT SUM(prix) AS total_depenses
       FROM commandes
       WHERE utilisateur_id = ? AND statut != 'brouillon'`,
            [req.utilisateur.id]
        );
        const totalDepenses = Number(result[0].total_depenses || 0);
        res.json({ total_depenses: totalDepenses });
    } catch (erreur) {
        console.error('Erreur dans GET /commandes/depenses:', erreur);
        res.status(500).json({ erreur: 'Erreur serveur lors du calcul des dépenses' });
    }
};

exports.getStatistiquesNavigation = async (req, res) => {
    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leurs statistiques.' });
    }
    try {
        const [visites] = await pool.execute(
            `SELECT b.nom, COUNT(*) AS visite_count
       FROM boutiques b
       JOIN visites v ON b.id = v.boutique_id
       WHERE v.utilisateur_id = ?
       GROUP BY b.id, b.nom
       ORDER BY visite_count DESC
       LIMIT 5`,
            [req.utilisateur.id]
        );
        res.json({ visites_par_boutique: visites });
    } catch (erreur) {
        console.error('Erreur dans GET /statistiques/navigation:', erreur);
        res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des statistiques' });
    }
};

exports.recordVisite = async (req, res) => {
    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent enregistrer des visites.' });
    }
    const { boutique_id } = req.body;
    if (!boutique_id) {
        return res.status(400).json({ erreur: 'boutique_id est requis' });
    }
    try {
        const dateVisite = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [result] = await pool.execute(
            'INSERT INTO visites (utilisateur_id, boutique_id, date_visite) VALUES (?, ?, ?)',
            [req.utilisateur.id, boutique_id, dateVisite]
        );
        res.json({ message: 'Visite enregistrée', id: result.insertId });
    } catch (erreur) {
        console.error('Erreur dans POST /visites:', erreur);
        res.status(500).json({ erreur: 'Erreur serveur lors de l\'enregistrement de la visite' });
    }
};

exports.getDepensesDetail = async (req, res) => {
    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leurs dépenses.' });
    }
    try {
        const utilisateurId = req.utilisateur.id;
        const [boutiques] = await pool.execute(
            `SELECT 
        b.id AS store_id,
        b.nom AS store_name,
        SUM(c.prix) AS total_amount
      FROM commandes c
      JOIN boutiques b ON c.boutique_id = b.id
      WHERE c.utilisateur_id = ? AND c.statut NOT IN ('brouillon', 'annulée', 'en attente')
      GROUP BY b.id, b.nom`,
            [utilisateurId]
        );

        const expensesByStore = [];
        for (const boutique of boutiques) {
            const [articles] = await pool.execute(
                `SELECT a.nom AS name, c.prix AS price
         FROM commandes c
         JOIN articles a ON c.article_id = a.id
         WHERE c.boutique_id = ? AND c.utilisateur_id = ? AND c.statut NOT IN ('brouillon', 'annulée', 'en attente')`,
                [boutique.store_id, utilisateurId]
            );

            const [services] = await pool.execute(
                `SELECT s.nom AS name, c.prix AS price
         FROM commandes c
         JOIN services s ON c.service_id = s.id
         WHERE c.boutique_id = ? AND c.utilisateur_id = ? AND c.statut NOT IN ('brouillon', 'annulée', 'en attente')`,
                [boutique.store_id, utilisateurId]
            );

            const groupedArticles = articles.reduce((acc, article) => {
                const existing = acc.find(item => item.name === article.name);
                if (existing) {
                    existing.price += Number(article.price);
                    existing.quantity += 1;
                } else {
                    acc.push({ name: article.name, price: Number(article.price), quantity: 1 });
                }
                return acc;
            }, []);

            const groupedServices = services.reduce((acc, service) => {
                const existing = acc.find(item => item.name === service.name);
                if (existing) {
                    existing.price += Number(service.price);
                    existing.quantity += 1;
                } else {
                    acc.push({ name: service.name, price: Number(service.price), quantity: 1 });
                }
                return acc;
            }, []);

            expensesByStore.push({
                store_id: boutique.store_id,
                store_name: boutique.store_name,
                total_amount: boutique.total_amount || 0,
                articles: groupedArticles.filter(item => item.name && Number(item.price)),
                services: groupedServices.filter(item => item.name && Number(item.price)),
            });
        }

        const totalDepenses = expensesByStore.reduce((sum, store) => sum + Number(store.total_amount || 0), 0);

        res.json({
            total_depenses: totalDepenses,
            expenses_by_store: expensesByStore,
        });
    } catch (error) {
        console.error('Erreur dans GET /commandes/depenses/detail:', error);
        res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des détails des dépenses' });
    }
};

exports.getClientDepenses = async (req, res) => {
    if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès réservé aux clients' });

    const utilisateurId = req.utilisateur.id;
    const periode = req.query.periode || 'month';

    try {
        let dateCondition = '';
        switch (periode) {
            case 'today':
                dateCondition = 'AND DATE(c.date_creation) = CURDATE()';
                break;
            case 'week':
                dateCondition = 'AND c.date_creation >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case 'month':
                dateCondition = 'AND c.date_creation >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
                break;
            case 'year':
                dateCondition = 'AND c.date_creation >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
                break;
            default: // 'all'
                dateCondition = '';
        }

        const [depensesActuelles] = await pool.execute(
            `SELECT COALESCE(SUM(prix), 0) AS total, COUNT(*) AS nombre_commandes, COALESCE(AVG(prix), 0) AS moyenne_commande 
       FROM commandes c WHERE c.utilisateur_id = ? AND c.statut NOT IN ('brouillon', 'annulée', 'en attente') ${dateCondition}`, [utilisateurId]);

        const totalDepenses = parseFloat(depensesActuelles[0]?.total) || 0;
        const nombreCommandes = parseInt(depensesActuelles[0]?.nombre_commandes) || 0;
        const moyenneCommande = parseFloat(depensesActuelles[0]?.moyenne_commande) || 0;

        const [topBoutiques] = await pool.execute(
            `SELECT b.nom, COUNT(c.id) AS nombre_commandes, COALESCE(SUM(c.prix), 0) AS total_depense
       FROM commandes c JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.utilisateur_id = ? AND c.statut NOT IN ('brouillon', 'annulée', 'en attente') ${dateCondition} GROUP BY b.id, b.nom ORDER BY total_depense DESC LIMIT 5`, [utilisateurId]);

        const [topArticles] = await pool.execute(
            `SELECT a.nom, COALESCE(SUM(c.quantite), 0) AS quantite_totale, COALESCE(SUM(c.prix), 0) AS total_depense
       FROM commandes c JOIN articles a ON c.article_id = a.id
       WHERE c.utilisateur_id = ? AND c.article_id IS NOT NULL AND c.statut NOT IN ('brouillon', 'annulée', 'en attente') ${dateCondition}
       GROUP BY a.id, a.nom ORDER BY total_depense DESC LIMIT 5`, [utilisateurId]);

        const [transactionsRecentes] = await pool.execute(
            `SELECT c.id, b.nom AS boutique_nom, a.nom AS produit_nom, c.prix, c.quantite, c.date_creation
       FROM commandes c
       LEFT JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       WHERE c.utilisateur_id = ? AND c.statut NOT IN ('brouillon', 'annulée', 'en attente') ${dateCondition} ORDER BY c.date_creation DESC LIMIT 10`, [utilisateurId]);

        res.json({
            periode,
            total: totalDepenses.toFixed(0),
            moyenne: moyenneCommande.toFixed(0),
            nombreCommandes,
            topBoutiques: topBoutiques.map(b => ({ nom: b.nom, commandes: parseInt(b.nombre_commandes), depense: parseFloat(b.total_depense).toFixed(0) })),
            topProduits: topArticles.map(p => ({ nom: p.nom, quantite: parseInt(p.quantite_totale), depense: parseFloat(p.total_depense).toFixed(0) })),
            transactionsRecentes: transactionsRecentes.map(t => ({
                id: t.id,
                boutique: t.boutique_nom,
                produit: t.produit_nom,
                prix: parseFloat(t.prix),
                quantite: parseInt(t.quantite) || 1,
                date: t.date_creation
            }))
        });
    } catch (erreur) {
        console.error(erreur);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
};
