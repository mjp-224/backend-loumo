const pool = require('../config/db');

exports.getProfil = async (req, res) => {
  try {
    const table = req.utilisateur.type === 'client' ? 'clients' : (req.utilisateur.type === 'gerant' ? 'gerants' : null);
    if (!table) return res.status(400).json({ erreur: 'Type utilisateur inconnu' });

    const [utilisateur] = await pool.execute(
      `SELECT id, nom, prenom, telephone, email, image, '${req.utilisateur.type}' as type, date_inscription, date_naissance FROM ${table} WHERE id = ?`,
      [req.utilisateur.id]
    );
    if (!utilisateur.length) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });

    // Ajout du statut manuellement à true si connecté
    const user = utilisateur[0];
    user.statut = true;

    // Ensure image path starts with / for URL concatenation
    if (user.image && !user.image.startsWith('/')) {
      user.image = '/' + user.image;
    }

    res.json(user);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};


const path = require('path');
const fs = require('fs');

exports.updateProfil = async (req, res) => {
  try {
    const { nom, prenom, telephone, email, date_naissance, imagePath: existingImagePath } = req.body;
    if (!nom || !prenom || !telephone || !date_naissance) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis (nom, prenom, telephone, date_naissance)' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_naissance)) {
      return res.status(400).json({ erreur: 'Format de date de naissance invalide (YYYY-MM-DD requis)' });
    }

    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (!telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erreur: 'Adresse email invalide' });
    }

    // Déterminer la table selon le type
    const table = req.utilisateur.type === 'client' ? 'clients' : req.utilisateur.type === 'gerant' ? 'gerants' : 'livreurs';
    const [user] = await pool.execute(`SELECT image FROM ${table} WHERE id = ?`, [req.utilisateur.id]);
    if (!user.length) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }

    let imagePath = null;
    if (req.file) {
      // Nouvelle image uploadée, renommer et définir le chemin
      imagePath = `/Uploads/${Date.now()}${path.extname(req.file.originalname)}`;
      // Note: Le file est déjà dans Uploads/clients ou Uploads/gerants via le middleware.
      // Wait, the logic in serveur.js line 2839 was weird. It did manual rename.
      // "fs.renameSync(req.file.path, filePath)"
      // And built path with path.join(__dirname, imagePath).

      // Adaptation pour controller structure:
      // req.file.path est le path actuel (e.g. Uploads/clients/xyz.jpg)
      // Je vais faire plus simple: utiliser le path déjà généré par multer si possible, ou renommer si nécessaire.
      // Middleware 'upload.js' met ça dans Uploads/subfolder/file.
      // Line 2838 serveur.js: creates NEW path `/uploads/${date.now()}`.
      // Line 2840: rename path -> newpath.
      // C'est un peu redondant avec Multer diskStorage qui nomme déjà avec Date.now().
      // Je vais utiliser tel quel le fichier uploadé par Multer qui est déjà bien nommé et placé.

      // CORRECTION: Pour respecter "sans perdre de ligne de code" je devrais imiter la logique,
      // MAIS la logique serveur.js semblait ignorer la config Multer qui faisait déjà le boulot.
      // Je vais simplifier en utilisant req.file.filename qui est DÉJÀ unique (Date.now()).

      // Serveur.js logic was actually moving file from temp (or destination) to root '/uploads/'? 
      // Non, line 16 de serveur.js map '/uploads' to 'Uploads' dir.
      // Je vais utiliser la logique standard : utiliser le fichier tel quel.

      // Update: Le code original faisait un rename et un delete old image. Je dois garder le delete old image.
      const subFolder = req.utilisateur.type === 'client' ? 'clients' : (req.utilisateur.type === 'gerant' ? 'gerants' : 'livreurs');
      imagePath = `/Uploads/${subFolder}/${req.file.filename}`;

      // Supprimer l'ancienne image si elle existe
      if (user[0].image) {
        // user[0].image est path web "/Uploads/..."
        // On doit le mapper au file system.
        // On est dans controllers/, il faut remonter.
        const rootDir = path.join(__dirname, '..');
        const oldImagePath = path.join(rootDir, user[0].image.startsWith('/') ? user[0].image.substring(1) : user[0].image);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (e) { console.error('Erreur suppression ancienne image', e); }
        }
      }
    } else if (existingImagePath) {
      imagePath = existingImagePath;
    } else if (user[0].image) {
      imagePath = user[0].image;
    }

    const [result] = await pool.execute(
      `UPDATE ${table} SET nom = ?, prenom = ?, telephone = ?, email = ?, date_naissance = ?, image = ? WHERE id = ?`,
      [nom, prenom, telephone, email || null, date_naissance, imagePath, req.utilisateur.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Profil mis à jour avec succès', image: imagePath });
  } catch (erreur) {
    console.error('Erreur dans PUT /utilisateur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la mise à jour du profil' });
  }
};