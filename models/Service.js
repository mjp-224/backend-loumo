const { pool } = require('../config/database');

const Service = {
  async create({ boutique_id, nom, description, prix, disponible, image }) {
    const [resultat] = await pool.execute(
      'INSERT INTO services (boutique_id, nom, description, prix, disponible, image) VALUES (?, ?, ?, ?, ?, ?)',
      [boutique_id, nom, description || null, prix, disponible, image || null]
    );
    return resultat.insertId;
  },

  async update(id, boutique_id, { nom, description, prix, disponible, image }) {
    await pool.execute(
      'UPDATE services SET nom = ?, description = ?, prix = ?, disponible = ?, image = ? WHERE id = ? AND boutique_id = ?',
      [nom, description || null, prix, disponible, image || null, id, boutique_id]
    );
  },

  async delete(id, boutique_id) {
    await pool.execute('DELETE FROM services WHERE id = ? AND boutique_id = ?', [id, boutique_id]);
  },

  async findByBoutiqueId(boutique_id) {
    const [services] = await pool.execute(
      'SELECT id, boutique_id, nom, description, prix, disponible, image FROM services WHERE boutique_id = ?',
      [boutique_id]
    );
    return services;
  }
};

module.exports = Service;