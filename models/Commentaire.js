const { pool } = require('../config/database');

const Commentaire = {
  async create({ boutique_id, utilisateur_id, texte }) {
    const [resultat] = await pool.execute(
      'INSERT INTO commentaires (boutique_id, utilisateur_id, texte, date_creation) VALUES (?, ?, ?, NOW())',
      [boutique_id, utilisateur_id, texte]
    );
    return resultat.insertId;
  }
};

module.exports = Commentaire;