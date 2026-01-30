const pool = require('../config/db');

exports.addCommentaire = async (req, res) => {
  const { id } = req.params; // Boutique ID
  const { texte, article_id, service_id } = req.body;
  const utilisateur_id = req.utilisateur.id;

  if (!texte) return res.status(400).json({ erreur: 'Le texte du commentaire est requis' });
  if (article_id && service_id) return res.status(400).json({ erreur: 'Un commentaire ne peut pas être lié à la fois à un article et un service' });

  try {
    const [result] = await pool.query(
      'INSERT INTO commentaires (boutique_id, utilisateur_id, texte, article_id, service_id, date_creation) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, utilisateur_id, texte, article_id || null, service_id || null]
    );
    res.status(201).json({ id: result.insertId, texte, article_id, service_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

exports.getCommentaires = async (req, res) => {
  const { id } = req.params; // Boutique ID
  const { article_id, service_id } = req.query;

  try {
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ erreur: 'Identifiant de boutique invalide' });
    }
    let query = `
      SELECT c.id, c.texte, DATE_FORMAT(c.date_creation, '%Y-%m-%d %H:%i:%s') AS date, u.nom, u.prenom, u.image
      FROM commentaires c
      JOIN clients u ON c.utilisateur_id = u.id
      WHERE c.boutique_id = ?
    `;
    const queryParams = [id];

    if (article_id) {
      query += ' AND c.article_id = ?';
      queryParams.push(parseInt(article_id));
    } else if (service_id) {
      query += ' AND c.service_id = ?';
      queryParams.push(parseInt(service_id));
    }

    const [commentaires] = await pool.query(query, queryParams);
    res.json(commentaires);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

exports.updateCommentaire = async (req, res) => {
  try {
    const { texte } = req.body;
    const { commentId } = req.params;
    if (!texte || !texte.trim()) {
      return res.status(400).json({ erreur: 'Le texte du commentaire est requis' });
    }

    const [comment] = await pool.execute(
      'SELECT * FROM commentaires WHERE id = ? AND utilisateur_id = ?',
      [commentId, req.utilisateur.id]
    );
    if (!comment.length) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    await pool.execute(
      'UPDATE commentaires SET texte = ? WHERE id = ?',
      [texte, commentId]
    );
    res.json({ message: 'Commentaire modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification du commentaire:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la modification du commentaire' });
  }
};

exports.deleteCommentaire = async (req, res) => {
  try {
    const { commentId } = req.params;
    const [comment] = await pool.execute(
      'SELECT * FROM commentaires WHERE id = ? AND utilisateur_id = ?',
      [commentId, req.utilisateur.id]
    );
    if (!comment.length) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    await pool.execute(
      'DELETE FROM commentaires WHERE id = ?',
      [commentId]
    );
    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la suppression du commentaire' });
  }
};