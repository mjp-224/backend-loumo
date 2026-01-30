const { pool } = require('../config/database');

const Boutique = {
  async create({ nom, description, categorie, horaires, latitude, longitude, image, gerant_id }) {
    const [resultat] = await pool.execute(
      'INSERT INTO boutiques (nom, description, categorie, horaires, latitude, longitude, image, gerant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, description || null, categorie, horaires, latitude, longitude, image || null, gerant_id]
    );
    return resultat.insertId;
  },

  async update(id, { nom, description, categorie, horaires, latitude, longitude, image }) {
    await pool.execute(
      'UPDATE boutiques SET nom = ?, description = ?, categorie = ?, horaires = ?, latitude = ?, longitude = ?, image = ? WHERE id = ?',
      [nom, description || null, categorie, horaires, latitude, longitude, image || null, id]
    );
  },

  async findAll() {
    const [boutiques] = await pool.execute('SELECT id, nom, description, categorie, horaires, latitude, longitude, image, gerant_id FROM boutiques');
    return boutiques;
  },

  async findById(id) {
    const [boutique] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [id]);
    return boutique[0];
  },

  async delete(id) {
    await pool.execute('DELETE FROM boutiques WHERE id = ?', [id]);
  },

  async findGerantId(id) {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [id]);
    return boutique[0]?.gerant_id;
  },

  async findDetails(id) {
    const [boutique] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [id]);
    if (!boutique.length) return null;
    const [articles] = await pool.execute('SELECT id, nom, description, prix, stock, image, date_prod, date_exp FROM articles WHERE boutique_id = ?', [id]);
    const [services] = await pool.execute('SELECT id, nom, description, prix, disponible, image FROM services WHERE boutique_id = ?', [id]);
    const [commentaires] = await pool.execute(
      'SELECT c.id, c.texte, c.date_creation, u.nom, u.prenom FROM commentaires c JOIN clients u ON c.utilisateur_id = u.id WHERE c.boutique_id = ?',
      [id]
    );
    const [livreurs] = await pool.execute('SELECT id, nom, prenom, telephone, email, actif FROM livreurs WHERE boutique_id = ?', [id]);
    return { ...boutique[0], articles, services, commentaires, livreurs };
  },

  async findVisiteurs(id, debut, fin) {
    let query = 'SELECT u.nom, u.prenom, h.date_visite, h.frequence FROM historique_visites h JOIN clients u ON h.utilisateur_id = u.id WHERE h.boutique_id = ?';
    let params = [id];
    if (debut && fin) {
      query += ' AND h.date_visite BETWEEN ? AND ?';
      params.push(debut, fin);
    }
    const [visiteurs] = await pool.execute(query, params);
    return visiteurs;
  }
};

module.exports = Boutique;