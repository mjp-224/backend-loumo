const { pool } = require('../config/database');

const Article = {
  async create({ boutique_id, nom, description, prix, stock, image, date_prod, date_exp }) {
    const [resultat] = await pool.execute(
      'INSERT INTO articles (boutique_id, nom, description, prix, stock, image, date_prod, date_exp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [boutique_id, nom, description || null, prix, stock, image || null, date_prod || null, date_exp || null]
    );
    return resultat.insertId;
  },

  async update(id, boutique_id, { nom, description, prix, stock, image, date_prod, date_exp }) {
    await pool.execute(
      'UPDATE articles SET nom = ?, description = ?, prix = ?, stock = ?, image = ?, date_prod = ?, date_exp = ? WHERE id = ? AND boutique_id = ?',
      [nom, description || null, prix, stock, image || null, date_prod || null, date_exp || null, id, boutique_id]
    );
  },

  async delete(id, boutique_id) {
    await pool.execute('DELETE FROM articles WHERE id = ? AND boutique_id = ?', [id, boutique_id]);
  },

  async findByBoutiqueId(boutique_id) {
    const [articles] = await pool.execute(
      'SELECT id, boutique_id, nom, description, prix, stock, image, date_prod, date_exp FROM articles WHERE boutique_id = ?',
      [boutique_id]
    );
    return articles;
  }
};

module.exports = Article;