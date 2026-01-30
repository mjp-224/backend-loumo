const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'tonSecretJWT';

// Fonction pour logger les activités utilisateur (visible par l'admin)
async function logUserActivity(userId, userType, actionType, description, ipAddress) {
  try {
    await pool.execute(
      `INSERT INTO system_logs (admin_id, action_type, resource_type, resource_id, description, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [null, actionType, userType.toUpperCase(), userId, description, ipAddress]
    );
  } catch (error) {
    console.error('Erreur log activité:', error);
  }
}

// Connexion Livreur
exports.connexionLivreur = async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    console.log('Connexion livreur:', { identifiant });

    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Identifiant et mot de passe requis' });
    }

    // Recherche du livreur (par email ou téléphone)
    const [livreurs] = await pool.execute(
      'SELECT * FROM livreurs WHERE email = ? OR telephone = ?',
      [identifiant, identifiant]
    );

    if (livreurs.length === 0) {
      return res.status(401).json({ erreur: 'Identifiant ou mot de passe incorrect' });
    }

    const livreur = livreurs[0];

    const validPassword = await bcrypt.compare(mot_de_passe, livreur.password);
    if (!validPassword) {
      return res.status(401).json({ erreur: 'Identifiant ou mot de passe incorrect' });
    }

    if (!livreur.actif) {
      return res.status(403).json({ erreur: 'Ce compte livreur est désactivé' });
    }

    if (livreur.date_fin_activation && new Date() > new Date(livreur.date_fin_activation)) {
      // Optionnel: Désactiver le compte en DB automatiquement
      // await pool.execute('UPDATE livreurs SET actif = 0 WHERE id = ?', [livreur.id]);
      return res.status(403).json({ erreur: 'Votre période d\'activation a expiré' });
    }

    const token = jwt.sign(
      {
        id: livreur.id,
        type: 'livreur',
        boutique_id: livreur.boutique_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log de connexion pour l'admin
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logUserActivity(livreur.id, 'livreur', 'LOGIN', `Connexion livreur: ${livreur.prenom} ${livreur.nom} (${livreur.email || livreur.telephone})`, ipAddress);

    res.json({
      token,
      id: livreur.id,
      type: 'livreur',
      nom: livreur.nom,
      prenom: livreur.prenom,
      boutique_id: livreur.boutique_id
    });

  } catch (error) {
    console.error('Erreur connexion livreur:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la connexion' });
  }
};

exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ erreur: 'Token requis' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    let table;
    if (decoded.type === 'client') table = 'clients';
    else if (decoded.type === 'gerant') table = 'gerants';
    else if (decoded.type === 'livreur') table = 'livreurs';
    else if (decoded.type === 'super_admin') table = 'super_admins';
    else return res.status(401).json({ erreur: 'Type utilisateur invalide' });

    const [utilisateur] = await pool.execute(
      `SELECT id FROM ${table} WHERE id = ?`,
      [decoded.id]
    );
    if (!utilisateur.length) {
      return res.status(401).json({ erreur: 'Utilisateur non trouvé ou inactif' });
    }
    const nouveauJeton = jwt.sign(
      { id: utilisateur[0].id, type: decoded.type, boutique_id: decoded.boutique_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token: nouveauJeton });
  } catch (erreur) {
    console.error('Erreur rafraîchissement token:', erreur);
    res.status(401).json({ erreur: 'Token invalide' });
  }
};

// Inscription
exports.inscription = async (req, res) => {
  try {
    const { nom, prenom, telephone, email, mot_de_passe, confirmer_mot_de_passe, date_naissance, type } = req.body;

    if (!nom || !prenom || !telephone || !mot_de_passe || !confirmer_mot_de_passe || !date_naissance || !type) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    if (mot_de_passe !== confirmer_mot_de_passe) {
      return res.status(400).json({ erreur: 'Les mots de passe ne correspondent pas.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erreur: 'Format d\'email invalide.' });
    }

    const table = type === 'client' ? 'clients' : (type === 'gerant' ? 'gerants' : null);
    if (!table) {
      return res.status(400).json({ erreur: 'Type utilisateur invalide (client ou gerant).' });
    }

    const [existant] = await pool.execute(
      `SELECT id FROM ${table} WHERE telephone = ? OR (email IS NOT NULL AND email = ?)`,
      [telephone, email || '']
    );

    if (existant.length) {
      return res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé.' });
    }

    const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);
    // Le dossier de destination multer utilise 'gerants' pour /inscription, mais on ajuste selon le type réel
    // Note: l'image est déjà uploadée par le middleware avant d'arriver ici, req.file contient les infos
    const subFolder = type === 'client' ? 'clients' : 'gerants';
    // Si req.file existe, on construit le chemin. Attention au path relatif/absolu.
    // Dans serveur.js: /Uploads/${subFolder}/${req.file.filename}
    // multer middleware save dans ./Uploads/${subFolder}

    // Correction de logic path: le middleware multer a déjà sauvé le fichier dans le bon sous-dossier (voir middleware/upload.js)
    // Ici on enregistre le path web.
    const imagePath = req.file ? `/Uploads/${subFolder}/${req.file.filename}` : null;

    const [resultat] = await pool.execute(
      `INSERT INTO ${table} (nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [nom, prenom, telephone, email || null, imagePath, motDePasseHache, date_naissance]
    );

    const token = jwt.sign({ id: resultat.insertId, type }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, type, id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

// Connexion Client/Gérant
exports.connexion = async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Identifiant et mot de passe requis.' });
    }

    const field = identifiant.includes('@') ? 'email' : 'telephone';

    // Recherche dans Clients
    let [users] = await pool.execute(`SELECT *, 'client' as type FROM clients WHERE ${field} = ?`, [identifiant]);

    // Si pas trouvé, recherche dans Gérants
    if (!users.length) {
      [users] = await pool.execute(`SELECT *, 'gerant' as type FROM gerants WHERE ${field} = ?`, [identifiant]);
    }

    // Si pas trouvé, recherche dans Super Admins (Login par email uniquement en général)
    if (!users.length && field === 'email') {
      [users] = await pool.execute(`SELECT *, 'super_admin' as type, password as mot_de_passe FROM super_admins WHERE email = ?`, [identifiant]);
      // Note: `super_admins` utilise souvent `password` alors que les autres utilisent `mot_de_passe`. J'alias ici.
      // Mais attend, superAdminController.login utilise `mot_de_passe` pour le check bcrypt (ligne 28).
      // Donc la colonne DB est bien `mot_de_passe`?
      // Check superAdminController.js line 28: `bcrypt.compare(password, admin.mot_de_passe)` -> YES column is `mot_de_passe`.
    }

    if (!users.length) {
      return res.status(400).json({ erreur: 'Utilisateur non trouvé.' });
    }

    const user = users[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(400).json({ erreur: 'Mot de passe incorrect.' });
    }

    if (user.actif === 0 || user.actif === false) {
      return res.status(403).json({ erreur: 'Votre compte a été désactivé. Veuillez contacter l\'administrateur.' });
    }

    if (user.date_fin_activation && new Date() > new Date(user.date_fin_activation)) {
      return res.status(403).json({ erreur: 'Votre période d\'activation a expiré. Veuillez contacter l\'administrateur.' });
    }

    // Gestion du statut (mise en commentaire par sécurité si colonne absente comme dans serveur.js)
    // const table = user.type === 'client' ? 'clients' : 'gerants';
    // await pool.execute(`UPDATE ${table} SET statut = TRUE WHERE id = ?`, [user.id]);

    const token = jwt.sign({ id: user.id, type: user.type }, JWT_SECRET, { expiresIn: '1h' });

    // Log de connexion pour l'admin
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logUserActivity(user.id, user.type, 'LOGIN', `Connexion ${user.type}: ${user.prenom || ''} ${user.nom || ''} (${user.email || user.telephone})`, ipAddress);

    res.json({ token, type: user.type, id: user.id });

  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

// Déconnexion
exports.deconnexion = async (req, res) => {
  try {
    const userType = req.utilisateur.type;
    const userId = req.utilisateur.id;

    // Log de déconnexion pour l'admin
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logUserActivity(userId, userType, 'LOGOUT', `Déconnexion ${userType} (ID: ${userId})`, ipAddress);

    res.json({ message: 'Déconnexion réussie' });
  } catch (erreur) {
    console.error('Erreur déconnexion:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};