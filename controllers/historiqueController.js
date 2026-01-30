const { pool } = require('../config/database');

exports.listerHistoriqueVisites = async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [visites] = await pool.execute(
      'SELECT h.boutique_id, h.date_visite, h.frequence, b.nom AS boutique_nom ' +
      'FROM historique_visites h JOIN boutiques b ON h.boutique_id = b.id ' +
      'WHERE h.utilisateur_id = ?',
      [req.utilisateur.id]
    );
    res.json(visites);
  } catch (erreur) {
    console.error('Erreur liste historique:', erreur);
    res.status(500).json({ erreur: erreur.message || 'Erreur serveur' });
  }
};

exports.getDepenses = async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [depenses] = await pool.execute(
      'SELECT SUM(prix) AS total_depenses FROM commandes WHERE utilisateur_id = ? AND statut = ?',
      [req.utilisateur.id, 'terminée']
    );
    res.json({ total_depenses: depenses[0].total_depenses || 0 });
  } catch (erreur) {
    console.error('Erreur get dépenses:', erreur);
    res.status(500).json({ erreur: erreur.message || 'Erreur serveur' });
  }
};


exports.ajouterVisite = async (req, res) => {
  try {
    const { boutique_id } = req.body;
    await pool.execute(
      'INSERT INTO historique_visites (utilisateur_id, boutique_id, date_visite, frequence) VALUES (?, ?, NOW(), 1) ' +
      'ON DUPLICATE KEY UPDATE frequence = frequence + 1',
      [req.utilisateur.id, boutique_id]
    );
    res.json({ message: 'Visite enregistrée' });
  } catch (erreur) {
    res.status(500).json({ erreur: erreur.message });
  }
};