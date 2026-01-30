
// ==================== ROUTE DEMANDES DE SERVICES ====================
// POST /demandes-services - Créer une demande de service (UNIQUEMENT services, pas articles)
app.post('/demandes-services', verifierToken, async (req, res) => {
    const {
        boutique_id,
        service_id,
        prix,
        moyen_paiement,
        client_latitude,
        client_longitude,
        client_nom,
        client_telephone,
        adresse,
        notes,
    } = req.body;

    // Validation des données
    if (
        !boutique_id ||
        !service_id ||
        !prix ||
        !moyen_paiement ||
        client_latitude === undefined ||
        client_longitude === undefined ||
        !client_nom ||
        !client_telephone
    ) {
        return res.status(400).json({ erreur: 'Données incomplètes pour la demande de service' });
    }

    if (
        isNaN(client_latitude) ||
        isNaN(client_longitude) ||
        client_latitude < -90 ||
        client_latitude > 90 ||
        client_longitude < -180 ||
        client_longitude > 180
    ) {
        return res.status(400).json({ erreur: 'Coordonnées géographiques invalides' });
    }

    if (typeof client_nom !== 'string' || client_nom.trim().length < 2) {
        return res.status(400).json({ erreur: 'Nom du client invalide' });
    }

    if (typeof client_telephone !== 'string' || !/^\+?\d{7,15}$/.test(client_telephone)) {
        return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
    }

    const moyensValides = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'];
    if (!moyensValides.includes(moyen_paiement)) {
        return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
    }

    if (prix <= 0 || isNaN(prix)) {
        return res.status(400).json({ erreur: 'Prix invalide' });
    }

    let connexion;
    try {
        connexion = await pool.getConnection();
        await connexion.beginTransaction();

        // Vérifier la boutique
        const [boutique] = await connexion.execute(
            'SELECT id, gerant_id FROM boutiques WHERE id = ?',
            [boutique_id]
        );
        if (!boutique.length) {
            throw new Error('Boutique non trouvée');
        }

        // Vérifier le service
        const [service] = await connexion.execute(
            'SELECT id, prix, disponible FROM services WHERE id = ? AND boutique_id = ?',
            [service_id, boutique_id]
        );
        if (!service.length) {
            throw new Error('Service non trouvé');
        }
        if (!service[0].disponible) {
            throw new Error('Service non disponible');
        }
        if (parseFloat(prix) !== parseFloat(service[0].prix)) {
            throw new Error('Prix incorrect pour ce service');
        }

        // Insérer la demande de service
        const [result] = await connexion.execute(
            `INSERT INTO demandes_services (
        utilisateur_id, boutique_id, service_id, prix, statut, moyen_paiement,
        client_latitude, client_longitude, client_nom, client_telephone, adresse, notes
      ) VALUES (?, ?, ?, ?, 'en_attente', ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.utilisateur.id,
                boutique_id,
                service_id,
                prix,
                moyen_paiement,
                client_latitude,
                client_longitude,
                client_nom.trim(),
                client_telephone.trim(),
                adresse || '',
                notes || '',
            ]
        );

        const demandeId = result.insertId;

        // Créer notification pour le gérant (optionnel mais recommandé)
        try {
            await connexion.execute(
                `INSERT INTO notifications (utilisateur_id, message, type, date)
         VALUES (?, ?, 'demande_service', NOW())`,
                [
                    boutique[0].gerant_id,
                    `Nouvelle demande de service de ${client_nom} - ${service[0].prix} GNF`,
                ]
            );
        } catch (notifError) {
            console.log('Erreur notification gérant:', notifError.message);
            // On continue même si la notification échoue
        }

        await connexion.commit();

        res.status(201).json({
            message: 'Demande de service créée avec succès',
            demande_id: demandeId,
            statut: 'en_attente',
        });
    } catch (error) {
        if (connexion) await connexion.rollback();
        console.error('Erreur création demande service:', error);
        res.status(400).json({ erreur: error.message || 'Erreur lors de la création de la demande de service' });
    } finally {
        if (connexion) connexion.release();
    }
});
