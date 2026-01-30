const pool = require('../config/db');

exports.getReductions = async (req, res) => {
  const { boutique_id } = req.query;
  const userId = req.utilisateur.id;
  const userType = req.utilisateur.type;

  try {
    if (userType !== 'gerant') {
      return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent voir les demandes de réduction.' });
    }

    let query;
    let params = [];

    if (boutique_id && !isNaN(parseInt(boutique_id))) {
      // Vérifier que la boutique appartient au gérant
      const [boutique] = await pool.execute(
        'SELECT id, gerant_id FROM boutiques WHERE id = ? AND gerant_id = ?',
        [parseInt(boutique_id), userId]
      );
      if (!boutique.length) {
        return res.status(403).json({ erreur: 'Boutique non trouvée ou vous n\'êtes pas autorisé à y accéder.' });
      }

      query = `
        SELECT r.*, c.id AS commande_id, c.prix AS commande_prix, u.nom AS utilisateur_nom, u.prenom
        FROM reductions r
        JOIN commandes c ON r.commande_id = c.id
        JOIN clients u ON r.utilisateur_id = u.id
        WHERE c.boutique_id = ?
        ORDER BY r.date_creation DESC
      `;
      params = [parseInt(boutique_id)];
    } else {
      // Récupérer toutes les réductions pour les boutiques du gérant
      query = `
        SELECT r.*, c.id AS commande_id, c.prix AS commande_prix, u.nom AS utilisateur_nom, u.prenom
        FROM reductions r
        JOIN commandes c ON r.commande_id = c.id
        JOIN clients u ON r.utilisateur_id = u.id
        WHERE c.boutique_id IN (
          SELECT id FROM boutiques WHERE gerant_id = ?
        )
        ORDER BY r.date_creation DESC
      `;
      params = [userId];
    }

    const [reductions] = await pool.execute(query, params);
    res.json(reductions);
  } catch (erreur) {
    console.error('Erreur détaillée dans GET /reductions:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des demandes de réduction.' });
  }
};

exports.updateReduction = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent gérer les réductions.' });
  }
  const { statut } = req.body;
  if (!['acceptée', 'refusée'].includes(statut)) {
    return res.status(400).json({ erreur: 'Statut invalide' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [reductions] = await connection.query(
      `SELECT r.*, c.*
       FROM reductions r
       JOIN commandes c ON r.commande_id = c.id
       WHERE r.id = ? AND c.boutique_id IN (SELECT id FROM boutiques WHERE gerant_id = ?)`,
      [req.params.id, req.utilisateur.id]
    );

    if (!reductions.length) {
      await connection.rollback();
      return res.status(404).json({ erreur: 'Demande de réduction non trouvée ou non autorisée' });
    }

    const reduction = reductions[0];
    if (reduction.statut !== 'en attente') {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Cette demande a déjà été traitée' });
    }

    if (statut === 'acceptée') {
      // Mettre à jour le prix de la commande avec le montant proposé
      await connection.query(
        'UPDATE commandes SET prix = ? WHERE id = ?',
        [reduction.montant_propose, reduction.commande_id]
      );

      // Notification au client - RÉDUCTION ACCEPTÉE
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const reduction_montant = (reduction.commande_prix - reduction.montant_propose).toFixed(2);
      const message = `✅ Réduction acceptée !
🏪 Commande #${reduction.commande_id}
🔴 Ancien prix : ${reduction.commande_prix} GNF
🟬 Nouveau prix : ${reduction.montant_propose} GNF
💰 Économie : ${reduction_montant} GNF
🎉 Votre demande a été acceptée par le gérant`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [reduction.boutique_id, reduction.utilisateur_id, message, date]
      );
    } else {
      // Notification au client - RÉDUCTION REFUSÉE
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `❌ Réduction refusée
🏪 Commande #${reduction.commande_id}
💸 Prix maintenu : ${reduction.commande_prix} GNF
😔 Votre demande de réduction a été refusée par le gérant`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [reduction.boutique_id, reduction.utilisateur_id, message, date]
      );
    }

    // Mettre à jour le statut de la réduction
    await connection.query(
      'UPDATE reductions SET statut = ? WHERE id = ?',
      [statut, req.params.id]
    );

    await connection.commit();

    // Admin Notification
    const { notifyAdmins } = require('../utils/adminNotification');
    notifyAdmins(
      `Réduction #${req.params.id} (Commande #${reduction.commande_id}) ${statut} par le gérant`,
      'reduction',
      { reduction_id: req.params.id, commande_id: reduction.commande_id, statut }
    );

    res.json({ message: `Demande de réduction ${statut} avec succès` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur dans PUT /reductions/:id:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la mise à jour de la réduction' });
  } finally {
    if (connection) connection.release();
  }
};