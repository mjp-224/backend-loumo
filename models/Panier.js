const { pool } = require('../config/database');

const Panier = {
  async create({ utilisateur_id, article_id, service_id, boutique_id }) {
    const [resultat] = await pool.execute(
      'INSERT INTO paniers (utilisateur_id, article_id, service_id, boutique_id) VALUES (?, ?, ?, ?)',
      [utilisateur_id, article_id || null, service_id || null, boutique_id]
    );
    return resultat.insertId;
  },

  async findByUtilisateurId(utilisateur_id) {
    const [paniers] = await pool.execute(
      'SELECT p.id, p.boutique_id, p.article_id, p.service_id, p.date_ajout, a.nom AS article_nom, a.prix AS article_prix, a.date_prod, a.date_exp, s.nom AS service_nom, s.prix AS service_prix, b.nom AS boutique_nom ' +
      'FROM paniers p ' +
      'LEFT JOIN articles a ON p.article_id = a.id ' +
      'LEFT JOIN services s ON p.service_id = s.id ' +
      'JOIN boutiques b ON p.boutique_id = b.id ' +
      'WHERE p.utilisateur_id = ?',
      [utilisateur_id]
    );
    return paniers;
  },

  async delete(id, utilisateur_id) {
    await pool.execute('DELETE FROM paniers WHERE id = ? AND utilisateur_id = ?', [id, utilisateur_id]);
  },

  async findByUtilisateurAndBoutique(utilisateur_id, boutique_id) {
    const [paniers] = await pool.execute(
      'SELECT p.id, p.article_id, p.service_id, a.prix AS article_prix, s.prix AS service_prix ' +
      'FROM paniers p ' +
      'LEFT JOIN articles a ON p.article_id = a.id ' +
      'LEFT JOIN services s ON p.service_id = s.id ' +
      'WHERE p.utilisateur_id = ? AND p.boutique_id = ?',
      [utilisateur_id, boutique_id]
    );
    return paniers;
  },

  async deleteByUtilisateurAndBoutique(utilisateur_id, boutique_id) {
    await pool.execute('DELETE FROM paniers WHERE utilisateur_id = ? AND boutique_id = ?', [utilisateur_id, boutique_id]);
  }
};

module.exports = Panier;