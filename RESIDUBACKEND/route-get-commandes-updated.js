// ROUTE GET /commandes - Version modifiée pour inclure demandes_services
app.get('/commandes', verifierToken, async (req, res) => {
    try {
        let commandes = [];
        let demandesServices = [];

        if (req.utilisateur.type === 'client') {
            // Récupérer les commandes (articles et anciens services via table commandes)
            [commandes] = await pool.execute(
                `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
                c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id,
                c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone,
                'commande' AS type
         FROM commandes c
         JOIN clients u ON c.utilisateur_id = u.id
         LEFT JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE c.utilisateur_id = ?`,
                [req.utilisateur.id]
            );

            // Récupérer les demandes de services (nouvelle table demandes_services)
            [demandesServices] = await pool.execute(
                `SELECT ds.id, ds.utilisateur_id, ds.boutique_id, NULL AS article_id, ds.service_id, 
                1 AS quantite, ds.prix, ds.statut, ds.moyen_paiement, ds.date_creation, 
                NULL AS livreur_id, ds.client_latitude, ds.client_longitude, 
                ds.client_nom, ds.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                NULL AS article_nom, NULL AS article_description, NULL AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                NULL AS livreur_nom, NULL AS livreur_prenom, NULL AS livreur_telephone,
                'demande_service' AS type
         FROM demandes_services ds
         LEFT JOIN boutiques b ON ds.boutique_id = b.id
         LEFT JOIN services s ON ds.service_id = s.id
         WHERE ds.utilisateur_id = ?`,
                [req.utilisateur.id]
            );
        } else {
            // Pour gérant : récupérer commandes de ses boutiques
            [commandes] = await pool.execute(
                `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
                c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id,
                c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone,
                'commande' AS type
         FROM commandes c
         JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE b.gerant_id = ?`,
                [req.utilisateur.id]
            );

            // Récupérer demandes services des boutiques du gérant
            [demandesServices] = await pool.execute(
                `SELECT ds.id, ds.utilisateur_id, ds.boutique_id, NULL AS article_id, ds.service_id,
                1 AS quantite, ds.prix, ds.statut, ds.moyen_paiement, ds.date_creation,
                NULL AS livreur_id, ds.client_latitude, ds.client_longitude,
                ds.client_nom, ds.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                NULL AS article_nom, NULL AS article_description, NULL AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                NULL AS livreur_nom, NULL AS livreur_prenom, NULL AS livreur_telephone,
                'demande_service' AS type
         FROM demandes_services ds
         JOIN boutiques b ON ds.boutique_id = b.id
         LEFT JOIN services s ON ds.service_id = s.id
         WHERE b.gerant_id = ?`,
                [req.utilisateur.id]
            );
        }

        // Combiner les deux listes et trier par date
        const toutesLesCommandes = [...commandes, ...demandesServices].sort((a, b) =>
            new Date(b.date_creation) - new Date(a.date_creation)
        );

        res.json(toutesLesCommandes);
    } catch (erreur) {
        console.error('Erreur GET /commandes:', erreur);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des commandes' });
    }
});
