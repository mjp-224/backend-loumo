const { pool } = require('../config/database');

const Livreur = {
  async create({ boutique_id, nom, prenom, telephone, email }) {
    const [resultat] = await pool.execute(
      'INSERT INTO livreurs (boutique_id, nom, prenom, telephone, email) VALUES (?, ?, ?, ?, ?)',
      [boutique_id, nom, prenom, telephone, email || null]
    );
    return resultat.insertId;
  },

  async update(id, boutique_id, { nom, prenom, telephone, email, actif }) {
    await pool.execute(
      'UPDATE livreurs SET nom = ?, prenom = ?, telephone = ?, email = ?, actif = ? WHERE id = ? AND boutique_id = ?',
      [nom, prenom, telephone, email || null, actif, id, boutique_id]
    );
  },

  async delete(id, boutique_id) {
    await pool.execute('DELETE FROM livreurs WHERE id = ? AND boutique_id = ?', [id, boutique_id]);
  },

  async findByBoutiqueId(boutique_id) {
    const [livreurs] = await pool.execute(
      'SELECT id, nom, prenom, telephone, email, actif FROM livreurs WHERE boutique_id = ? AND actif = TRUE',
      [boutique_id]
    );
    return livreurs;
  }
};

module.exports = Livreur;