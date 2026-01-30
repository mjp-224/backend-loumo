const { pool } = require('../config/database');

const Reduction = {
  async create({ commande_id, utilisateur_id, montant_propose }) {
    const [resultat] = await pool.execute(
      'INSERT INTO reductions (commande_id, utilisateur_id, montant_propose) VALUES (?, ?, ?)',
      [commande_id, utilisateur_id, montant_propose]
    );
    return resultat.insertId;
  },

  async findByGerantId(gerant_id) {
    const [reductions] = await pool.execute(
      'SELECT r.id, r.commande_id, r.utilisateur_id, r.montant_propose, r.statut, r.date_creation, u.nom, u.prenom ' +
      'FROM reductions r JOIN commandes c ON r.commande_id = c.id JOIN boutiques b ON c.boutique_id = b.id JOIN clients u ON r.utilisateur_id = u.id ' +
      'WHERE b.gerant_id = ?',
      [gerant_id]
    );
    return reductions;
  },

  async update(id, statut) {
    await pool.execute('UPDATE reductions SET statut = ? WHERE id = ?', [statut, id]);
  },

  async findByIdAndGerant(id, gerant_id) {
    const [reduction] = await pool.execute(
      'SELECT r.id FROM reductions r JOIN commandes c ON r.commande_id = c.id JOIN boutiques b ON c.boutique_id = b.id WHERE r.id = ? AND b.gerant_id = ?',
      [id, gerant_id]
    );
    return reduction[0];
  }
};

module.exports = Reduction;