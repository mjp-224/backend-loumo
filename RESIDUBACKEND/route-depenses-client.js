// ROUTE DÉPENSES CLIENT - À ajouter dans serveur.js après route statistiques gérant

app.get('/clients/depenses', verifierToken, async (req, res) => {
    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès réservé aux clients' });
    }

    const utilisateurId = req.utilisateur.id;
    const periode = req.query.periode || 'month';

    // Validation période
    const periodesValides = ['week', 'month', 'year', 'all'];
    if (!periodesValides.includes(periode)) {
        return res.status(400).json({ erreur: 'Période invalide. Utilisez week, month, year ou all.' });
    }

    try {
        // Définir filtres de période
        let dateCondition = '';
        let dateConditionPeriodePrecedente = '';
        let groupByClause = '';

        if (periode === 'week') {
            dateCondition = 'AND YEARWEEK(c.date_creation, 1) = YEARWEEK(CURDATE(), 1)';
            dateConditionPeriodePrecedente = 'AND YEARWEEK(c.date_creation, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)';
            groupByClause = 'DAYNAME(c.date_creation)';
        } else if (periode === 'month') {
            dateCondition = 'AND YEAR(c.date_creation) = YEAR(CURDATE()) AND MONTH(c.date_creation) = MONTH(CURDATE())';
            dateConditionPeriodePrecedente = 'AND YEAR(c.date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(c.date_creation) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
            groupByClause = 'DAY(c.date_creation)';
        } else if (periode === 'year') {
            dateCondition = 'AND YEAR(c.date_creation) = YEAR(CURDATE())';
            dateConditionPeriodePrecedente = 'AND YEAR(c.date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 YEAR))';
            groupByClause = 'MONTH(c.date_creation)';
        }

        // 1. TOTAL DÉPENSES période actuelle
        const [depensesActuelles] = await pool.execute(
            `SELECT SUM(c.prix * c.quantite) AS total, COUNT(*) AS nombre_commandes,
              AVG(c.prix * c.quantite) AS moyenne_commande
       FROM commandes c
       WHERE c.utilisateur_id = ? ${dateCondition}`,
            [utilisateurId]
        );

        const totalDepenses = parseFloat(depensesActuelles[0]?.total) || 0;
        const nombreCommandes = parseInt(depensesActuelles[0]?.nombre_commandes) || 0;
        const moyenneCommande = parseFloat(depensesActuelles[0]?.moyenne_commande) || 0;

        // 2. DÉPENSES période précédente (comparaison)
        const [depensesPrecedentes] = await pool.execute(
            `SELECT SUM(c.prix * c.quantite) AS total
       FROM commandes c
       WHERE c.utilisateur_id = ? ${dateConditionPeriodePrecedente}`,
            [utilisateurId]
        );

        const totalPrecedent = parseFloat(depensesPrecedentes[0]?.total) || 0;
        const croissance = totalPrecedent > 0
            ? (((totalDepenses - totalPrecedent) / totalPrecedent) * 100).toFixed(1)
            : 0;

        // 3. DÉPENSES PAR PÉRIODE (graphique)
        const [depensesParPeriode] = await pool.execute(
            `SELECT ${groupByClause} AS periode, SUM(c.prix * c.quantite) AS total
       FROM commandes c
       WHERE c.utilisateur_id = ? ${dateCondition}
       GROUP BY ${groupByClause}
       ORDER BY c.date_creation`,
            [utilisateurId]
        );

        // 4. RÉPARTITION ARTICLES VS SERVICES
        const [depensesArticles] = await pool.execute(
            `SELECT SUM(c.prix * c.quantite) AS total
       FROM commandes c
       WHERE c.utilisateur_id = ? AND c.article_id IS NOT NULL ${dateCondition}`,
            [utilisateurId]
        );

        const [depensesServices] = await pool.execute(
            `SELECT SUM(ds.prix) AS total
       FROM demandes_services ds
       WHERE ds.utilisateur_id = ? ${dateCondition.replace('c.date_creation', 'ds.date_creation')}`,
            [utilisateurId]
        );

        const totalArticles = parseFloat(depensesArticles[0]?.total) || 0;
        const totalServices = parseFloat(depensesServices[0]?.total) || 0;

        // 5. TOP 5 BOUTIQUES fréquentées
        const [topBoutiques] = await pool.execute(
            `SELECT b.nom, COUNT(c.id) AS nombre_commandes, SUM(c.prix * c.quantite) AS total_depense
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.utilisateur_id = ? ${dateCondition}
       GROUP BY b.id, b.nom
       ORDER BY total_depense DESC
       LIMIT 5`,
            [utilisateurId]
        );

        // 6. TOP 5 PRODUITS/SERVICES achetés
        const [topArticles] = await pool.execute(
            `SELECT a.nom, SUM(c.quantite) AS quantite_totale, SUM(c.prix * c.quantite) AS total_depense
       FROM commandes c
       JOIN articles a ON c.article_id = a.id
       WHERE c.utilisateur_id = ? AND c.article_id IS NOT NULL ${dateCondition}
       GROUP BY a.id, a.nom
       ORDER BY total_depense DESC
       LIMIT 5`,
            [utilisateurId]
        );

        const [topServices] = await pool.execute(
            `SELECT s.nom, COUNT(ds.id) AS nombre_demandes, SUM(ds.prix) AS total_depense
       FROM demandes_services ds
       JOIN services s ON ds.service_id = s.id
       WHERE ds.utilisateur_id = ? ${dateCondition.replace('c.date_creation', 'ds.date_creation')}
       GROUP BY s.id, s.nom
       ORDER BY total_depense DESC
       LIMIT 5`,
            [utilisateurId]
        );

        // 7. BUDGET (si défini dans table utilisateurs - optionnel)
        const [budgetInfo] = await pool.execute(
            `SELECT budget_mensuel FROM clients WHERE id = ?`,
            [utilisateurId]
        );

        const budgetDefini = parseFloat(budgetInfo[0]?.budget_mensuel) || null;
        let budgetStats = null;
        if (budgetDefini && periode === 'month') {
            const pourcentageUtilise = ((totalDepenses / budgetDefini) * 100).toFixed(1);
            budgetStats = {
                defini: budgetDefini,
                utilise: totalDepenses,
                pourcentage: parseFloat(pourcentageUtilise),
                reste: budgetDefini - totalDepenses
            };
        }

        // 8. TRANSACTIONS RÉCENTES (dernières 10)
        const [transactionsRecentes] = await pool.execute(
            `SELECT c.id, b.nom AS boutique_nom, 
              COALESCE(a.nom, s.nom) AS produit_nom,
              c.prix * c.quantite AS montant,
              c.date_creation
       FROM commandes c
       LEFT JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN services s ON c.service_id = s.id
       WHERE c.utilisateur_id = ?
       ORDER BY c.date_creation DESC
       LIMIT 10`,
            [utilisateurId]
        );

        // 9. RÉPONSE COMPLÈTE
        res.json({
            periode,
            total: totalDepenses.toFixed(0),
            moyenne: moyenneCommande.toFixed(0),
            nombreCommandes,
            croissance: parseFloat(croissance),
            parPeriode: depensesParPeriode.map(d => ({
                periode: d.periode,
                total: parseFloat(d.total).toFixed(0)
            })),
            parCategorie: {
                articles: totalArticles.toFixed(0),
                services: totalServices.toFixed(0),
                pourcentageArticles: totalDepenses > 0 ? ((totalArticles / totalDepenses) * 100).toFixed(1) : 0,
                pourcentageServices: totalDepenses > 0 ? ((totalServices / totalDepenses) * 100).toFixed(1) : 0
            },
            topBoutiques: topBoutiques.map(b => ({
                nom: b.nom,
                commandes: parseInt(b.nombre_commandes),
                depense: parseFloat(b.total_depense).toFixed(0)
            })),
            topProduits: [...topArticles, ...topServices].sort((a, b) =>
                parseFloat(b.total_depense) - parseFloat(a.total_depense)
            ).slice(0, 5).map(p => ({
                nom: p.nom,
                quantite: parseInt(p.quantite_totale || p.nombre_demandes),
                depense: parseFloat(p.total_depense).toFixed(0)
            })),
            budget: budgetStats,
            transactionsRecentes: transactionsRecentes.map(t => ({
                id: t.id,
                boutique: t.boutique_nom,
                produit: t.produit_nom,
                montant: parseFloat(t.montant).toFixed(0),
                date: t.date_creation
            }))
        });

    } catch (error) {
        console.error('Erreur dépenses client:', error);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des dépenses' });
    }
});
