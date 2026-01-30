const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.createLivreur = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const { nom, prenom, telephone, email, password, boutique_id, adresse, actif } = req.body;
  if (!nom || !prenom || !telephone || !boutique_id) {
    return res.status(400).json({ erreur: 'Données incomplètes' });
  }

  try {
    const [boutique] = await pool.execute(
      'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutique_id, req.utilisateur.id]
    );
    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Boutique non autorisée' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const photoPath = req.file ? `/Uploads/livreurs/${req.file.filename}` : null;
    const actifValue = actif === 'true' || actif === true ? 1 : 0;

    const [result] = await pool.execute(
      `INSERT INTO livreurs (boutique_id, nom, prenom, telephone, email, password, photo, adresse, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [boutique_id, nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actifValue]
    );

    res.json({ message: 'Livreur créé avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de la création du livreur:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  }
};

exports.getLivreurs = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const boutiqueId = parseInt(req.params.id);
  try {
    const [boutique] = await pool.execute(
      'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutiqueId, req.utilisateur.id]
    );
    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé' });
    }

    const [livreurs] = await pool.execute(
      'SELECT id, nom, prenom, telephone, email, actif, photo, adresse FROM livreurs WHERE boutique_id = ?',
      [boutiqueId]
    );
    res.json(livreurs);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des livreurs:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

exports.updateLivreur = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, prenom, telephone, email, password, adresse, actif } = req.body;
    if (!nom || !prenom || !telephone) {
      return res.status(400).json({ erreur: 'Nom, prénom et téléphone requis.' });
    }
    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (!telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
    }
    if (adresse && adresse.length > 255) {
      return res.status(400).json({ erreur: 'L\'adresse ne peut pas dépasser 255 caractères.' });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const [existant] = await pool.execute(
      'SELECT id FROM livreurs WHERE telephone = ? AND boutique_id = ? AND id != ?',
      [telephone, req.params.id, req.params.livreurId]
    );
    if (existant.length) {
      return res.status(400).json({ erreur: 'Téléphone déjà utilisé pour un autre livreur.' });
    }
    const photoPath = req.file ? `/uploads/${req.file.filename}` : (req.body.photo || null);

    if (password) {
      await pool.execute(
        'UPDATE livreurs SET nom = ?, prenom = ?, telephone = ?, email = ?, password = ?, photo = ?, adresse = ?, actif = ? WHERE id = ? AND boutique_id = ?',
        [nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actif !== undefined ? actif : true, req.params.livreurId, req.params.id]
      );
    } else {
      await pool.execute(
        'UPDATE livreurs SET nom = ?, prenom = ?, telephone = ?, email = ?, photo = ?, adresse = ?, actif = ? WHERE id = ? AND boutique_id = ?',
        [nom, prenom, telephone, email || null, photoPath, adresse || null, actif !== undefined ? actif : true, req.params.livreurId, req.params.id]
      );
    }
    res.json({ message: 'Livreur mis à jour' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.deleteLivreur = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM livreurs WHERE id = ? AND boutique_id = ?', [req.params.livreurId, req.params.id]);
    res.json({ message: 'Livreur supprimé' });
  } catch (erreur) {
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

// Route directe PUT /livreurs/:livreurId - récupère boutiqueId depuis la DB
exports.updateLivreurDirect = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const livreurId = parseInt(req.params.livreurId);
    const { nom, prenom, telephone, email, password, adresse, actif, conserver_image } = req.body;

    if (!nom || !prenom || !telephone) {
      return res.status(400).json({ erreur: 'Nom, prénom et téléphone requis.' });
    }

    // Récupérer le livreur et vérifier l'accès
    const [livreur] = await pool.execute(
      'SELECT l.id, l.boutique_id, l.photo FROM livreurs l JOIN boutiques b ON l.boutique_id = b.id WHERE l.id = ? AND b.gerant_id = ?',
      [livreurId, req.utilisateur.id]
    );
    if (!livreur.length) {
      return res.status(404).json({ erreur: 'Livreur non trouvé ou accès refusé' });
    }

    const boutiqueId = livreur[0].boutique_id;

    // Vérifier unicité téléphone
    const [existant] = await pool.execute(
      'SELECT id FROM livreurs WHERE telephone = ? AND boutique_id = ? AND id != ?',
      [telephone, boutiqueId, livreurId]
    );
    if (existant.length) {
      return res.status(400).json({ erreur: 'Téléphone déjà utilisé pour un autre livreur.' });
    }

    // Gestion photo
    let photoPath;
    if (req.file) {
      photoPath = `/Uploads/livreurs/${req.file.filename}`;
    } else if (conserver_image === 'true') {
      photoPath = livreur[0].photo; // Garder l'ancienne photo
    } else {
      photoPath = req.body.photo || livreur[0].photo;
    }

    // Gestion mot de passe
    let hashedPassword = null;
    if (password && password.length >= 8) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const actifValue = actif === 'true' || actif === true || actif === '1' ? 1 : 0;

    if (hashedPassword) {
      await pool.execute(
        'UPDATE livreurs SET nom = ?, prenom = ?, telephone = ?, email = ?, password = ?, photo = ?, adresse = ?, actif = ? WHERE id = ?',
        [nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actifValue, livreurId]
      );
    } else {
      await pool.execute(
        'UPDATE livreurs SET nom = ?, prenom = ?, telephone = ?, email = ?, photo = ?, adresse = ?, actif = ? WHERE id = ?',
        [nom, prenom, telephone, email || null, photoPath, adresse || null, actifValue, livreurId]
      );
    }
    res.json({ message: 'Livreur mis à jour' });
  } catch (erreur) {
    console.error('Erreur updateLivreurDirect:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

// Route directe DELETE /livreurs/:livreurId - récupère boutiqueId depuis la DB
exports.deleteLivreurDirect = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const livreurId = parseInt(req.params.livreurId);

    // Vérifier que le livreur appartient à une boutique du gérant
    const [livreur] = await pool.execute(
      'SELECT l.id FROM livreurs l JOIN boutiques b ON l.boutique_id = b.id WHERE l.id = ? AND b.gerant_id = ?',
      [livreurId, req.utilisateur.id]
    );
    if (!livreur.length) {
      return res.status(404).json({ erreur: 'Livreur non trouvé ou accès refusé' });
    }

    await pool.execute('DELETE FROM livreurs WHERE id = ?', [livreurId]);
    res.json({ message: 'Livreur supprimé' });
  } catch (erreur) {
    console.error('Erreur deleteLivreurDirect:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.getProfil = async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  try {
    const [livreur] = await pool.execute(
      'SELECT id, nom, prenom, email, telephone, boutique_id, actif, photo, adresse FROM livreurs WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!livreur.length) {
      return res.status(404).json({ erreur: 'Livreur non trouvé' });
    }
    res.json(livreur[0]);
  } catch (erreur) {
    console.error('Erreur récupération profil livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};

exports.updateProfil = async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  const { nom, prenom, email, telephone, mot_de_passe, adresse } = req.body;
  let updates = [];
  let values = [];
  if (nom) { updates.push('nom = ?'); values.push(nom); }
  if (prenom) { updates.push('prenom = ?'); values.push(prenom); }
  if (email) { updates.push('email = ?'); values.push(email); }
  if (telephone) { updates.push('telephone = ?'); values.push(telephone); }
  if (mot_de_passe) {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    updates.push('password = ?');
    values.push(hashedPassword);
  }
  if (adresse) { updates.push('adresse = ?'); values.push(adresse); }
  if (req.file) {
    updates.push('photo = ?');
    values.push(`/Uploads/livreurs/${req.file.filename}`);
  }

  if (updates.length === 0) return res.status(400).json({ erreur: 'Aucune modification fournie' });

  values.push(req.utilisateur.id);
  try {
    const [result] = await pool.execute(
      `UPDATE livreurs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ erreur: 'Livreur non trouvé' });
    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (erreur) {
    console.error('Erreur mise à jour profil:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
};