// CORRECTION NOTIFICATIONS DEMANDES_SERVICES
// Remplacer lignes 6588-6614 dans serveur.js

// Notification pour le gérant - AVEC boutique_id et lu
try {
    await connexion.execute(
        `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
         VALUES (?, ?, ?, NOW(), FALSE)`,
        [
            boutique[0].gerant_id,
            boutique_id,
            `Nouvelle demande de service "${service[0].nom}" de ${client_nom} - ${client_telephone}`,
        ]
    );
} catch (notifError) {
    console.log('Erreur notification gérant:', notifError.message);
}

// Notification pour le client - AVEC boutique_id et lu
try {
    await connexion.execute(
        `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
         VALUES (?, ?, ?, NOW(), FALSE)`,
        [
            req.utilisateur.id,
            boutique_id,
            `Votre demande de service "${service[0].nom}" a été envoyée avec succès. Montant : ${prix} GNF`,
        ]
    );
} catch (notifError) {
    console.log('Erreur notification client:', notifError.message);
}
