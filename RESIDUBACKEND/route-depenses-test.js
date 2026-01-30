// TEST ROUTE DÉPENSES CLIENT - Version simplifiée pour debug
// Remplacer temporairement la route ligne 3489 par celle-ci

app.get('/clients/depenses-test', verifierToken, async (req, res) => {
    console.log('=== TEST ROUTE DÉPENSES ===');
    console.log('Utilisateur:', req.utilisateur);

    if (req.utilisateur.type !== 'client') {
        return res.status(403).json({ erreur: 'Accès réservé aux clients' });
    }

    const utilisateurId = req.utilisateur.id;
    const periode = req.query.periode || 'month';

    console.log('Utilisateur ID:', utilisateurId);
    console.log('Période:', periode);

    try {
        // Test 1: Requête simple
        console.log('Test 1: Dépenses actuelles...');
        const [depensesActuelles] = await pool.execute(
            `SELECT SUM(c.prix * c.quantite) AS total, COUNT(*) AS nombre_commandes 
       FROM commandes c 
       WHERE c.utilisateur_id = ?`,
            [utilisateurId]
        );
        console.log('✅ Test 1 OK:', depensesActuelles[0]);

        // Test 2: Top boutiques
        console.log('Test 2: Top boutiques...');
        const [topBoutiques] = await pool.execute(
            `SELECT b.nom, COUNT(c.id) AS nombre_commandes 
       FROM commandes c 
       JOIN boutiques b ON c.boutique_id = b.id 
       WHERE c.utilisateur_id = ? 
       GROUP BY b.id, b.nom 
       ORDER BY nombre_commandes DESC 
       LIMIT 5`,
            [utilisateurId]
        );
        console.log('✅ Test 2 OK:', topBoutiques.length, 'boutiques');

        // Test 3: Top articles
        console.log('Test 3: Top articles...');
        const [topArticles] = await pool.execute(
            `SELECT a.nom, SUM(c.quantite) AS quantite_totale 
       FROM commandes c 
       JOIN articles a ON c.article_id = a.id 
       WHERE c.utilisateur_id = ? AND c.article_id IS NOT NULL 
       GROUP BY a.id, a.nom 
       ORDER BY quantite_totale DESC 
       LIMIT 5`,
            [utilisateurId]
        );
        console.log('✅ Test 3 OK:', topArticles.length, 'articles');

        // Test 4: Transactions récentes
        console.log('Test 4: Transactions récentes...');
        const [transactions] = await pool.execute(
            `SELECT c.id, b.nom AS boutique_nom, a.nom AS produit_nom, c.prix, c.quantite 
       FROM commandes c 
       LEFT JOIN boutiques b ON c.boutique_id = b.id 
       LEFT JOIN articles a ON c.article_id = a.id 
       WHERE c.utilisateur_id = ? 
       ORDER BY c.date_creation DESC 
       LIMIT 10`,
            [utilisateurId]
        );
        console.log('✅ Test 4 OK:', transactions.length, 'transactions');

        res.json({
            success: true,
            tests: {
                depenses: depensesActuelles[0],
                topBoutiques: topBoutiques.length,
                topArticles: topArticles.length,
                transactions: transactions.length
            }
        });

    } catch (error) {
        console.error('❌ ERREUR:', error.message);
        console.error('SQL:', error.sql);
        res.status(500).json({
            erreur: error.message,
            sql: error.sql
        });
    }
});
