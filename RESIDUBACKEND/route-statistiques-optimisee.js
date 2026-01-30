// ROUTE STATISTIQUES GÉRANT OPTIMISÉE - À remplacer dans serveur.js ligne 3258

app.get('/boutiques/:id/statistiques', verifierToken, async (req, res) => {
    if (req.utilisateur.type !== 'gerant') {
        return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
    }

    const boutiqueId = parseInt(req.params.id);
    const periode = req.query.periode || 'all';

    // Validation de la période
    const periodesValides = ['day', 'week', 'month', 'all'];
    if (!periodesValides.includes(periode)) {
        return res.status(400).json({ erreur: 'Période invalide. Utilisez day, week, month ou all.' });
    }

    try {
        // Vérifier que la boutique appartient au gérant
        const [boutique] = await pool.execute(
            'SELECT id, nom FROM boutiques WHERE id = ? AND gerant_id = ?',
            [boutiqueId, req.utilisateur.id]
        );
        if (!boutique.length) {
            return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé' });
        }

        // Définir le filtre de période
        let dateCondition = '';
        let dateConditionPeriodePrecedente = '';
        let groupByClause = '';

        if (periode === 'day') {
            dateCondition = 'AND DATE(date_creation) = CURDATE()';
            dateConditionPeriodePrecedente = 'AND DATE(date_creation) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
            groupByClause = 'HOUR(date_creation)';
        } else if (periode === 'week') {
            dateCondition = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)';
            dateConditionPeriodePrecedente = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)';
            groupByClause = 'DAYNAME(date_creation)';
        } else if (periode === 'month') {
            dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())';
            dateConditionPeriodePrecedente = 'AND YEAR(date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(date_creation) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
            groupByClause = 'DAY(date_creation)';
        }

        // 1. COMMANDES - Statistiques  détaillées
        const [commandesParStatut] = await pool.execute(
            `SELECT statut, COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}
       GROUP BY statut`,
            [boutiqueId]
        );

        const commandesTotal = commandesParStatut.reduce((sum, c) => sum + parseInt(c.total), 0);
        const commandesCompletees = commandesParStatut.find(c => c.statut === 'livrée')?.total || 0;
        const tauxCompletion = commandesTotal > 0 ? ((commandesCompletees / commandesTotal) * 100).toFixed(1) : 0;

        // Commandes période précédente pour comparaison
        const [commandesPeriodePrecedente] = await pool.execute(
            `SELECT COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateConditionPeriodePrecedente}`,
            [boutiqueId]
        );

        const commandesPrecedent = parseInt(commandesPeriodePrecedente[0]?.total) || 0;
        const croissanceCommandes = commandesPrecedent > 0
            ? (((commandesTotal - commandesPrecedent) / commandesPrecedent) * 100).toFixed(1)
            : 0;

        // 2. REVENUS - Calculs mathématiques avancés
        const [revenus] = await pool.execute(
            `SELECT SUM(prix * quantite) AS total, COUNT(*) AS nombre_commandes,
              AVG(prix * quantite) AS moyenne_commande
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateCondition}`,
            [boutiqueId]
        );

        const revenuTotal = parseFloat(revenus[0]?.total) || 0;
        const nombreCommandesPayees = parseInt(revenus[0]?.nombre_commandes) || 0;
        const moyenneParCommande = parseFloat(revenus[0]?.moyenne_commande) || 0;

        // Revenus période précédente
        const [revenusPeriodePrecedente] = await pool.execute(
            `SELECT SUM(prix * quantite) AS total
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateConditionPeriodePrecedente}`,
            [boutiqueId]
        );

        const revenuPrecedent = parseFloat(revenusPeriodePrecedente[0]?.total) || 0;
        const croissanceRevenus = revenuPrecedent > 0
            ? (((revenuTotal - revenuPrecedent) / revenuPrecedent) * 100).toFixed(1)
            : 0;

        // Revenus par période pour graphique et tendance
        const [revenusParPeriode] = await pool.execute(
            `SELECT ${groupByClause} AS periode, SUM(prix * quantite) AS total
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateCondition}
       GROUP BY ${groupByClause}
       ORDER BY date_creation`,
            [boutiqueId]
        );

        // Calcul tendance (régression linéaire simplifiée - pente moyenne)
        let tendancePente = 0;
        if (revenusParPeriode.length > 1) {
            const valeurs = revenusParPeriode.map(r => parseFloat(r.total));
            const moyenneValeurs = valeurs.reduce((sum, v) => sum + v, 0) / valeurs.length;
            const differences = valeurs.slice(1).map((v, i) => v - valeurs[i]);
            tendancePente = differences.reduce((sum, d) => sum + d, 0) / differences.length;
        }

        // Prédiction simple (moyenne mobile)
        const prediction = revenusParPeriode.length > 0
            ? revenusParPeriode.reduce((sum, r) => sum + parseFloat(r.total), 0) / revenusParPeriode.length
            : 0;

        // 3. CLIENTS - Analyse détaillée
        const [clientsTotal] = await pool.execute(
            `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}`,
            [boutiqueId]
        );

        const [clientsRecurrents] = await pool.execute(
            `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? AND utilisateur_id IN (
         SELECT utilisateur_id FROM commandes WHERE boutique_id = ? GROUP BY utilisateur_id HAVING COUNT(*) > 1
       ) ${dateCondition}`,
            [boutiqueId, boutiqueId]
        );

        const totalClients = parseInt(clientsTotal[0]?.total) || 0;
        const recurrents = parseInt(clientsRecurrents[0]?.total) || 0;
        const nouveaux = totalClients - recurrents;
        const tauxRetention = totalClients > 0 ? ((recurrents / totalClients) * 100).toFixed(1) : 0;

        // 4. TOP PRODUITS/SERVICES
        const [topArticles] = await pool.execute(
            `SELECT a.nom, SUM(c.quantite) AS quantite_totale, SUM(c.prix * c.quantite) AS revenu_total
       FROM commandes c
       JOIN articles a ON c.article_id = a.id
       WHERE c.boutique_id = ? AND c.article_id IS NOT NULL ${dateCondition}
       GROUP BY a.id, a.nom
       ORDER BY revenu_total DESC
       LIMIT 5`,
            [boutiqueId]
        );

        const [topServices] = await pool.execute(
            `SELECT s.nom, COUNT(DISTINCT ds.id) AS nombre_demandes, SUM(ds.prix) AS revenu_total
       FROM demandes_services ds
       JOIN services s ON ds.service_id = s.id
       WHERE ds.boutique_id = ? ${dateCondition.replace('date_creation', 'ds.date_creation')}
       GROUP BY s.id, s.nom
       ORDER BY revenu_total DESC
       LIMIT 5`,
            [boutiqueId]
        );

        // 5. RÉPONSE COMPLÈTE
        res.json({
            boutique: {
                id: boutique[0].id,
                nom: boutique[0].nom
            },
            revenus: {
                total: revenuTotal,
                moyenneParCommande: moyenneParCommande.toFixed(0),
                croissance: parseFloat(croissanceRevenus),
                parPeriode: revenusParPeriode.map(r => ({
                    periode: r.periode,
                    total: parseFloat(r.total).toFixed(0)
                })),
                tendance: {
                    pente: tendancePente.toFixed(0),
                    direction: tendancePente > 0 ? 'hausse' : tendancePente < 0 ? 'baisse' : 'stable',
                    prediction: prediction.toFixed(0)
                }
            },
            commandes: {
                total: commandesTotal,
                parStatut: commandesParStatut.reduce((obj, c) => {
                    obj[c.statut] = parseInt(c.total);
                    return obj;
                }, {}),
                tauxCompletion: parseFloat(tauxCompletion),
                croissance: parseFloat(croissanceCommandes)
            },
            clients: {
                total: totalClients,
                nouveaux: nouveaux,
                recurrents: recurrents,
                tauxRetention: parseFloat(tauxRetention)
            },
            topProduits: topArticles.map(a => ({
                nom: a.nom,
                quantite: parseInt(a.quantite_totale),
                revenu: parseFloat(a.revenu_total).toFixed(0)
            })),
            topServices: topServices.map(s => ({
                nom: s.nom,
                demandes: parseInt(s.nombre_demandes),
                revenu: parseFloat(s.revenu_total).toFixed(0)
            }))
        });

    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des statistiques' });
    }
});
