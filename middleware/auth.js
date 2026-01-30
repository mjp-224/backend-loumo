const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'tonSecretJWT';

const verifierToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Token requis' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.utilisateur = decoded;

    // Vérifier si c'est un utilisateur (client/gérant) ou un livreur
    if (decoded.type === 'livreur') {
      const [livreur] = await pool.execute(
        'SELECT id, boutique_id FROM livreurs WHERE id = ? AND actif = TRUE',
        [decoded.id]
      );
      if (!livreur.length) {
        return res.status(401).json({ erreur: 'Livreur non trouvé ou inactif' });
      }
      req.utilisateur.boutique_id = livreur[0].boutique_id;
    } else {
      // Vérifier si c'est un client ou un gérant
      let utilisateur = [];
      let type = decoded.type;

      if (type === 'client') {
        [utilisateur] = await pool.execute(
          'SELECT id FROM clients WHERE id = ?',
          [decoded.id]
        );
      } else if (type === 'gerant') {
        [utilisateur] = await pool.execute(
          'SELECT id FROM gerants WHERE id = ?',
          [decoded.id]
        );
      } else if (type === 'super_admin' || type === 'admin') {
        // Ajout pour supporter les super admins s'ils existent dans le token
        // Note: Le code original ne vérifiait pas la DB pour ce middleware, 
        // mais on garde la logique "si utilisateur existe"
        // On suppose que la vérification basique du token suffit ou on ajoute une requête si besoin
      }

      if (!utilisateur.length && type !== 'super_admin' && type !== 'admin') {
        return res.status(401).json({ erreur: 'Utilisateur non trouvé' });
      }
      req.utilisateur.type = type;
    }
    next();
  } catch (erreur) {
    console.error('Erreur vérification token:', {
      message: erreur.message,
      name: erreur.name,
      token: token.substring(0, 20) + '...',
    });
    res.status(401).json({ erreur: 'Token invalide' });
  }
};

module.exports = verifierToken;