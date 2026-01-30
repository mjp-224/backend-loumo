const pool = require('../config/db');
const { notifyAdmins } = require('../utils/adminNotification');

// Créer une commande
exports.createCommande = async (req, res) => {
  // Support both params (/:id/commandes) and body (POST /commandes)
  const boutiqueId = req.params.id ? parseInt(req.params.id) : req.body.boutique_id;

  // Extract all fields
  const {
    article_id, service_id, quantite, prix, moyen_paiement,
    client_latitude, client_longitude, client_nom, client_telephone, adresse_livraison
  } = req.body;

  try {
    // Validation
    if (!boutiqueId) return res.status(400).json({ erreur: 'Boutique ID requis' });
    if (!article_id && !service_id) return res.status(400).json({ erreur: 'Article ou Service requis' });
    if (!quantite || isNaN(quantite) || quantite <= 0) return res.status(400).json({ erreur: 'Quantité invalide' });
    if (!prix || isNaN(prix) || prix <= 0) return res.status(400).json({ erreur: 'Prix invalide' });

    // Client validation (if provided)
    if (client_nom && (typeof client_nom !== 'string' || client_nom.trim().length < 2)) {
      return res.status(400).json({ erreur: 'Nom du client invalide' });
    }
    if (client_telephone && (typeof client_telephone !== 'string' || !/^\+?\d{7,15}$/.test(client_telephone))) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
    }
    if (adresse_livraison && typeof adresse_livraison !== 'string') {
      return res.status(400).json({ erreur: 'Adresse de livraison invalide' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check Boutique
      const [boutique] = await connection.execute('SELECT id, gerant_id FROM boutiques WHERE id = ?', [boutiqueId]);
      if (!boutique.length) throw new Error('Boutique non trouvée');

      let image = null;
      let nomItem = '';
      let typeItem = '';

      // Check Item
      if (article_id) {
        const [article] = await connection.execute('SELECT id, prix, stock, image, nom FROM articles WHERE id = ? AND boutique_id = ?', [article_id, boutiqueId]);
        if (!article.length) throw new Error('Article non trouvé');
        if (article[0].stock < quantite) throw new Error('Stock insuffisant pour cet article');
        // Tolerance for float math could be added, but strict check for now
        // if (parseFloat(prix) !== parseFloat(article[0].prix) * quantite) throw new Error('Prix incorrect'); 
        image = article[0].image;
        nomItem = article[0].nom;
        typeItem = 'article';
      } else if (service_id) {
        const [service] = await connection.execute('SELECT id, prix, disponible, image, nom FROM services WHERE id = ? AND boutique_id = ?', [service_id, boutiqueId]);
        if (!service.length) throw new Error('Service non trouvé');
        if (!service[0].disponible) throw new Error('Service non disponible');
        image = service[0].image;
        nomItem = service[0].nom;
        typeItem = 'service';
      }

      // Insert Commande
      const [result] = await connection.execute(
        `INSERT INTO commandes (
          utilisateur_id, boutique_id, article_id, service_id, quantite, prix,
          statut, moyen_paiement, client_latitude, client_longitude, client_nom,
          client_telephone, adresse_livraison, image, date_creation
        ) VALUES (?, ?, ?, ?, ?, ?, 'en attente', ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.utilisateur.id, boutiqueId, article_id || null, service_id || null, quantite, prix,
          moyen_paiement, client_latitude || null, client_longitude || null,
          client_nom ? client_nom.trim() : null,
          client_telephone ? client_telephone.trim() : null,
          adresse_livraison ? adresse_livraison.trim() : null,
          image
        ]
      );

      // Update Stock
      if (article_id) {
        await connection.execute('UPDATE articles SET stock = stock - ? WHERE id = ?', [quantite, article_id]);
      }

      // Notifications
      const messageGerant = typeItem === 'article'
        ? `🔔 Nouvelle commande d'article\n📦 Article : "${nomItem}"\n🔢 Quantité : ${quantite}\n💰 Total : ${prix} GNF\n👤 Client : ${client_nom || 'N/A'}`
        : `🔔 Nouvelle demande de service\n📦 Service : "${nomItem}"\n💰 Montant : ${prix} GNF\n👤 Client : ${client_nom || 'N/A'}`;

      await connection.execute(
        'INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu) VALUES (?, ?, ?, NOW(), FALSE)',
        [boutique[0].gerant_id, boutiqueId, messageGerant]
      );

      const messageClient = `✅ Commande envoyée : "${nomItem}" (${prix} GNF). En attente de validation.`;
      await connection.execute(
        'INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu) VALUES (?, ?, ?, NOW(), FALSE)',
        [req.utilisateur.id, boutiqueId, messageClient]
      );

      await connection.commit();

      // Admin Notification
      notifyAdmins(
        `Nouvelle commande #${result.insertId} de ${client_nom || 'Client'} (${prix} GNF)`,
        'commande',
        { commande_id: result.insertId }
      );

      res.json({ message: 'Commande créée avec succès', commande_id: result.insertId });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Erreur créa commande:', error);
    if (['Boutique non trouvée', 'Article non trouvé', 'Service non trouvé'].includes(error.message)) {
      res.status(404).json({ erreur: error.message });
    } else if (['Stock insuffisant pour cet article', 'Service non disponible'].includes(error.message)) {
      res.status(400).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur lors de la création de la commande' });
    }
  }
};

// Récupérer les commandes
exports.getCommandes = async (req, res) => {
  try {
    let commandes = [];
    let demandesServices = [];

    if (req.utilisateur.type === 'client') {
      [commandes] = await pool.execute(
        `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
                c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id, c.image,
                c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone,
                'commande' AS type
         FROM commandes c
         LEFT JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE c.utilisateur_id = ?`,
        [req.utilisateur.id]
      );

      [demandesServices] = await pool.execute(
        `SELECT ds.id, ds.utilisateur_id, ds.boutique_id, NULL AS article_id, ds.service_id, 
                1 AS quantite, ds.prix, ds.statut, ds.moyen_paiement, ds.date_creation, 
                NULL AS livreur_id, ds.client_latitude, ds.client_longitude, 
                ds.client_nom, ds.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                NULL AS article_nom, NULL AS article_description, NULL AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                NULL AS livreur_nom, NULL AS livreur_prenom, NULL AS livreur_telephone,
                s.image AS image, 'demande_service' AS type
         FROM demandes_services ds
         LEFT JOIN boutiques b ON ds.boutique_id = b.id
         LEFT JOIN services s ON ds.service_id = s.id
         WHERE ds.utilisateur_id = ?`,
        [req.utilisateur.id]
      );
    } else if (req.utilisateur.type === 'gerant') {
      [commandes] = await pool.execute(
        `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
                c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id, c.image,
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

      [demandesServices] = await pool.execute(
        `SELECT ds.id, ds.utilisateur_id, ds.boutique_id, NULL AS article_id, ds.service_id,
                1 AS quantite, ds.prix, ds.statut, ds.moyen_paiement, ds.date_creation,
                NULL AS livreur_id, ds.client_latitude, ds.client_longitude,
                ds.client_nom, ds.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                NULL AS article_nom, NULL AS article_description, NULL AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                NULL AS livreur_nom, NULL AS livreur_prenom, NULL AS livreur_telephone,
                s.image AS image, 'demande_service' AS type
         FROM demandes_services ds
         JOIN boutiques b ON ds.boutique_id = b.id
         LEFT JOIN services s ON ds.service_id = s.id
         WHERE b.gerant_id = ?`,
        [req.utilisateur.id]
      );
    } else if (req.utilisateur.type === 'livreur') {
      [commandes] = await pool.execute(
        `SELECT 
          c.id, c.boutique_id, c.client_latitude, c.client_longitude, c.statut, 
          c.client_nom, c.client_telephone, c.adresse_livraison, 
          c.date_creation AS reference, c.image, c.quantite, c.prix, 
          b.nom AS boutique_nom,
          u.nom AS client_nom_utilisateur, u.telephone AS client_telephone_utilisateur,
          a.nom AS article_nom, s.nom AS service_nom
        FROM commandes c
        JOIN boutiques b ON c.boutique_id = b.id
        LEFT JOIN clients u ON c.utilisateur_id = u.id
        LEFT JOIN articles a ON c.article_id = a.id
        LEFT JOIN services s ON c.service_id = s.id
        WHERE c.livreur_id = ? AND c.statut IN ('en attente', 'en cours de livraison', 'livrée')`,
        [req.utilisateur.id]
      );
      // No demandesServices for livreur as per server.js logic (or imply only commandes)
      demandesServices = [];
    }

    // Sort combined list only if we have mixed types or just standard sort
    const toutesLesCommandes = [...commandes, ...demandesServices].sort((a, b) =>
      new Date(b.date_creation || b.reference) - new Date(a.date_creation || a.reference)
    );

    res.json(toutesLesCommandes);
  } catch (erreur) {
    console.error('Erreur GET /commandes:', erreur);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des commandes' });
  }
};

// Récupérer une commande par ID
exports.getCommandeById = async (req, res) => {
  const commandeId = parseInt(req.params.id);

  if (isNaN(commandeId)) {
    return res.status(400).json({ erreur: 'ID de commande invalide' });
  }

  try {
    // Requête complète avec toutes les informations
    const [commandes] = await pool.execute(
      `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
              c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id, c.image AS commande_image,
              c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone, c.adresse_livraison,
              b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image, b.gerant_id,
              a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
              s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
              l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone,
              cl.nom AS client_nom_compte, cl.prenom AS client_prenom, cl.email AS client_email
       FROM commandes c
       LEFT JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN services s ON c.service_id = s.id
       LEFT JOIN livreurs l ON c.livreur_id = l.id
       LEFT JOIN clients cl ON c.utilisateur_id = cl.id
       WHERE c.id = ?`,
      [commandeId]
    );

    if (!commandes.length) {
      return res.status(404).json({ erreur: 'Commande non trouvée' });
    }

    const commande = commandes[0];

    // Vérifier les droits d'accès selon le type d'utilisateur
    if (req.utilisateur.type === 'gerant') {
      if (commande.gerant_id !== req.utilisateur.id) {
        return res.status(403).json({ erreur: 'Accès refusé à cette commande' });
      }
    } else if (req.utilisateur.type === 'client') {
      if (commande.utilisateur_id !== req.utilisateur.id) {
        return res.status(403).json({ erreur: 'Accès refusé à cette commande' });
      }
    } else if (req.utilisateur.type === 'livreur') {
      if (commande.livreur_id !== req.utilisateur.id) {
        return res.status(403).json({ erreur: 'Accès refusé à cette commande' });
      }
    }

    res.json(commande);
  } catch (erreur) {
    console.error('Erreur GET /commandes/:id:', erreur);
    res.status(500).json({ erreur: 'Erreur lors de la récupération de la commande' });
  }
};

exports.getCommandesByBoutique = async (req, res) => {
  const boutiqueId = parseInt(req.params.id);
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  try {
    // Vérifier que la boutique appartient au gérant
    const [boutique] = await pool.execute('SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?', [boutiqueId, req.utilisateur.id]);
    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Accès non autorisé à cette boutique' });
    }

    const [commandes] = await pool.execute(
      `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
              c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id, c.image,
              c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone,
              b.nom AS boutique_nom,
              a.nom AS article_nom,
              s.nom AS service_nom,
              l.nom AS livreur_nom, l.prenom AS livreur_prenom
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN services s ON c.service_id = s.id
       LEFT JOIN livreurs l ON c.livreur_id = l.id
       WHERE c.boutique_id = ?
       ORDER BY c.date_creation DESC`,
      [boutiqueId]
    );

    res.json(commandes);
  } catch (erreur) {
    console.error('Erreur GET /boutiques/:id/commandes:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

exports.livrerCommande = async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  const commandeId = parseInt(req.params.id);
  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();

    const [commande] = await connexion.execute(
      `SELECT c.id, c.livreur_id, c.boutique_id, c.utilisateur_id, b.gerant_id, l.nom AS livreur_nom, l.prenom AS livreur_prenom
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       JOIN livreurs l ON c.livreur_id = l.id
       WHERE c.id = ? AND c.livreur_id = ? AND c.statut = 'en cours de livraison'`,
      [commandeId, req.utilisateur.id]
    );

    if (!commande.length) {
      // return res.status(403).json({ erreur: 'Commande non trouvée, non autorisée, ou pas en cours de livraison' });
      return res.status(403).json({ erreur: 'Commande déjà livrée ou non trouvée' });
    }

    await connexion.execute(
      `UPDATE commandes SET statut = 'livrée' WHERE id = ?`,
      [commandeId]
    );

    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Notification au LIVREUR (Confirmation)
    const messageLivreur = `Succès ! Vous avez livré la commande #${commandeId}. Bon travail.`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [req.utilisateur.id, commande[0].boutique_id, messageLivreur, date]
    );

    // 2. Notification au CLIENT
    const messageClient = `📦 Votre commande #${commandeId} a été livrée avec succès. Merci de votre confiance !`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [commande[0].utilisateur_id, commande[0].boutique_id, messageClient, date]
    );

    // 3. Notification au GERANT
    const nomLivreurComplet = `${commande[0].livreur_prenom} ${commande[0].livreur_nom}`;
    const messageGerant = `✅ La commande #${commandeId} a bien été livrée par ${nomLivreurComplet}.`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [commande[0].gerant_id, commande[0].boutique_id, messageGerant, date]
    );

    await connexion.commit();

    // Admin Notification
    notifyAdmins(
      `Commande #${commandeId} livrée par ${commande[0].livreur_prenom} ${commande[0].livreur_nom}`,
      'livraison',
      { commande_id: commandeId, livreur_id: req.utilisateur.id }
    );

    res.json({ message: 'Commande marquée comme livrée' });
  } catch (erreur) {
    if (connexion) await connexion.rollback();
    console.error('Erreur lors de la livraison:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  } finally {
    if (connexion) connexion.release();
  }
};

// Update Statut
exports.updateStatut = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { statut } = req.body;
    if (!['en attente', 'acceptée', 'en préparation', 'livrée', 'en cours de livraison', 'annulée'].includes(statut)) {
      return res.status(400).json({ erreur: 'Statut invalide' });
    }

    const [commande] = await pool.execute(
      'SELECT b.gerant_id, c.utilisateur_id, c.id, c.boutique_id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ?',
      [req.params.id]
    );

    if (!commande.length || commande[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    await pool.execute('UPDATE commandes SET statut = ? WHERE id = ?', [statut, req.params.id]);

    // Notification au CLIENT
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const messageClient = `Votre commande #${req.params.id} est maintenant : ${statut}`;

    await pool.execute(
      'INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu) VALUES (?, ?, ?, ?, FALSE)',
      [commande[0].utilisateur_id, commande[0].boutique_id, messageClient, date]
    );

    res.json({ message: 'Commande mise à jour et client notifié' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

// Paiement (Simulé)
exports.confirmerPaiement = async (req, res) => {
  const commandeId = parseInt(req.params.id);
  const { moyen_paiement } = req.body;
  const utilisateurId = req.utilisateur.id;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (!commandeId || isNaN(commandeId)) {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
    }

    const [commande] = await connection.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    if (!commande.length) {
      await connection.rollback();
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }

    if (commande[0].statut !== 'en attente') {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Cette commande a déjà été payée ou annulée' });
    }

    const [existingPaiement] = await connection.query(
      'SELECT id FROM paiements WHERE commande_id = ?',
      [commandeId]
    );
    if (existingPaiement.length > 0) {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Un paiement existe déjà pour cette commande' });
    }

    const [boutique] = await connection.query('SELECT id FROM boutiques WHERE id = ?', [commande[0].boutique_id]);
    if (!boutique.length) {
      await connection.rollback();
      return res.status(404).json({ erreur: 'Boutique non trouvée pour la commande' });
    }

    const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    let otp = null, reference_3ds = null;
    if (['Orange Money', 'Mobile Money', 'John-Pay', 'Paiement à la livraison'].includes(moyen_paiement)) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    } else if (moyen_paiement === 'Paypal') {
      reference_3ds = `3DS-${Date.now()}`;
    }

    await connection.query(
      'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
      ['en préparation', moyen_paiement, commandeId]
    );

    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.query(
      'INSERT INTO paiements (commande_id, utilisateur_id, boutique_id, montant, moyen_paiement, date) VALUES (?, ?, ?, ?, ?, ?)',
      [commandeId, utilisateurId, commande[0].boutique_id, commande[0].prix, moyen_paiement, date]
    );

    const [gerant] = await connection.query(
      'SELECT g.id FROM gerants g JOIN boutiques b ON g.id = b.gerant_id WHERE b.id = ?',
      [commande[0].boutique_id]
    );
    if (gerant.length) {
      const message = `Nouveau paiement reçu pour la commande #${commandeId} via ${moyen_paiement}.`;
      await connection.query(
        'INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu) VALUES (?, ?, ?, ?, ?)',
        [gerant[0].id, commande[0].boutique_id, message, date, false]
      );
    }

    await connection.commit();

    // Admin Notification
    notifyAdmins(
      `Paiement confirmé pour commande #${commandeId} via ${moyen_paiement} (${commande[0].prix} GNF)`,
      'commande',
      { commande_id: commandeId }
    );

    res.json({
      message: 'Paiement effectué avec succès',
      moyen_paiement,
      transaction_id: transactionId,
      otp,
      reference_3ds,
      commande_id: commandeId,
      montant: commande[0].prix,
      date
    });
  } catch (erreur) {
    if (connection) await connection.rollback();
    console.error('Erreur lors du traitement du paiement:', erreur);
    if (erreur.message.includes('non trouvée')) {
      res.status(404).json({ erreur: erreur.message });
    } else if (erreur.message.includes('invalide') || erreur.message.includes('déjà')) {
      res.status(400).json({ erreur: erreur.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur lors du traitement du paiement' });
    }
  } finally {
    if (connection) connection.release();
  }
};

// Payer (endpoint simplifié utilisé pour confirmer la livraison ou autre ?)
exports.payerCommande = async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    // Note: this endpoint seems duplicate or simplified version of confirmerPaiement logic.
    // Kept to match source lines 2262.
    const { moyen_paiement } = req.body;
    const moyensPaiement = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal', 'Paiement à la livraison'];
    if (!moyen_paiement || !moyensPaiement.includes(moyen_paiement)) {
      return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
    }
    const [commande] = await pool.execute(
      'SELECT statut, utilisateur_id FROM commandes WHERE id = ?',
      [req.params.id]
    );
    if (!commande.length || commande[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou accès refusé' });
    }
    if (commande[0].statut !== 'en attente') {
      return res.status(400).json({ erreur: 'Seules les commandes en attente peuvent être payées' });
    }
    await pool.execute(
      'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
      ['en préparation', moyen_paiement, req.params.id]
    );
    res.json({ message: 'Paiement effectué' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.demanderReduction = async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { montant_propose } = req.body;
    if (!montant_propose || isNaN(montant_propose) || montant_propose <= 0) {
      return res.status(400).json({ erreur: 'Montant proposé invalide' });
    }
    const [commande] = await pool.execute(
      'SELECT c.*, b.gerant_id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ?',
      [req.params.id]
    );
    if (!commande.length || commande[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou accès refusé' });
    }
    if (commande[0].statut !== 'en attente') {
      return res.status(400).json({ erreur: 'Seules les commandes en attente peuvent demander une réduction' });
    }
    if (montant_propose >= commande[0].prix) {
      return res.status(400).json({ erreur: 'Le montant proposé doit être inférieur au prix actuel' });
    }
    const [resultat] = await pool.execute(
      'INSERT INTO reductions (commande_id, utilisateur_id, montant_propose, statut) VALUES (?, ?, ?, ?)',
      [req.params.id, req.utilisateur.id, montant_propose, 'en attente']
    );

    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const messageGerant = `💰 Nouvelle demande de réduction
🏪 Commande #${req.params.id}
💸 Prix initial : ${commande[0].prix} GNF
🔽 Prix proposé : ${montant_propose} GNF
📉 Réduction demandée : ${(commande[0].prix - montant_propose).toFixed(2)} GNF
👤 Client : ${commande[0].client_nom || 'N/A'}
📞 Téléphone : ${commande[0].client_telephone || 'N/A'}`;
    await pool.execute(
      'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
      [commande[0].boutique_id, commande[0].gerant_id, messageGerant, date]
    );

    const messageClient = `✅ Demande de réduction envoyée
🏪 Commande #${req.params.id}
💸 Prix actuel : ${commande[0].prix} GNF
🔽 Prix proposé : ${montant_propose} GNF
⏳ En attente de validation du gérant`;
    await pool.execute(
      'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
      [commande[0].boutique_id, req.utilisateur.id, messageClient, date]
    );

    // Admin Notification
    notifyAdmins(
      `Nouvelle demande de réduction sur Commande #${req.params.id} par ${req.utilisateur.nom} (${commande[0].prix} -> ${montant_propose} GNF)`,
      'reduction',
      { commande_id: req.params.id, utilisateur_id: req.utilisateur.id }
    );

    res.json({ message: 'Demande de réduction envoyée', id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

// Assigner une commande à un livreur
exports.assignerCommande = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const commandeId = parseInt(req.params.id);
  const { livreur_id } = req.body;

  if (!livreur_id || isNaN(livreur_id)) {
    return res.status(400).json({ erreur: 'ID du livreur requis et doit être un nombre' });
  }

  if (isNaN(commandeId)) {
    return res.status(400).json({ erreur: 'ID de commande invalide' });
  }

  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();

    // Vérifier la commande
    const [commande] = await connexion.execute(
      `SELECT c.id, c.boutique_id, c.statut, c.livreur_id, c.client_latitude, c.client_longitude
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.id = ? AND b.gerant_id = ?`,
      [commandeId, req.utilisateur.id]
    );

    if (!commande.length) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }

    if (!['en attente', 'en préparation'].includes(commande[0].statut)) {
      return res.status(400).json({ erreur: 'La commande doit être en statut "en attente" ou "en préparation"' });
    }

    if (commande[0].livreur_id !== null) {
      return res.status(400).json({ erreur: 'Commande déjà assignée à un livreur' });
    }

    // Vérifier le livreur
    const [livreur] = await connexion.execute(
      'SELECT id, actif, nom, prenom FROM livreurs WHERE id = ? AND boutique_id = ?',
      [livreur_id, commande[0].boutique_id]
    );

    if (!livreur.length) {
      return res.status(404).json({ erreur: 'Livreur non trouvé pour cette boutique' });
    }

    if (!livreur[0].actif) {
      return res.status(400).json({ erreur: 'Livreur inactif' });
    }

    // Assigner la commande
    await connexion.execute(
      `UPDATE commandes
       SET livreur_id = ?, statut = 'en cours de livraison'
       WHERE id = ?`,
      [livreur_id, commandeId]
    );

    // Envoyer une notification au livreur
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `🚀 NOUVELLE MISSION : Commande #${commandeId} vous est assignée. À récupérer et livrer immédiatement !`;

    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [livreur_id, commande[0].boutique_id, message, date]
    );

    await connexion.commit();

    // Admin Notification
    notifyAdmins(
      `Commande #${commandeId} assignée au livreur ${livreur[0].prenom} ${livreur[0].nom}`,
      'commande',
      { commande_id: commandeId, livreur_id: livreur_id }
    );

    res.json({
      message: 'Commande assignée avec succès',
      commande: {
        id: commandeId,
        client_latitude: commande[0].client_latitude,
        client_longitude: commande[0].client_longitude,
      },
    });

  } catch (erreur) {
    if (connexion) await connexion.rollback();
    console.error('Erreur lors de l\'assignation de la commande:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'assignation' });
  } finally {
    if (connexion) connexion.release();
  }
};

exports.deleteCommande = async (req, res) => {
  const commandeId = parseInt(req.params.id);
  const utilisateurId = req.utilisateur.id;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (!commandeId || isNaN(commandeId)) {
      throw new Error('Identifiant de commande invalide');
    }

    const [commande] = await connection.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    if (!commande.length) {
      throw new Error('Commande non trouvée ou non autorisée');
    }

    const [paiements] = await connection.query(
      'SELECT * FROM paiements WHERE commande_id = ?',
      [commandeId]
    );
    if (paiements.length > 0) {
      throw new Error('La commande a des paiements associés et ne peut pas être supprimée');
    }

    if (commande[0].livreur_id) {
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `La commande #${commandeId} à laquelle vous étiez assigné a été annulée.`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [commande[0].boutique_id, commande[0].livreur_id, message, date]
      );
    }

    if (commande[0].article_id) {
      const quantite = commande[0].quantite || 1;
      const [article] = await connection.query('SELECT * FROM articles WHERE id = ?', [commande[0].article_id]);
      if (!article.length) {
        throw new Error('Article non trouvé');
      }

      await connection.query(
        'UPDATE articles SET stock = stock + ? WHERE id = ?',
        [quantite, commande[0].article_id]
      );
    }

    // Notification au GERANT
    // On récupère le gérant via la boutique de la commande
    const [boutiqueInfo] = await connection.query(
      'SELECT gerant_id, nom FROM boutiques WHERE id = ?',
      [commande[0].boutique_id]
    );

    if (boutiqueInfo.length) {
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      // Récupérer infos client pour le message si possible, sinon générique
      // Commande[0] contient utilisateur_id, on pourrait fetcher le nom mais "Le client" suffit
      const messageGerant = `❌ Commande #${commandeId} annulée par le client.`;

      await connection.query(
        'INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu) VALUES (?, ?, ?, ?, FALSE)',
        [boutiqueInfo[0].gerant_id, commande[0].boutique_id, messageGerant, date]
      );
    }

    await connection.query('DELETE FROM commandes WHERE id = ?', [commandeId]);

    await connection.commit();
    res.status(200).json({ message: 'Commande annulée avec succès' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur annulation commande:', error);
    if (['Identifiant de commande invalide', 'La commande a des paiements associés et ne peut pas être supprimée'].includes(error.message)) {
      res.status(400).json({ erreur: error.message });
    } else if (['Commande non trouvée ou non autorisée', 'Article non trouvé'].includes(error.message)) {
      res.status(404).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur lors de l\'annulation de la commande' });
    }
  } finally {
    if (connection) connection.release();
  }
};