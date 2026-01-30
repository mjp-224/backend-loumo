const { pool } = require('../config/database');

const Historique = {
  async findVisitesByUtilisateurId(utilisateur_id) {
    const [visites] = await pool.execute(
      'SELECT h.boutique_id, h.date_visite, h.frequence, b.nom AS boutique_nom ' +
      'FROM historique_visites h JOIN boutiques b ON h.boutique_id = b.id ' +
      'WHERE h.utilisateur_id = ?',
      [utilisateur_id]
    );
    return visites;
  },

  async getDepensesByUtilisateurId(utilisateur_id) {
    const [depenses] = await pool.execute(
      'SELECT SUM(prix) AS total_depenses FROM commandes WHERE utilisateur_id = ? AND statut = ?',
      [utilisateur_id, 'terminée']
    );
    return depenses[0].total_depenses || 0;
  }
};

module.exports = Historique;