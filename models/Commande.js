const { pool } = require('../config/database');

const Commande = {
  async create({ utilisateur_id, boutique_id, prix, statut, moyen_paiement, article_id, service_id }) {
    const [resultat] = await pool.execute(
      'INSERT INTO commandes (utilisateur_id, boutique_id, prix, statut, moyen_paiement, article_id, service_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [utilisateur_id, boutique_id, prix, statut, moyen_paiement || null, article_id || null, service_id || null]
    );
    return resultat.insertId;
  },

  async update(id, { statut, moyen_paiement }) {
    await pool.execute('UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?', [statut, moyen_paiement || null, id]);
  },

  async delete(id) {
    await pool.execute('DELETE FROM commandes WHERE id = ?', [id]);
  },

  async findByUtilisateurId(utilisateur_id) {
    const [commandes] = await pool.execute(
      'SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.prix, c.statut, c.moyen_paiement, c.date_creation, b.nom AS boutique_nom ' +
      'FROM commandes c JOIN boutiques b ON c.boutique_id = b.id ' +
      'WHERE c.utilisateur_id = ?',
      [utilisateur_id]
    );
    return commandes;
  },

  async findByGerantId(gerant_id) {
    const [commandes] = await pool.execute(
      'SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.prix, c.statut, c.moyen_paiement, c.date_creation, b.nom AS boutique_nom ' +
      'FROM commandes c JOIN boutiques b ON c.boutique_id = b.id ' +
      'WHERE b.gerant_id = ?',
      [gerant_id]
    );
    return commandes;
  },

  async findById(id) {
    const [commande] = await pool.execute('SELECT id, statut FROM commandes WHERE id = ?', [id]);
    return commande[0];
  },

  async findByIdAndUtilisateur(id, utilisateur_id) {
    const [commande] = await pool.execute('SELECT id, statut FROM commandes WHERE id = ? AND utilisateur_id = ?', [id, utilisateur_id]);
    return commande[0];
  },

  async findByIdAndGerant(id, gerant_id) {
    const [commande] = await pool.execute(
      'SELECT c.id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ? AND b.gerant_id = ?',
      [id, gerant_id]
    );
    return commande[0];
  },

  async findByIdAndUtilisateurOrGerant(id, utilisateur_id, gerant_id, statut) {
    let query = 'SELECT c.id, c.statut, b.gerant_id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ?';
    let params = [id];
    if (utilisateur_id) {
      query += ' AND c.utilisateur_id = ? AND c.statut = ?';
      params.push(utilisateur_id, statut);
    } else {
      query += ' AND b.gerant_id = ?';
      params.push(gerant_id);
    }
    const [commande] = await pool.execute(query, params);
    return commande[0];
  }
};

module.exports = Commande;