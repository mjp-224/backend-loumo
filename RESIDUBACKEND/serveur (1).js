const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Configuration de Multer pour les uploads d'images
const stockage = multer.diskStorage({
  destination: (req, fichier, cb) => {
    const dossier = './Uploads';
    if (!fs.existsSync(dossier)) {
      fs.mkdirSync(dossier);
    }
    cb(null, dossier);
  },
  filename: (req, fichier, cb) => {
    cb(null, Date.now() + path.extname(fichier.originalname));
  }
});
const upload = multer({
  storage: stockage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Seules les images JPEG/PNG sont autorisées'));
  }
});

// Configuration du pool MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mapshop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'tonSecretJWT';

// Fonction pour initialiser la base de données
async function initialiserBaseDeDonnees() {
  let connexion;
  try {
    connexion = await pool.getConnection();

    // Créer la base de données si elle n'existe pas
    await connexion.execute('CREATE DATABASE IF NOT EXISTS mapshop');
    await connexion.query('USE mapshop');

    // Créer la table utilisateurs
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE,
        image VARCHAR(255),
        mot_de_passe VARCHAR(255) NOT NULL,
        type ENUM('client', 'gerant') NOT NULL,
        date_inscription DATETIME NOT NULL,
        date_naissance DATE NOT NULL
      )
    `);

    // Créer la table boutiques
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS boutiques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        categorie VARCHAR(50) NOT NULL,
        horaires VARCHAR(255) NOT NULL,
        latitude DECIMAL(9,6) NOT NULL,
        longitude DECIMAL(9,6) NOT NULL,
        telephone VARCHAR(20),
        adresse VARCHAR(255),
        image VARCHAR(255),
        gerant_id INT NOT NULL,
        FOREIGN KEY (gerant_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      )
    `);

    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        nom VARCHAR(100) NOT NULL,
        description TEXT DEFAULT NULL,
        prix DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        image VARCHAR(255) DEFAULT NULL,
        date_exp DATE DEFAULT NULL,
        date_prod DATE DEFAULT NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Créer la table services
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        prix DECIMAL(10,2) NOT NULL,
        disponible BOOLEAN DEFAULT TRUE,
        image VARCHAR(255),
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

    // Créer la table commandes
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS commandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        boutique_id INT NOT NULL,
        article_id INT,
        service_id INT,
        prix DECIMAL(10,2) NOT NULL,
        statut ENUM('en attente', 'acceptée', 'en préparation', 'livrée', 'en cours de livraison') NOT NULL DEFAULT 'en attente',
        image VARCHAR(255),
        moyen_paiement ENUM('Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'),
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        quantite INT DEFAULT 1,
        livreur_id INT,
        client_latitude DECIMAL(10,6),
        client_longitude DECIMAL(10,6),
        client_nom VARCHAR(100),
        client_telephone VARCHAR(20),
        adresse50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        password VARCHAR(255),
        photo VARCHAR(255),
        adresse VARCHAR(255),
        actif BOOLEAN DEFAULT TRUE,
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

    // Créer la table paniers
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS paniers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        article_id INT,
        service_id INT,
        boutique_id INT NOT NULL,
        date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
        quantite INT DEFAULT 1,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

    // Créer la table reductions
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS reductions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        commande_id INT NOT NULL,
        utilisateur_id INT NOT NULL,
        montant_propose DECIMAL(10,2) NOT NULL,
        statut ENUM('en attente', 'acceptée', 'refusée') NOT NULL DEFAULT 'en attente',
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      )
    `);

    // Table pour enregistrer les paiements
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS paiements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        commande_id INT NOT NULL,
        utilisateur_id INT NOT NULL,
        boutique_id INT NOT NULL,
        montant DECIMAL(10,2) NOT NULL,
        moyen_paiement VARCHAR(50) NOT NULL,
        date DATETIME NOT NULL,
        FOREIGN KEY (commande_id) REFERENCES commandes(id),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
      )
    `);

    // Table pour enregistrer les notifications
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        utilisateur_id INT NOT NULL,
        message TEXT NOT NULL,
        date DATETIME NOT NULL,
        lu BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
      )
    `);

    // Créer la table visites
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS visites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        boutique_id INT NOT NULL,
        date_visite DATETIME NOT NULL,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
      )
    `);

    // Créer la table positions_livreurs
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS positions_livreurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        livreur_id INT NOT NULL,
        commande_id INT NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (livreur_id) REFERENCES livreurs(id),
        FOREIGN KEY (commande_id) REFERENCES commandes(id)
      )
    `);

    // Ajouter des index pour optimiser les performances
    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_commandes_user_boutique ON commandes (utilisateur_id, boutique_id)
    `);

    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_historique_visites_date ON historique_visites (date_visite)
    `);

    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_commandes_boutique ON commandes (boutique_id)
    `);

    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_paiements_boutique ON paiements (boutique_id)
    `);

    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_livreurs_boutique ON livreurs (boutique_id)
    `);

  } catch (erreur) {
    console.error('Erreur lors de l\'initialisation de la base de données :', erreur);
    throw erreur;
  } finally {
    if (connexion) connexion.release();
  }
}

// Middleware pour vérifier le token JWT
const verifierToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Token requis' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.utilisateur = decoded;
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
      const [utilisateur] = await pool.execute(
        'SELECT id, type FROM utilisateurs WHERE id = ?',
        [decoded.id]
      );
      if (!utilisateur.length) {
        return res.status(401).json({ erreur: 'Utilisateur non trouvé' });
      }
      req.utilisateur.type = utilisateur[0].type;
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

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erreur: err.message || 'Erreur serveur' });
});

// Routes
app.post('/inscription', upload.single('image'), async (req, res) => {
  try {
    const { nom, prenom, telephone, email, mot_de_passe, confirmer_mot_de_passe, date_naissance, type } = req.body;
    if (!nom || !prenom || !telephone || !mot_de_passe || !confirmer_mot_de_passe || !date_naissance) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    if (mot_de_passe !== confirmer_mot_de_passe) {
      return res.status(400).json({ erreur: 'Les mots de passe ne correspondent pas.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erreur: 'Format d\'email invalide.' });
    }
    const [existant] = await pool.execute(
      'SELECT id FROM utilisateurs WHERE telephone = ? OR (email IS NOT NULL AND email = ?)',
      [telephone, email || '']
    );
    if (existant.length) {
      return res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé.' });
    }
    const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const [resultat] = await pool.execute(
      'INSERT INTO utilisateurs (nom, prenom, telephone, email, image, mot_de_passe, type, date_inscription, date_naissance) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
      [nom, prenom, telephone, email || null, imagePath, motDePasseHache, type, date_naissance]
    );
    const token = jwt.sign({ id: resultat.insertId, type }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, type, id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

app.post('/connexion', async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Identifiant et mot de passe requis.' });
    }
    let utilisateur;
    if (identifiant.includes('@')) {
      [utilisateur] = await pool.execute(
        'SELECT * FROM utilisateurs WHERE email = ?',
        [identifiant]
      );
    } else {
      [utilisateur] = await pool.execute(
        'SELECT * FROM utilisateurs WHERE telephone = ?',
        [identifiant]
      );
    }
    if (!utilisateur.length) {
      return res.status(400).json({ erreur: 'Utilisateur non trouvé.' });
    }
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur[0].mot_de_passe);
    if (!motDePasseValide) {
      return res.status(400).json({ erreur: 'Mot de passe incorrect.' });
    }
    const token = jwt.sign({ id: utilisateur[0].id, type: utilisateur[0].type }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, type: utilisateur[0].type, id: utilisateur[0].id });
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/utilisateur', verifierToken, async (req, res) => {
  try {
    const [utilisateur] = await pool.execute(
      'SELECT id, nom, prenom, telephone, email, image, type, date_inscription, date_naissance FROM utilisateurs WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!utilisateur.length) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    res.json(utilisateur[0]);
  } catch (erreur) {
    throw erreur;
  }
});

app.post('/boutiques', verifierToken, upload.single('image'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, categorie, horaires, latitude, longitude, telephone, adresse } = req.body;
    if (!nom || !categorie || !horaires || !latitude || !longitude) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    const horaireRegex = /^([0-9]{1,2}h-[0-9]{1,2}h)$/;
    if (!horaireRegex.test(horaires)) {
      return res.status(400).json({ erreur: 'Les horaires doivent être au format "7h-19h".' });
    }
    const latitudeNum = parseFloat(latitude);
    const longitudeNum = parseFloat(longitude);
    if (isNaN(latitudeNum) || latitudeNum < -90 || latitudeNum > 90 || isNaN(longitudeNum) || longitudeNum < -180 || longitudeNum > 180) {
      return res.status(400).json({ erreur: 'Coordonnées géographiques invalides.' });
    }
    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (telephone && !telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
    }
    if (adresse && adresse.length > 255) {
      return res.status(400).json({ erreur: 'L\'adresse ne peut pas dépasser 255 caractères.' });
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const [resultat] = await pool.execute(
      'INSERT INTO boutiques (nom, description, categorie, horaires, latitude, longitude, telephone, adresse, image, gerant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, description || null, categorie, horaires, latitudeNum, longitudeNum, telephone || null, adresse || null, imagePath, req.utilisateur.id]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    throw erreur;
  }
});

app.put('/boutiques/:id', verifierToken, upload.single('image'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, categorie, horaires, latitude, longitude, telephone, adresse } = req.body;
    if (!nom || !categorie || !horaires || !latitude || !longitude) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    const horaireRegex = /^([0-9]{1,2}h-[0-9]{1,2}h)$/;
    if (!horaireRegex.test(horaires)) {
      return res.status(400).json({ erreur: 'Les horaires doivent être au format "7h-19h".' });
    }
    const latitudeNum = parseFloat(latitude);
    const longitudeNum = parseFloat(longitude);
    if (isNaN(latitudeNum) || latitudeNum < -90 || latitudeNum > 90 || isNaN(longitudeNum) || longitudeNum < -180 || longitudeNum > 180) {
      return res.status(400).json({ erreur: 'Coordonnées géographiques invalides.' });
    }
    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (telephone && !telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
    }
    if (adresse && adresse.length > 255) {
      return res.status(400).json({ erreur: 'L\'adresse ne peut pas dépasser 255 caractères.' });
    }
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    let cheminImage = null;
    if (req.file) {
      cheminImage = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      cheminImage = req.body.image;
    }
    await pool.execute(
      'UPDATE boutiques SET nom = ?, description = ?, categorie = ?, horaires = ?, latitude = ?, longitude = ?, telephone = ?, adresse = ?, image = ? WHERE id = ?',
      [nom, description || null, categorie, horaires, latitudeNum, longitudeNum, telephone || null, adresse || null, cheminImage, req.params.id]
    );
    res.json({ message: 'Boutique mise à jour' });
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/boutiques', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [boutiques] = await pool.execute(
      'SELECT * FROM boutiques LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [total] = await pool.execute('SELECT COUNT(*) as count FROM boutiques');
    const totalBoutiques = total[0].count;

    res.json({
      boutiques,
      pagination: {
        page,
        limit,
        total: totalBoutiques,
        totalPages: Math.ceil(totalBoutiques / limit)
      }
    });
  } catch (erreur) {
    throw erreur;
  }
});

app.delete('/boutiques/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM boutiques WHERE id = ?', [req.params.id]);
    res.json({ message: 'Boutique supprimée' });
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/boutiques/:id', async (req, res) => {
  try {
    const [boutique] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length) return res.status(404).json({ erreur: 'Boutique non trouvée' });
    const [articles] = await pool.execute('SELECT * FROM articles WHERE boutique_id = ?', [req.params.id]);
    const [services] = await pool.execute('SELECT * FROM services WHERE boutique_id = ?', [req.params.id]);
    const [commentaires] = await pool.execute(
      'SELECT c.*, u.nom, u.prenom FROM commentaires c JOIN utilisateurs u ON c.utilisateur_id = u.id WHERE c.boutique_id = ?',
      [req.params.id]
    );
    const [livreurs] = await pool.execute(
      'SELECT id, boutique_id, nom, prenom, telephone, email, photo, adresse, actif, date_creation FROM livreurs WHERE boutique_id = ?',
      [req.params.id]
    );
    res.json({ ...boutique[0], articles, services, commentaires, livreurs });
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/boutiques/:id/visiteurs', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const periode = req.query.periode || 'jour';
    let requete;
    let params = [req.params.id];
    if (periode === 'jour') {
      requete = `
        SELECT DATE(date_visite) AS date, COUNT(DISTINCT utilisateur_id) AS visiteurs
        FROM historique_visites
        WHERE boutique_id = ? AND DATE(date_visite) = CURDATE()
        GROUP BY DATE(date_visite)
      `;
    } else if (periode === 'semaine') {
      requete = `
        SELECT WEEK(date_visite, 1) AS semaine, COUNT(DISTINCT utilisateur_id) AS visiteurs
        FROM historique_visites
        WHERE boutique_id = ? AND YEAR(date_visite) = YEAR(CURDATE())
        GROUP BY WEEK(date_visite, 1)
      `;
    } else if (periode === 'mois') {
      requete = `
        SELECT MONTH(date_visite) AS mois, COUNT(DISTINCT utilisateur_id) AS visiteurs
        FROM historique_visites
        WHERE boutique_id = ? AND YEAR(date_visite) = YEAR(CURDATE())
        GROUP BY MONTH(date_visite)
      `;
    } else {
      return res.status(400).json({ erreur: 'Période invalide' });
    }
    const [visiteurs] = await pool.execute(requete, params);
    res.json(visiteurs);
  } catch (erreur) {
    throw erreur;
  }
});

app.post('/boutiques/:id/livreurs', verifierToken, upload.single('photo'), async (req, res) => {
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
    const photoPath = req.file ? `/uploads/livreurs/${req.file.filename}` : null;
    const actifValue = actif === 'true' || actif === true ? 1 : 0;
    const [result] = await pool.execute(
      `INSERT INTO livreurs (boutique_id, nom, prenom, telephone, email, password, photo, adresse, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [boutique_id, nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actifValue]
    );
    res.json({ message: 'Livreur créé avec succès id: ' + result.insertId });
  } catch (error) {
    console.error('Erreur lors de la création du livreur:', error);
    if (req.file) {
      try {
        await fs.unlink(path.join(__dirname, req.file.path));
      } catch (unlinkError) {}
    }
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  }
});

app.put('/boutiques/:id/livreurs/:livreurId', verifierToken, upload.single('photo'), async (req, res) => {
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
    await pool.execute(
      'UPDATE livreurs SET nom = ?, prenom = ?, telephone = ?, email = ?, password = ?, photo = ?, adresse = ?, actif = ? WHERE id = ? AND boutique_id = ?',
      [nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actif !== undefined ? actif : true, req.params.livreurId, req.params.id]
    );
    res.json({ message: 'Livreur mis à jour' });
  } catch (erreur) {
    throw erreur;
  }
});

app.delete('/boutiques/:id/livreurs/:livreurId', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM livreurs WHERE id = ? AND boutique_id = ?', [req.params.livreurId, req.params.id]);
    res.json({ message: 'Livreur supprimé' });
  } catch (erreur) {
    throw erreur;
  }
});

app.post('/boutiques/:id/articles', verifierToken, upload.single('image'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, prix, stock } = req.body;
    if (!nom || !prix || stock === undefined) return res.status(400).json({ erreur: 'Nom, prix et stock requis' });
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }
    const stockNum = parseInt(stock) || 0;
    if (stockNum < 0) {
      return res.status(400).json({ erreur: 'Le stock ne peut pas être négatif.' });
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const [resultat] = await pool.execute(
      'INSERT INTO articles (boutique_id, nom, description, prix, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, nom, description, prixNum, stockNum, imagePath]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    throw erreur;
  }
});

app.delete('/boutiques/:id/articles/:articleId', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM articles WHERE id = ? AND boutique_id = ?', [req.params.articleId, req.params.id]);
    res.json({ message: 'Article supprimé' });
  } catch (erreur) {
    throw erreur;
  }
});

app.post('/boutiques/:id/services', verifierToken, upload.single('image'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, prix, disponible } = req.body;
    if (!nom || !prix) return res.status(400).json({ erreur: 'Nom et prix requis' });
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const [resultat] = await pool.execute(
      'INSERT INTO services (boutique_id, nom, description, prix, disponible, image) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, nom, description, prixNum, disponible !== undefined ? disponible : true, imagePath]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    throw erreur;
  }
});

app.put('/boutiques/:id/services/:serviceId', verifierToken, upload.single('image'), async (req, res) => {
  console.log('Requête PUT reçue:', {
    utilisateurId: req.utilisateur.id,
    utilisateurType: req.utilisateur.type,
    boutiqueId: req.params.id,
    serviceId: req.params.serviceId,
    body: req.body,
    file: req.file ? req.file.filename : null,
  });

  try {
    if (req.utilisateur.type !== 'gerant') {
      console.log('Erreur: Utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const boutiqueId = parseInt(req.params.id);
    const serviceId = parseInt(req.params.serviceId);
    if (isNaN(boutiqueId) || isNaN(serviceId)) {
      console.log('Erreur: IDs invalides', { boutiqueId, serviceId });
      return res.status(400).json({ erreur: 'IDs de boutique ou de service invalides' });
    }
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [boutiqueId]);
    console.log('Résultat boutique:', boutique);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      console.log('Erreur: Boutique non trouvée ou non autorisée', { boutiqueId, gerantId: req.utilisateur.id });
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const [service] = await pool.execute('SELECT id, image FROM services WHERE id = ? AND boutique_id = ?', [serviceId, boutiqueId]);
    console.log('Résultat service:', service);
    if (!service.length) {
      console.log('Erreur: Service non trouvé', { serviceId, boutiqueId });
      return res.status(404).json({ erreur: 'Service non trouvé' });
    }
    const { nom, description, prix, disponible, conserver_image } = req.body;
    if (!nom || !prix) {
      console.log('Erreur: Données requises manquantes', { nom, prix });
      return res.status(400).json({ erreur: 'Nom et prix sont requis.' });
    }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      console.log('Erreur: Prix invalide', { prix });
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }
    const disponibleBool = disponible === 'true' || disponible === true;
    let cheminImage = service[0].image;
    if (req.file) {
      cheminImage = `/Uploads/${req.file.filename}`;
      if (service[0].image && fs.existsSync(path.join(__dirname, service[0].image))) {
        try {
          await fs.unlink(path.join(__dirname, service[0].image));
          console.log('Ancienne image supprimée:', service[0].image);
        } catch (unlinkError) {
          console.error('Erreur suppression ancienne image:', unlinkError);
        }
      }
    } else if (conserver_image === 'true') {
      cheminImage = service[0].image;
      console.log('Image existante conservée:', cheminImage);
    } else {
      cheminImage = null;
      if (service[0].image && fs.existsSync(path.join(__dirname, service[0].image))) {
        try {
          await fs.unlink(path.join(__dirname, service[0].image));
          console.log('Image supprimée:', service[0].image);
        } catch (unlinkError) {
          console.error('Erreur suppression image:', unlinkError);
        }
      }
    }
    await pool.execute(
      'UPDATE services SET nom = ?, description = ?, prix = ?, disponible = ?, image = ? WHERE id = ? AND boutique_id = ?',
      [nom, description || null, prixNum, disponibleBool, cheminImage, serviceId, boutiqueId]
    );
    console.log('Service mis à jour:', { serviceId, boutiqueId });
    res.json({ message: 'Service mis à jour' });
  } catch (erreur) {
    console.error('Erreur lors de la mise à jour du service:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
    });
    if (req.file) {
      try {
        await fs.unlink(path.join(__dirname, req.file.path));
        console.log('Fichier temporaire supprimé:', req.file.path);
      } catch (unlinkError) {
        console.error('Erreur suppression fichier temporaire:', unlinkError);
      }
    }
    if (erreur.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ erreur: 'Données en double' });
    }
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.delete('/boutiques/:id/services/:serviceId', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM services WHERE id = ? AND boutique_id = ?', [req.params.serviceId, req.params.id]);
    res.json({ message: 'Service supprimé' });
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/boutiques/:id/articles', async (req, res) => {
  try {
    const [articles] = await pool.execute('SELECT * FROM articles WHERE boutique_id = ?', [req.params.id]);
    res.json(articles);
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/boutiques/:id/services', async (req, res) => {
  try {
    const [services] = await pool.execute('SELECT * FROM services WHERE boutique_id = ?', [req.params.id]);
    res.json(services);
  } catch (erreur) {
    throw erreur;
  }
});

app.post('/paniers', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { article_id, service_id, boutique_id, quantite } = req.body;
    if (!article_id && !service_id) return res.status(400).json({ erreur: 'Article ou service requis' });
    if (!boutique_id) return res.status(400).json({ erreur: 'Boutique requise' });
    const [boutique] = await pool.execute('SELECT id FROM boutiques WHERE id = ?', [boutique_id]);
    if (!boutique.length) return res.status(404).json({ erreur: 'Boutique non trouvée' });
    let article, service;
    if (article_id) {
      [article] = await pool.execute('SELECT stock FROM articles WHERE id = ? AND boutique_id = ?', [article_id, boutique_id]);
      if (!article.length) return res.status(404).json({ erreur: 'Article non trouvé' });
      if (article[0].stock <= 0) return res.status(400).json({ erreur: 'Article en rupture de stock' });
    } else {
      [service] = await pool.execute('SELECT disponible FROM services WHERE id = ? AND boutique_id = ?', [service_id, boutique_id]);
      if (!service.length) return res.status(404).json({ erreur: 'Service non trouvé' });
      if (!service[0].disponible) return res.status(400).json({ erreur: 'Service non disponible' });
    }
    const [resultat] = await pool.execute(
      'INSERT INTO paniers (utilisateur_id, article_id, service_id, boutique_id, quantite) VALUES (?, ?, ?, ?, ?)',
      [req.utilisateur.id, article_id || null, service_id || null, boutique_id, quantite || 1]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    res.status(500).json({ erreur: 'Erreur lors de l\'ajout au panier' });
  }
});

app.get('/paniers', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [paniers] = await pool.execute(
      `SELECT p.id, p.article_id, p.service_id, p.boutique_id, p.date_ajout,
              a.nom AS article_nom, a.prix AS article_prix, a.image AS article_image,
              s.nom AS service_nom, s.prix AS service_prix, s.image AS service_image,
              b.nom AS boutique_nom
       FROM paniers p
       LEFT JOIN articles a ON p.article_id = a.id
       LEFT JOIN services s ON p.service_id = s.id
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.utilisateur_id = ?`,
      [req.utilisateur.id]
    );
    res.json(paniers);
  } catch (erreur) {
    throw erreur;
  }
});

app.delete('/paniers/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [panier] = await pool.execute('SELECT utilisateur_id FROM paniers WHERE id = ?', [req.params.id]);
    if (!panier.length || panier[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM paniers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Article supprimé du panier' });
  } catch (erreur) {
    throw erreur;
  }
});

app.delete('/commandes/:id', verifierToken, async (req, res) => {
  const commandeId = parseInt(req.params.id);
  const utilisateurId = req.utilisateur.id;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    if (!commandeId || isNaN(commandeId)) {
      throw new Error('Identifiant de commande invalide');
    }
    const [commande] = await connection.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    if (!commande.length) {
      throw new Error('Commande non trouvée ou non autorisée');
    }
    const [paiements] = await connection.query(
      'SELECT * FROM paiements WHERE commande_id = ?',
      [commandeId]
    );
    if (paiements.length > 0) {
      throw new Error('La commande a des paiements associés et ne peut pas être supprimée');
    }
    await connection.execute('DELETE FROM commandes WHERE id = ?', [commandeId]);
    await connection.commit();
    res.json({ message: 'Commande supprimée avec succès' });
  } catch (erreur) {
    if (connection) await connection.rollback();
    console.error('Erreur lors de la suppression de la commande:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
    });
    if (erreur.message.includes('non trouvée') || erreur.message.includes('paiements associés')) {
      res.status(400).json({ erreur: erreur.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  } finally {
    if (connection) connection.release();
  }
});

app.get('/boutiques/:id/livreurs', verifierToken, async (req, res) => {
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
});

app.put('/livreurs/:id', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }
  const livreurId = parseInt(req.params.id);
  const { nom, prenom, telephone, email, password, adresse, actif, conserver_image } = req.body;
  if (!nom || !prenom || !telephone) {
    if (req.file) {
      try {
        await fs.unlink(path.join(__dirname, req.file.path));
      } catch (error) {
        console.error('Erreur suppression fichier temporaire:', error);
      }
    }
    return res.status(400).json({ erreur: 'Données incomplètes' });
  }
  try {
    const [livreur] = await pool.execute(
      `SELECT l.id, l.boutique_id, l.photo
       FROM livreurs l
       JOIN boutiques b ON l.boutique_id = b.id
       WHERE l.id = ? AND b.gerant_id = ?`,
      [livreurId, req.utilisateur.id]
    );
    if (!livreur.length) {
      if (req.file) {
        try {
          await fs.unlink(path.join(__dirname, req.file.path));
        } catch (error) {
          console.error('Erreur suppression fichier temporaire:', error);
        }
      }
      return res.status(403).json({ erreur: 'Livreur non trouvé ou accès non autorisé' });
    }
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }
    let photoPath = livreur[0].photo;
    if (req.file) {
      photoPath = `/Uploads/livreurs/${req.file.filename}`;
      if (livreur[0].photo && fs.existsSync(path.join(__dirname, livreur[0].photo))) {
        try {
          await fs.unlink(path.join(__dirname, livreur[0].photo));
          console.log('Ancienne image supprimée:', livreur[0].photo);
        } catch (error) {
          console.error('Erreur suppression ancienne image:', error);
        }
      }
    } else if (conserver_image === 'true') {
      photoPath = livreur[0].photo;
      console.log('Image existante conservée:', photoPath);
    } else if (req.body.photo === '' || req.body.photo === null) {
      photoPath = null;
      if (livreur[0].photo && fs.existsSync(path.join(__dirname, livreur[0].photo))) {
        try {
          await fs.unlink(path.join(__dirname, livreur[0].photo));
          console.log('Image supprimée:', livreur[0].photo);
        } catch (error) {
          console.error('Erreur suppression image:', error);
        }
      }
    }
    const actifValue = actif === 'true' || actif === true ? 1 : 0;
    await pool.execute(
      `UPDATE livreurs
       SET nom = ?, prenom = ?, telephone = ?, email = ?, password = COALESCE(?, password), photo = ?, adresse = ?, actif = ?
       WHERE id = ?`,
      [nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actifValue, livreurId]
    );
    res.json({ message: 'Livreur modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification du livreur:', error);
    if (req.file) {
      try {
        await fs.unlink(path.join(__dirname, req.file.path));
        console.log('Fichier temporaire supprimé:', req.file.path);
      } catch (unlinkError) {
        console.error('Erreur suppression fichier temporaire:', unlinkError);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  }
});

app.delete('/livreurs/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }
  const livreurId = parseInt(req.params.id);
  try {
    const [livreur] = await pool.execute(
      `SELECT l.id, l.boutique_id
       FROM livreurs l
       JOIN boutiques b ON l.boutique_id = b.id
       WHERE l.id = ? AND b.gerant_id = ?`,
      [livreurId, req.utilisateur.id]
    );
    if (!livreur.length) {
      return res.status(403).json({ erreur: 'Livreur non trouvé ou accès non autorisé' });
    }
    await pool.execute('DELETE FROM livreurs WHERE id = ?', [livreurId]);
    res.json({ message: 'Livreur supprimé avec succès' });
  } catch (erreur) {
    console.error('Erreur lors de la suppression du livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.post('/commandes/:id/assigner', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }
  const commandeId = parseInt(req.params.id);
  const { livreur_id } = req.body;
  if (!livreur_id || isNaN(livreur_id)) {
    return res.status(400).json({ erreur: 'ID du livreur requis et doit être un nombre' });
  }
  if (isNaN(commandeId)) {
    return res.status(400).json({ erreur: 'ID de commande invalide' });
  }
  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();
    const [commande] = await connexion.execute(
      `SELECT c.id, c.boutique_id, c.statut, c.livreur_id, c.client_latitude, c.client_longitude
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.id = ? AND b.gerant_id = ?`,
      [commandeId, req.utilisateur.id]
    );
    if (!commande.length) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }
    if (!['en attente', 'en préparation'].includes(commande[0].statut)) {
      return res.status(400).json({ erreur: 'La commande doit être en statut "en attente" ou "en préparation"' });
    }
    if (commande[0].livreur_id !== null) {
      return res.status(400).json({ erreur: 'Commande déjà assignée à un livreur' });
    }
    const [livreur] = await connexion.execute(
      'SELECT id, actif, nom, prenom FROM livreurs WHERE id = ? AND boutique_id = ?',
      [livreur_id, commande[0].boutique_id]
    );
    if (!livreur.length) {
      return res.status(404).json({ erreur: 'Livreur non trouvé pour cette boutique' });
    }
    if (!livreur[0].actif) {
      return res.status(400).json({ erreur: 'Livreur inactif' });
    }
    await connexion.execute(
      `UPDATE commandes
       SET livreur_id = ?, statut = 'en cours de livraison'
       WHERE id = ?`,
      [livreur_id, commandeId]
    );
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `Nouvelle commande #${commandeId} assignée à vous. Coordonnées client : (${commande[0].client_latitude}, ${commande[0].client_longitude})`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [livreur_id, commande[0].boutique_id, message, date]
    );
    await connexion.commit();
    res.json({
      message: 'Commande assignée avec succès',
      commande: {
        id: commandeId,
        client_latitude: commande[0].client_latitude,
        client_longitude: commande[0].client_longitude,
      },
    });
  } catch (erreur) {
    if (connexion) await connexion.rollback();
    console.error('Erreur lors de l\'assignation de la commande:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
      stack: erreur.stack,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'assignation de la commande' });
  } finally {
    if (connexion) connexion.release();
  }
});

app.get('/boutiques/:id/commandes', verifierToken, async (req, res) => {
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
    const [commandes] = await pool.execute(
      `SELECT c.id, c.statut, c.livreur_id, a.nom AS nom_article, s.nom AS nom_service
       FROM commandes c
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN services s ON c.service_id = s.id
       WHERE c.boutique_id = ?`,
      [boutiqueId]
    );
    res.json(commandes);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des commandes:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.post('/connexion/livreur', async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Identifiant et mot de passe requis' });
    }
    const [livreur] = await pool.execute(
      'SELECT id, boutique_id, nom, prenom, email, telephone, password FROM livreurs WHERE telephone = ? OR email = ?',
      [identifiant, identifiant]
    );
    if (!livreur.length) {
      return res.status(400).json({ erreur: 'Livreur non trouvé' });
    }
    const motDePasseValide = await bcrypt.compare(mot_de_passe, livreur[0].password);
    if (!motDePasseValide) {
      return res.status(400).json({ erreur: 'Mot de passe incorrect' });
    }
    const token = jwt.sign(
      { id: livreur[0].id, type: 'livreur', boutique_id: livreur[0].boutique_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({
      token,
      type: 'livreur',
      id: livreur[0].id,
      nom: livreur[0].nom,
      prenom: livreur[0].prenom,
      boutique_id: livreur[0].boutique_id,
    });
  } catch (erreur) {
    console.error('Erreur connexion livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.get('/livreur/commandes', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  try {
    const [commandes] = await pool.execute(
      `SELECT 
        c.id, 
        c.boutique_id, 
        c.client_latitude, 
        c.client_longitude, 
        c.statut, 
        c.client_nom, 
        c.client_telephone, 
        c.adresse_livraison, 
        c.date_creation AS reference, 
        c.image, 
        c.quantite, 
        c.prix, 
        b.nom AS boutique_nom,
        u.nom AS client_nom_utilisateur,
        u.telephone AS client_telephone_utilisateur,
        a.nom AS article_nom,
        s.nom AS service_nom
      FROM commandes c
      JOIN boutiques b ON c.boutique_id = b.id
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      LEFT JOIN articles a ON c.article_id = a.id
      LEFT JOIN services s ON c.service_id = s.id
      WHERE c.livreur_id = ? AND c.statut IN ('en attente', 'en cours de livraison')`,
      [req.utilisateur.id]
    );
    res.json(commandes);
  } catch (erreur) {
    console.error('Erreur récupération commandes livreur:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
    });
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.post('/commandes/:id/livrer', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  const commandeId = parseInt(req.params.id);
  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();
    const [commande] = await connexion.execute(
      `SELECT c.id, c.livreur_id, c.boutique_id
       FROM commandes c
       WHERE c.id = ? AND c.livreur_id = ? AND c.statut = 'en cours de livraison'`,
      [commandeId, req.utilisateur.id]
    );
    if (!commande.length) {
      return res.status(403).json({ erreur: 'Commande non trouvée, non autorisée, ou pas en cours de livraison' });
    }
    await connexion.execute(
      `UPDATE commandes SET statut = 'livrée' WHERE id = ?`,
      [commandeId]
    );
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `La commande #${commandeId} a été livrée avec succès.`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [req.utilisateur.id, commande[0].boutique_id, message, date]
    );
    await connexion.commit();
    res.json({ message: 'Commande marquée comme livrée' });
  } catch (erreur) {
    if (connexion) await connexion.rollback();
    console.error('Erreur lors de la livraison de la commande:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la livraison de la commande' });
  } finally {
    if (connexion) connexion.release();
  }
});

app.get('/livreur/profil', verifierToken, async (req, res) => {
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
});

app.put('/livreur/profil', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  const { nom, prenom, email, telephone, mot_de_passe, adresse } = req.body;
  let updates = [];
  let values = [];
  if (nom) {
    updates.push('nom = ?');
    values.push(nom);
  }
  if (prenom) {
    updates.push('prenom = ?');
    values.push(prenom);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (telephone) {
    updates.push('telephone = ?');
    values.push(telephone);
  }
  if (mot_de_passe) {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    updates.push('password = ?');
    values.push(hashedPassword);
  }
  if (adresse) {
    updates.push('adresse = ?');
    values.push(adresse);
  }
  if (req.file) {
    updates.push('photo = ?');
    values.push(`/uploads/${req.file.filename}`);
  }
  if (updates.length === 0) {
    return res.status(400).json({ erreur: 'Aucune modification fournie' });
  }
  values.push(req.utilisateur.id);
  try {
    const [result] = await pool.execute(
      `UPDATE livreurs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Livreur non trouvé' });
    }
    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (erreur) {
    console.error('Erreur mise à jour profil livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.get('/livreur/notifications', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  try {
    const [notifications] = await pool.execute(
      `SELECT n.id, n.message, n.date, n.lu, b.nom AS boutique_nom
       FROM notifications n
       JOIN boutiques b ON n.boutique_id = b.id
       WHERE n.utilisateur_id = ?
       ORDER BY n.date DESC`,
      [req.utilisateur.id]
    );
    res.json(notifications);
  } catch (erreur) {
    console.error('Erreur récupération notifications livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

app.post('/refresh-token', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ erreur: 'Token requis' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const [utilisateur] = await pool.execute(
      'SELECT id, type, actif FROM utilisateurs WHERE id = ?',
      [decoded.id]
    );
    if (!utilisateur.length || !utilisateur[0].actif) {
      return res.status(401).json({ erreur: 'Utilisateur non trouvé ou inactif' });
    }
    const nouveauJeton = jwt.sign(
      { id: utilisateur[0].id, type: utilisateur[0].type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token: nouveauJeton });
  } catch (erreur) {
    console.error('Erreur rafraîchissement token:', {
      message: erreur.message,
      stack: erreur.stack,
    });
    res.status(401).json({ erreur: 'Token invalide' });
  }
});

app.get('/client/profil', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    return res.status(403).json({ erreur: 'Accès réservé aux clients' });
  }
  try {
    const [utilisateur] = await pool.execute(
      'SELECT id, nom, prenom, telephone, email FROM utilisateurs WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!utilisateur.length) {
      return res.status(404).json({ erreur: 'Client non trouvé' });
    }
    res.json({
      id: utilisateur[0].id,
      nom: utilisateur[0].nom,
      prenom: utilisateur[0].prenom,
      telephone: utilisateur[0].telephone,
      email: utilisateur[0].email,
    });
  } catch (erreur) {
    console.error('Erreur récupération profil client:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

async function demarrerServeur() {
  try {
    await initialiserBaseDeDonnees();
    app.listen(3000, () => {
      console.log('Serveur démarré sur http://localhost:3000');
    });
  } catch (error) {
    console.error('Échec du démarrage du serveur :', error);
    process.exit(1);
  }
}

demarrerServeur();