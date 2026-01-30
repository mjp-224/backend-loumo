const pool = require('../config/db');

// Récupérer le panier
exports.getPanier = async (req, res) => {
  try {
    const [panier] = await pool.execute(
      `SELECT p.id, p.quantite, p.boutique_id, 
       -- Info Article
       a.id as article_id, a.nom as article_nom, a.prix as article_prix, a.image as article_image,
       -- Info Service
       s.id as service_id, s.nom as service_nom, s.prix as service_prix, s.image as service_image,
       b.nom as boutique_nom
       FROM paniers p
       LEFT JOIN articles a ON p.article_id = a.id
       LEFT JOIN services s ON p.service_id = s.id
       LEFT JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.utilisateur_id = ?`,
      [req.utilisateur.id]
    );
    res.json(panier);
  } catch (error) {
    console.error('Erreur récupération panier:', error);
    res.status(500).json({ erreur: 'Erreur récupération panier' });
  }
};

// Ajouter au panier
exports.addToPanier = async (req, res) => {
  const { article_id, service_id, boutique_id, quantite } = req.body;
  if (!boutique_id) return res.status(400).json({ erreur: 'Boutique ID requis' });

  try {
    // Vérifier si l'item existe déjà dans le panier (optionnel : incrémenter quantité)
    const [existing] = await pool.execute(
      'SELECT id, quantite FROM paniers WHERE utilisateur_id = ? AND boutique_id = ? AND (article_id = ? OR service_id = ?)',
      [req.utilisateur.id, boutique_id, article_id || null, service_id || null]
    );

    if (existing.length > 0) {
      const newQuantite = existing[0].quantite + (quantite || 1);
      await pool.execute('UPDATE paniers SET quantite = ? WHERE id = ?', [newQuantite, existing[0].id]);
      return res.json({ message: 'Quantité mise à jour dans le panier' });
    }

    await pool.execute(
      'INSERT INTO paniers (utilisateur_id, article_id, service_id, boutique_id, quantite) VALUES (?, ?, ?, ?, ?)',
      [req.utilisateur.id, article_id || null, service_id || null, boutique_id, quantite || 1]
    );
    res.json({ message: 'Ajouté au panier' });
  } catch (error) {
    console.error('Erreur ajout panier:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

// Mettre à jour quantité
exports.updateQuantite = async (req, res) => {
  const { id } = req.params; // or body? route says patch /:id
  const { quantite } = req.body;
  // If id is in body (legacy), support it? Route params is cleaner.
  const panierId = id || req.body.id;

  try {
    if (!quantite || quantite < 1) {
      return res.status(400).json({ erreur: 'Quantité invalide' });
    }
    await pool.execute('UPDATE paniers SET quantite = ? WHERE id = ? AND utilisateur_id = ?', [quantite, panierId, req.utilisateur.id]);
    res.json({ message: 'Quantité mise à jour' });
  } catch (error) {
    console.error('Erreur update panier:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

// Supprimer du panier
exports.removeFromPanier = async (req, res) => {
  try {
    await pool.execute('DELETE FROM paniers WHERE id = ? AND utilisateur_id = ?', [req.params.id, req.utilisateur.id]);
    res.json({ message: 'Supprimé du panier' });
  } catch (error) {
    console.error('Erreur suppression panier:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

// Vider le panier
exports.clearPanier = async (req, res) => {
  try {
    await pool.execute('DELETE FROM paniers WHERE utilisateur_id = ?', [req.utilisateur.id]);
    res.json({ message: 'Panier vidé' });
  } catch (error) {
    console.error('Erreur vidage panier:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};