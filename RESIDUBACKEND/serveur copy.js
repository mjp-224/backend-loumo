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
  database: process.env.DB_NAME || 'geo_app',
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
    await connexion.execute('CREATE DATABASE IF NOT EXISTS geo_app');
    await connexion.query('USE geo_app');

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
        telephone VARCHAR(20),  -- Nouveau champ
        adresse VARCHAR(255),  -- Nouveau champ
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
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
        FOREIGN KEY (livreur_id) REFERENCES livreurs(id) ON DELETE SET NULL
      )
    `);

    // Créer la table commentaires
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS commentaires (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        utilisateur_id INT NOT NULL,
        texte TEXT NOT NULL,
        article_id INT,
        service_id INT,
        date_creation DATETIME NOT NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `);


    // Créer la table historique_visites
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS historique_visites (
        utilisateur_id INT NOT NULL,
        boutique_id INT NOT NULL,
        date_visite DATETIME NOT NULL,
        frequence INT DEFAULT 1,
        PRIMARY KEY (utilisateur_id, boutique_id, date_visite),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

    // Créer la table livreurs
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS livreurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        password VARCHAR(255),  -- Nouveau champ pour le mot de passe
        photo VARCHAR(255),    -- Nouveau champ pour la photo (nullable)
        adresse VARCHAR(255),  -- Nouveau champ pour l'adresse
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
        quantite INT DEFAULT 1,  -- Ajout du champ quantite
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
        utilisateur_id INT NOT NULL, -- Gérant de la boutique
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

    /**ajoute un index sur commandes.utilisateur_id et commandes.boutique_id pour améliorer les performances */
    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_commandes_user_boutique ON commandes (utilisateur_id, boutique_id)
    `);

    // Ajouter l'index sur historique_visites.date_visite
    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_historique_visites_date ON historique_visites (date_visite)
    `);

    // Ajouter un index pour optimiser les requêtes statistiques sur commandes.boutique_id
    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_commandes_boutique ON commandes (boutique_id)
    `);

    // Ajouter un index pour optimiser les requêtes sur paiements.boutique_id
    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_paiements_boutique ON paiements (boutique_id)
    `);
    
    //Ajouter un index pour optimer les requêtes sur livreur.boutique_id
    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_livreurs_boutique ON livreurs (boutique_id)
    `);

    console.log('Base de données initialisée avec succès');
  } catch (erreur) {
    console.error('Erreur lors de l\'initialisation de la base de données :', erreur);
    throw erreur;
  } finally {
    if (connexion) connexion.release();
  }
}

// Middleware pour vérifier le token JWT
const verifierToken = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ erreur: 'Token requis' });
  try {
    const decode = jwt.verify(token, JWT_SECRET);
    req.utilisateur = decode;
    const [utilisateur] = await pool.execute(
      'SELECT type FROM utilisateurs WHERE id = ?',
      [decode.id]
    );
    if (!utilisateur.length) return res.status(401).json({ erreur: 'Utilisateur non trouvé' });
    req.utilisateur.type = utilisateur[0].type;
    next();
  } catch (erreur) {
    res.status(401).json({ erreur: 'Token invalide' });
  }
};

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erreur: err.message || 'Erreur serveur' });
});

// Routes
// Recherche de la route POST /inscription dans serveur.js
// Remplace le bloc existant par celui-ci
app.post('/inscription', upload.single('image'), async (req, res) => {
  try {
    const { nom, prenom, telephone, email, mot_de_passe, confirmer_mot_de_passe, date_naissance, type } = req.body;
    if (!nom || !prenom || !telephone || !mot_de_passe || !confirmer_mot_de_passe || !date_naissance) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    if (mot_de_passe !== confirmer_mot_de_passe) {
      return res.status(400).json({ erreur: 'Les mots de passe ne correspondent pas.' });
    }
    // Validation du format de l'email si fourni
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
    res.json({ token, type: utilisateur[0].type, id: utilisateur[0].id }); // Ajout de l'ID
  } catch (erreur) {
    throw erreur;
  }
});


// Routes protégées
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
    // Validation optionnelle du numéro de téléphone
    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (telephone && !telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
    }
    
    //Validation optionnelle de l'adresse
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
    //Validation optionnelle de l'adresse
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
    const [boutiques] = await pool.execute('SELECT * FROM boutiques');
    res.json(boutiques);
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

// app.post('/boutiques/:id/livreurs', verifierToken, upload.single('photo'), async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
//   try {
//     const { nom, prenom, telephone, email, password, adresse, actif } = req.body;
//     if (!nom || !prenom || !telephone) {
//       return res.status(400).json({ erreur: 'Nom, prénom et téléphone requis.' });
//     }
//     const telephoneRegex = /^\+?[0-9]{10,20}$/;
//     if (!telephoneRegex.test(telephone)) {
//       return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
//     }
//     if (adresse && adresse.length > 255) {
//       return res.status(400).json({ erreur: 'L\'adresse ne peut pas dépasser 255 caractères.' });
//     }
//     if (password && password.length < 8) {
//       return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' });
//     }
//     let hashedPassword = null;
//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 10);
//     }
//     const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
//     if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }
//     const [existant] = await pool.execute(
//       'SELECT id FROM livreurs WHERE telephone = ? AND boutique_id = ?',
//       [telephone, req.params.id]
//     );
//     if (existant.length) {
//       return res.status(400).json({ erreur: 'Téléphone déjà utilisé pour un livreur.' });
//     }
//     const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
//     const [resultat] = await pool.execute(
//       'INSERT INTO livreurs (boutique_id, nom, prenom, telephone, email, password, photo, adresse, actif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
//       [req.params.id, nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actif !== undefined ? actif : true]
//     );
//     res.json({ id: resultat.insertId });
//   } catch (erreur) {
//     throw erreur;
//   }
// });

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

app.put('/boutiques/:id/articles/:articleId', verifierToken, upload.single('image'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, prix, stock } = req.body;
    if (!nom || !prix) {
      return res.status(400).json({ erreur: 'Nom et prix sont requis.' });
    }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }
    const stockNum = parseInt(stock) || 0;
    if (stockNum < 0) {
      return res.status(400).json({ erreur: 'Le stock ne peut pas être négatif.' });
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
      'UPDATE articles SET nom = ?, description = ?, prix = ?, stock = ?, image = ? WHERE id = ? AND boutique_id = ?',
      [nom, description || null, prixNum, stockNum, cheminImage, req.params.articleId, req.params.id]
    );
    res.json({ message: 'Article mis à jour' });
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
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, prix, disponible } = req.body;
    if (!nom || !prix) {
      return res.status(400).json({ erreur: 'Nom et prix sont requis.' });
    }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }
    const disponibleBool = disponible === 'true' || disponible === true;
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
      'UPDATE services SET nom = ?, description = ?, prix = ?, disponible = ?, image = ? WHERE id = ? AND boutique_id = ?',
      [nom, description || null, prixNum, disponibleBool, cheminImage, req.params.serviceId, req.params.id]
    );
    res.json({ message: 'Service mis à jour' });
  } catch (erreur) {
    throw erreur;
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

// Gestion du panier
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
  console.log('Requête reçue pour DELETE /commandes/:id');
  const commandeId = parseInt(req.params.id);
  const utilisateurId = req.utilisateur.id;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (!commandeId || isNaN(commandeId)) {
      console.log('Erreur: Identifiant de commande invalide:', commandeId);
      throw new Error('Identifiant de commande invalide');
    }

    // Vérifier que la commande appartient à l'utilisateur
    const [commande] = await connection.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    if (!commande.length) {
      console.log('Erreur: Commande non trouvée ou non autorisée pour utilisateurId:', utilisateurId);
      throw new Error('Commande non trouvée ou non autorisée');
    }

    // Vérifier si la commande a des paiements associés
    const [paiements] = await connection.query(
      'SELECT * FROM paiements WHERE commande_id = ?',
      [commandeId]
    );
    if (paiements.length > 0) {
      console.log('Erreur: La commande a des paiements associés et ne peut pas être supprimée');
      throw new Error('La commande a des paiements associés et ne peut pas être supprimée');
    }

    // Notifier le livreur si un livreur est assigné
    if (commande[0].livreur_id) {
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `La commande #${commandeId} à laquelle vous étiez assigné a été annulée.`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [commande[0].boutique_id, commande[0].livreur_id, message, date]
      );
    }

    // Restaurer le stock si c'est une commande d'article
    if (commande[0].article_id) {
      const quantite = commande[0].quantite || 1;
      const [article] = await connection.query('SELECT * FROM articles WHERE id = ?', [commande[0].article_id]);
      if (!article.length) {
        console.log('Erreur: Article non trouvé pour article_id:', commande[0].article_id);
        throw new Error('Article non trouvé');
      }

      await connection.query(
        'UPDATE articles SET stock = stock + ? WHERE id = ?',
        [quantite, commande[0].article_id]
      );
    }

    // Supprimer la commande
    await connection.query('DELETE FROM commandes WHERE id = ?', [commandeId]);

    await connection.commit();
    res.status(200).json({ message: 'Commande annulée avec succès' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Erreur détaillée suppression commande:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
    });

    if (error.message === 'Identifiant de commande invalide') {
      res.status(400).json({ erreur: error.message });
    } else if (error.message === 'Commande non trouvée ou non autorisée') {
      res.status(404).json({ erreur: error.message });
    } else if (error.message === 'Article non trouvé') {
      res.status(404).json({ erreur: error.message });
    } else if (error.message === 'La commande a des paiements associés et ne peut pas être supprimée') {
      res.status(400).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur lors de l\'annulation de la commande' });
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
});





// Confirmer un paiement pour une commande
// Confirmer un paiement pour une commande
// Confirmer un paiement pour une commande
app.post('/commandes/:id/paiement', verifierToken, async (req, res) => {
  console.log('Requête reçue pour POST /commandes/:id/paiement');
  const commandeId = parseInt(req.params.id);
  const { moyen_paiement } = req.body;
  const utilisateurId = req.utilisateur.id;

  try {
    if (!commandeId || isNaN(commandeId)) {
      console.log('Erreur: Identifiant de commande invalide');
      return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
    }

    if (!moyen_paiement || !['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'].includes(moyen_paiement)) {
      console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
      return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
    }

    // Vérifier que la commande existe et appartient à l'utilisateur
    const [commande] = await pool.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    console.log('Commande trouvée dans la base:', commande);
    if (commande.length === 0) {
      console.log('Erreur: Commande non trouvée ou non autorisée');
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }

    if (commande[0].statut !== 'en attente') {
      console.log('Erreur: Statut de la commande non valide pour paiement', commande[0].statut);
      return res.status(400).json({ erreur: 'Cette commande a déjà été payée ou annulée' });
    }

    // Vérifier que la boutique existe
    const [boutique] = await pool.query('SELECT * FROM boutiques WHERE id = ?', [commande[0].boutique_id]);
    console.log('Boutique trouvée:', boutique);
    if (boutique.length === 0) {
      console.log('Erreur: Boutique non trouvée pour la commande');
      return res.status(404).json({ erreur: 'Boutique non trouvée pour la commande' });
    }

    // Mettre à jour la commande avec le moyen de paiement et le statut
    await pool.query(
      'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
      ['en préparation', moyen_paiement, commandeId]
    );
    console.log('Paiement confirmé pour commande:', commandeId);

    // Enregistrer le paiement dans la table paiements
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log('Insertion dans paiements:', {
      commandeId,
      utilisateurId,
      boutiqueId: commande[0].boutique_id,
      montant: commande[0].prix,
      moyen_paiement,
      date,
    });
    const [paiementResult] = await pool.query(
      'INSERT INTO paiements (commande_id, utilisateur_id, boutique_id, montant, moyen_paiement, date) VALUES (?, ?, ?, ?, ?, ?)',
      [commandeId, utilisateurId, commande[0].boutique_id, commande[0].prix, moyen_paiement, date]
    );
    console.log('Paiement enregistré dans la table paiements, ID:', paiementResult.insertId);

    // Récupérer le gérant de la boutique
    const [gerant] = await pool.query(
      'SELECT u.* FROM utilisateurs u JOIN boutiques b ON u.id = b.gerant_id WHERE b.id = ? AND u.type = ?',
      [commande[0].boutique_id, 'gerant']
    );
    console.log('Gérant trouvé:', gerant);
    if (gerant.length === 0) {
      console.log('Aucun gérant trouvé pour la boutique:', commande[0].boutique_id);
    } else {
      // Envoyer une notification au gérant (simulée en l'enregistrant dans la table notifications)
      const message = `Nouveau paiement reçu : ${commande[0].prix} GNF via ${moyen_paiement} pour la commande #${commandeId}.`;
      console.log('Insertion dans notifications:', {
        boutiqueId: commande[0].boutique_id,
        utilisateurId: gerant[0].id,
        message,
        date,
      });
      const [notificationResult] = await pool.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [commande[0].boutique_id, gerant[0].id, message, date]
      );
      console.log('Notification enregistrée pour le gérant, ID:', notificationResult.insertId);
    }

    res.status(200).json({ message: 'Paiement effectué avec succès', moyen_paiement });
  } catch (error) {
    console.error('Erreur détaillée paiement commande:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors du paiement de la commande' });
  }
});


// Récupérer les commentaires pour un article ou un service
app.get('/boutiques/:id/commentaires', verifierToken, async (req, res) => {
  console.log('Requête reçue pour GET /boutiques/:id/commentaires');
  const boutiqueId = parseInt(req.params.id);
  const { article_id, service_id } = req.query;

  try {
    if (!boutiqueId || isNaN(boutiqueId)) {
      console.log('Erreur: Identifiant de boutique invalide:', boutiqueId);
      return res.status(400).json({ erreur: 'Identifiant de boutique invalide' });
    }

    if (!article_id && !service_id) {
      console.log('Erreur: Aucun article ou service spécifié');
      return res.status(400).json({ erreur: 'Aucun article ou service spécifié' });
    }

    if (article_id && service_id) {
      console.log('Erreur: Impossible de spécifier à la fois un article et un service');
      return res.status(400).json({ erreur: 'Impossible de spécifier à la fois un article et un service' });
    }

    let query = `
      SELECT c.id, c.texte, DATE_FORMAT(c.date_creation, '%Y-%m-%d %H:%i:%s') AS date, u.nom, u.prenom, u.image
      FROM commentaires c
      JOIN utilisateurs u ON c.utilisateur_id = u.id
      WHERE c.boutique_id = ?
    `;
    const queryParams = [boutiqueId];

    if (article_id) {
      query += ' AND c.article_id = ?';
      queryParams.push(parseInt(article_id));
    } else if (service_id) {
      query += ' AND c.service_id = ?';
      queryParams.push(parseInt(service_id));
    }

    console.log('Requête SQL:', query, 'Params:', queryParams);
    const [comments] = await pool.query(query, queryParams);
    console.log('Résultat de la requête:', comments);

    if (comments.length === 0) {
      console.log('Aucun commentaire trouvé pour boutiqueId:', boutiqueId);
    }

    res.status(200).json(comments);
  } catch (error) {
    console.error('Erreur récupération commentaires:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des commentaires' });
  }
});


// Endpoint POST /boutiques/:id/commandes
// Créer une commande
app.post('/boutiques/:id/commandes', verifierToken, async (req, res) => {
  console.log('Requête reçue pour POST /boutiques/:id/commandes');
  const boutiqueId = parseInt(req.params.id);
  const { article_id, service_id, prix, moyen_paiement, statut, image, quantite, livreur_id } = req.body;
  const utilisateurId = req.utilisateur.id;

  try {
    if (!boutiqueId || isNaN(boutiqueId)) {
      return res.status(400).json({ erreur: 'Identifiant de boutique invalide' });
    }

    if (article_id && service_id) {
      return res.status(400).json({ erreur: 'Une commande ne peut pas contenir à la fois un article et un service' });
    }

    if (!article_id && !service_id) {
      return res.status(400).json({ erreur: 'Une commande doit contenir un article ou un service' });
    }

    if (!prix || isNaN(prix) || prix <= 0) {
      return res.status(400).json({ erreur: 'Prix invalide' });
    }

    if (!['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'].includes(moyen_paiement)) {
      return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
    }

    if (!['en attente', 'acceptée', 'en préparation', 'livrée', 'en cours de livraison'].includes(statut)) {
      return res.status(400).json({ erreur: 'Statut invalide' });
    }

    if (!image) {
      return res.status(400).json({ erreur: 'Image manquante' });
    }

    // Valider quantite pour les articles
    let finalQuantite = null;
    if (article_id) {
      if (!quantite || isNaN(quantite) || quantite < 1) {
        return res.status(400).json({ erreur: 'Quantité invalide' });
      }
      finalQuantite = parseInt(quantite);
    }

    // Valider livreur_id si fourni
    if (livreur_id) {
      const [livreur] = await pool.query('SELECT id FROM livreurs WHERE id = ? AND boutique_id = ?', [livreur_id, boutiqueId]);
      if (!livreur.length) {
        return res.status(404).json({ erreur: 'Livreur non trouvé ou ne correspond pas à la boutique' });
      }
    }

    // Vérifier l'existence de la boutique
    const [boutique] = await pool.query('SELECT * FROM boutiques WHERE id = ?', [boutiqueId]);
    if (!boutique.length) {
      return res.status(404).json({ erreur: 'Boutique non trouvée' });
    }

    // Vérifier l'article ou le service
    if (article_id) {
      const [article] = await pool.query('SELECT * FROM articles WHERE id = ? AND boutique_id = ?', [article_id, boutiqueId]);
      if (!article.length) {
        return res.status(404).json({ erreur: 'Article non trouvé ou ne correspond pas à la boutique' });
      }
      if (article[0].stock < finalQuantite) {
        return res.status(400).json({ erreur: 'Stock insuffisant' });
      }
    }

    if (service_id) {
      const [service] = await pool.query('SELECT * FROM services WHERE id = ? AND boutique_id = ?', [service_id, boutiqueId]);
      if (!service.length) {
        return res.status(404).json({ erreur: 'Service non trouvé ou ne correspond pas à la boutique' });
      }
    }

    // Insérer la commande avec livreur_id
    const [result] = await pool.query(
      `INSERT INTO commandes (utilisateur_id, boutique_id, article_id, service_id, prix, statut, moyen_paiement, image, quantite, livreur_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [utilisateurId, boutiqueId, article_id || null, service_id || null, prix, statut, moyen_paiement, image, finalQuantite, livreur_id || null]
    );

    // Mettre à jour le stock si article
    if (article_id) {
      await pool.query('UPDATE articles SET stock = stock - ? WHERE id = ?', [finalQuantite, article_id]);
    }

    res.status(201).json({ id: result.insertId, message: 'Commande créée avec succès' });
  } catch (error) {
    console.error('Erreur création commande:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la création de la commande' });
  }
});



//Rejeter le paiement si le statuts n'est pas en attende
// Confirmer un paiement pour une commande
app.post('/commandes/:id/paiement', verifierToken, async (req, res) => {
  console.log('Requête reçue pour POST /commandes/:id/paiement');
  const commandeId = parseInt(req.params.id);
  const { moyen_paiement } = req.body;
  const utilisateurId = req.utilisateur.id;

  try {
    if (!commandeId || isNaN(commandeId)) {
      console.log('Erreur: Identifiant de commande invalide');
      return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
    }

    if (!moyen_paiement || !['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'].includes(moyen_paiement)) {
      console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
      return res.status(400).json({ erreur: 'Moyen de paiement invalide encore' });
    }

    // Vérifier que la commande existe et appartient à l'utilisateur
    const [commande] = await pool.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    console.log('Commande trouvée dans la base:', commande);
    if (commande.length === 0) {
      console.log('Erreur: Commande non trouvée ou non autorisée');
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }

    // Vérifier que la commande est en attente de paiement
    if (commande[0].statut !== 'en attente') {
      console.log('Erreur: Statut de la commande non valide pour paiement', commande[0].statut);
      return res.status(400).json({ erreur: 'Cette commande n\'est plus en attente de paiement' });
    }

    // Vérifier que la boutique existe
    const [boutique] = await pool.query('SELECT * FROM boutiques WHERE id = ?', [commande[0].boutique_id]);
    console.log('Boutique trouvée:', boutique);
    if (boutique.length === 0) {
      console.log('Erreur: Boutique non trouvée pour la commande');
      return res.status(404).json({ erreur: 'Boutique non trouvée pour la commande' });
    }

    // Mettre à jour la commande avec le moyen de paiement et passer au statut suivant (par exemple, 'acceptée')
    await pool.query(
      'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
      ['en préparation', moyen_paiement, commandeId]
    );
    console.log('Paiement confirmé pour commande, nouveau statut:', 'en préparation');

    // Enregistrer le paiement dans la table paiements
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log('Insertion dans paiements:', {
      commandeId,
      utilisateurId,
      boutiqueId: commande[0].boutique_id,
      montant: commande[0].prix,
      moyen_paiement,
      date,
    });
    const [paiementResult] = await pool.query(
      'INSERT INTO paiements (commande_id, utilisateur_id, boutique_id, montant, moyen_paiement, date) VALUES (?, ?, ?, ?, ?, ?)',
      [commandeId, utilisateurId, commande[0].boutique_id, commande[0].prix, moyen_paiement, date]
    );
    console.log('Paiement enregistré dans la table paiements, ID:', paiementResult.insertId);

    // Récupérer le gérant de la boutique
    const [gerant] = await pool.query(
      'SELECT u.* FROM utilisateurs u JOIN boutiques b ON u.id = b.utilisateur_id WHERE b.id = ? AND u.type = ?',
      [commande[0].boutique_id, 'gerant']
    );
    console.log('Gérant trouvé:', gerant);
    if (gerant.length === 0) {
      console.log('Aucun gérant trouvé pour la boutique:', commande[0].boutique_id);
    } else {
      // Envoyer une notification au gérant (simulée en l'enregistrant dans la table notifications)
      const message = `Nouveau paiement reçu : ${commande[0].prix} GNF via ${moyen_paiement} pour la commande #${commandeId}.`;
      console.log('Insertion dans notifications:', {
        boutiqueId: commande[0].boutique_id,
        utilisateurId: gerant[0].id,
        message,
        date,
      });
      const [notificationResult] = await pool.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [commande[0].boutique_id, gerant[0].id, message, date]
      );
      console.log('Notification enregistrée pour le gérant, ID:', notificationResult.insertId);
    }

    res.status(200).json({ message: 'Paiement effectué avec succès', moyen_paiement });
  } catch (error) {
    console.error('Erreur détaillée paiement commande:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors du paiement de la commande' });
  }
});



app.get('/commandes', verifierToken, async (req, res) => {
  try {
    let commandes;
    if (req.utilisateur.type === 'client') {
      [commandes] = await pool.execute(
        `SELECT c.*, b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone
         FROM commandes c
         LEFT JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE c.utilisateur_id = ?`,
        [req.utilisateur.id]
      );
    } else {
      [commandes] = await pool.execute(
        `SELECT c.*, b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone
         FROM commandes c
         JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE b.gerant_id = ?`,
        [req.utilisateur.id]
      );
    }
    res.json(commandes);
  } catch (erreur) {
    res.status(500).json({ erreur: 'Erreur lors de la récupération des commandes' });
  }
});



app.put('/commandes/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { statut } = req.body;
    if (!['en attente', 'acceptée', 'en préparation', 'livrée', 'en cours de livraison'].includes(statut)) {
      return res.status(400).json({ erreur: 'Statut invalide' });
    }
    const [commande] = await pool.execute(
      'SELECT b.gerant_id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ?',
      [req.params.id]
    );
    if (!commande.length || commande[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('UPDATE commandes SET statut = ? WHERE id = ?', [statut, req.params.id]);
    res.json({ message: 'Commande mise à jour' });
  } catch (erreur) {
    throw erreur;
  }
});



app.post('/boutiques/:id/commentaires', verifierToken, async (req, res) => {
  const { id } = req.params;
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
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});


app.get('/boutiques/:id/commentaires', async (req, res) => {
  const { id } = req.params;
  try {
    const [commentaires] = await pool.query(
      'SELECT c.*, u.nom, u.prenom FROM commentaires c JOIN utilisateurs u ON c.utilisateur_id = u.id WHERE c.boutique_id = ?',
      [id]
    );
    res.json(commentaires);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});


app.get('/commandes/:id/payer', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { moyen_paiement } = req.body;
    const moyensPaiement = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'];
    if (!moyen_paiement || !moyensPaiement.includes(moyen_paiement)) {
      return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
    }
    const [commande] = await pool.execute(
      'SELECT statut, utilisateur_id FROM commandes WHERE id = ?',
      [req.params.id]
      );
    if (!commande.length || commande[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou accès refusé' });
    }
    if (commande[0].statut !== 'en attente') {
      return res.status(400).json({ erreur: 'Seules les commandes en attente peuvent être payées' });
    }
    await pool.execute(
      'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
      ['en préparation', moyen_paiement, req.params.id]
    );
    res.json({ message: 'Paiement effectué' });
  } catch (erreur) {
    throw erreur;
  }
});

app.post('/commandes/:id/reduction', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { montant_propose } = req.body;
    if (!montant_propose || isNaN(montant_propose) || montant_propose <= 0) {
      return res.status(400).json({ erreur: 'Montant proposé invalide' });
    }
    const [commande] = await pool.execute(
      'SELECT c.*, b.gerant_id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ?',
      [req.params.id]
    );
    if (!commande.length || commande[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou accès refusé' });
    }
    if (commande[0].statut !== 'en attente') {
      return res.status(400).json({ erreur: 'Seules les commandes en attente peuvent demander une réduction' });
    }
    if (montant_propose >= commande[0].prix) {
      return res.status(400).json({ erreur: 'Le montant proposé doit être inférieur au prix actuel' });
    }
    const [resultat] = await pool.execute(
      'INSERT INTO reductions (commande_id, utilisateur_id, montant_propose, statut) VALUES (?, ?, ?, ?)',
      [req.params.id, req.utilisateur.id, montant_propose, 'en attente']
    );

    // Ajout de la notification pour le gérant
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `Nouvelle demande de réduction pour la commande #${req.params.id} : ${montant_propose} GNF proposé (prix initial : ${commande[0].prix} GNF).`;
    await pool.execute(
      'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
      [commande[0].boutique_id, commande[0].gerant_id, message, date]
    );

    res.json({ message: 'Demande de réduction envoyée', id: resultat.insertId });
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/reductions', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [reductions] = await pool.execute(
      `SELECT r.*, c.id AS commande_id, c.prix AS commande_prix, u.nom AS utilisateur_nom, u.prenom
       FROM reductions r
       JOIN commandes c ON r.commande_id = c.id
       JOIN utilisateurs u ON r.utilisateur_id = u.id
       WHERE c.boutique_id IN (SELECT id FROM boutiques WHERE gerant_id = ?)
       ORDER BY r.date_creation DESC`,
      [req.utilisateur.id]
    );
    res.json(reductions);
  } catch (erreur) {
    throw erreur;
  }
});

app.put('/reductions/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    console.log('Accès refusé : Utilisateur type', req.utilisateur.type);
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent gérer les réductions.' });
  }
  const { statut } = req.body;
  if (!['acceptée', 'refusée'].includes(statut)) {
    return res.status(400).json({ erreur: 'Statut invalide' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [reductions] = await connection.query(
      `SELECT r.*, c.*
       FROM reductions r
       JOIN commandes c ON r.commande_id = c.id
       WHERE r.id = ? AND c.boutique_id IN (SELECT id FROM boutiques WHERE gerant_id = ?)`,
      [req.params.id, req.utilisateur.id]
    );

    if (!reductions.length) {
      console.log('Demande de réduction non trouvée pour id:', req.params.id, 'et gerant_id:', req.utilisateur.id);
      return res.status(404).json({ erreur: 'Demande de réduction non trouvée ou non autorisée' });
    }

    const reduction = reductions[0];
    if (reduction.statut !== 'en attente') {
      return res.status(400).json({ erreur: 'Cette demande a déjà été traitée' });
    }

    if (statut === 'acceptée') {
      // Mettre à jour le prix de la commande avec le montant proposé
      await connection.query(
        'UPDATE commandes SET prix = ? WHERE id = ?',
        [reduction.montant_propose, reduction.commande_id]
      );

      // Ajouter une notification pour le client
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `Votre demande de réduction pour la commande #${reduction.commande_id} a été acceptée. Nouveau prix : ${reduction.montant_propose} GNF.`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [reduction.boutique_id, reduction.utilisateur_id, message, date]
      );
    } else {
      // Ajouter une notification pour le client en cas de refus
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `Votre demande de réduction pour la commande #${reduction.commande_id} a été refusée.`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [reduction.boutique_id, reduction.utilisateur_id, message, date]
      );
    }

    // Mettre à jour le statut de la réduction
    await connection.query(
      'UPDATE reductions SET statut = ? WHERE id = ?',
      [statut, req.params.id]
    );

    await connection.commit();
    res.json({ message: `Demande de réduction ${statut} avec succès` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur dans PUT /reductions/:id:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la mise à jour de la réduction' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/historique_visites', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [visites] = await pool.execute(
      'SELECT b.nom, b.categorie, h.frequence, h.date_visite FROM historique_visites h JOIN boutiques b ON h.boutique_id = b.id WHERE h.utilisateur_id = ? ORDER BY h.date_visite DESC',
      [req.utilisateur.id]
    );
    res.json(visites);
  } catch (erreur) {
    throw erreur;
  }
});

app.get('/depenses', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [depenses] = await pool.execute(
      'SELECT SUM(prix) as total FROM commandes WHERE utilisateur_id = ?',
      [req.utilisateur.id]
    );
    res.json({ total: depenses[0].total || 0 });
  } catch (erreur) {
    throw erreur;
  }
});

app.patch('/paniers/:id', verifierToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantite } = req.body;
    if (!quantite || quantite < 1) {
      return res.status(400).json({ erreur: 'Quantité invalide' });
    }
    const [panier] = await pool.execute(
      'SELECT utilisateur_id FROM paniers WHERE id = ?',
      [id]
    );
    if (!panier.length) {
      return res.status(404).json({ erreur: 'Panier non trouvé' });
    }
    if (panier[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Non autorisé' });
    }
    await pool.execute(
      'UPDATE paniers SET quantite = ? WHERE id = ?',
      [quantite, id]
    );
    res.json({ message: 'Quantité mise à jour' });
  } catch (error) {
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour du panier' });
  }
});


app.get('/notifications', verifierToken, async (req, res) => {
  try {
    let notifications;
    if (req.utilisateur.type === 'gerant') {
      // Notifications pour les gérants (associées à leurs boutiques)
      [notifications] = await pool.execute(
        `SELECT n.*, b.nom AS boutique_nom
         FROM notifications n
         JOIN boutiques b ON n.boutique_id = b.id
         WHERE n.utilisateur_id = ?
         ORDER BY n.date DESC`,
        [req.utilisateur.id]
      );
    } else if (req.utilisateur.type === 'client') {
      // Notifications pour les clients (associées à eux directement)
      [notifications] = await pool.execute(
        `SELECT n.*, b.nom AS boutique_nom
         FROM notifications n
         JOIN boutiques b ON n.boutique_id = b.id
         WHERE n.utilisateur_id = ?
         ORDER BY n.date DESC`,
        [req.utilisateur.id]
      );
    } else {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    res.json(notifications);
  } catch (erreur) {
    console.error('Erreur dans GET /notifications:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des notifications' });
  }
});

app.get('/utilisateur', verifierToken, async (req, res) => {
  try {
    const [utilisateur] = await pool.execute(
      'SELECT id, nom, prenom, email, telephone, type FROM utilisateurs WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!utilisateur.length) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }
    res.json(utilisateur[0]);
  } catch (erreur) {
    console.error('Erreur dans GET /utilisateur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des informations utilisateur' });
  }
});

app.put('/utilisateur', verifierToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Requête reçue pour PUT /utilisateur:', {
      body: req.body,
      file: req.file,
    });

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

    const [user] = await pool.execute('SELECT image FROM utilisateurs WHERE id = ?', [req.utilisateur.id]);
    if (!user.length) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }

    let imagePath = null;
    if (req.file) {
      // Nouvelle image uploadée, renommer et définir le chemin
      imagePath = `/uploads/${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, imagePath);
      fs.renameSync(req.file.path, filePath); // Déplacer le fichier uploadé vers le nouveau chemin
      console.log('Nouvelle image renommée et stockée:', imagePath);

      // Supprimer l'ancienne image si elle existe
      if (user[0].image) {
        const oldImagePath = path.join(__dirname, user[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('Ancienne image supprimée:', oldImagePath);
        }
      }
    } else if (existingImagePath) {
      // Pas de nouvelle image, utiliser l'image existante envoyée par le client
      imagePath = existingImagePath;
      console.log('Utilisation de l\'image existante (envoyée par le client):', imagePath);
    } else if (user[0].image) {
      // Pas de nouvelle image ni d'image existante dans la requête, conserver l'image actuelle
      imagePath = user[0].image;
      console.log('Utilisation de l\'image existante (de la base de données):', imagePath);
    }

    if (imagePath) {
      const filePath = path.join(__dirname, imagePath);
      if (!fs.existsSync(filePath)) {
        console.error(`Fichier manquant : ${filePath} n'existe pas`);
        return res.status(500).json({ erreur: 'Image introuvable sur le serveur' });
      }
    }

    const [result] = await pool.execute(
      'UPDATE utilisateurs SET nom = ?, prenom = ?, telephone = ?, email = ?, date_naissance = ?, image = ? WHERE id = ?',
      [nom, prenom, telephone, email || null, date_naissance, imagePath, req.utilisateur.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Profil mis à jour avec succès', image: imagePath });
  } catch (erreur) {
    console.error('Erreur dans PUT /utilisateur:', {
      message: erreur.message,
      stack: erreur.stack,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la mise à jour du profil' });
  }
});

// Récupérer l'historique des commandes pour l'utilisateur connecté
app.get('/commandes/historique', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leur historique.' });
  }
  try {
    const [commandes] = await pool.execute(
      `SELECT c.*, b.nom AS boutique_nom
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.utilisateur_id = ? AND c.statut = 'livrée'
       ORDER BY c.date_creation DESC`,
      [req.utilisateur.id]
    );
    // Récupérer les articles pour chaque commande
    const commandesWithDetails = await Promise.all(
      commandes.map(async (commande) => {
        const [articles] = await pool.execute(
          `SELECT a.*
           FROM articles a
           JOIN commandes ca ON a.id = ca.article_id
           WHERE ca.id = ?`,
          [commande.id]
        );
        return { ...commande, articles };
      })
    );
    res.json(commandesWithDetails);
  } catch (erreur) {
    console.error('Erreur dans GET /commandes/historique:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération de l\'historique' });
  }
});

// Calculer les dépenses totales de l'utilisateur
app.get('/commandes/depenses', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leurs dépenses.' });
  }
  try {
    const [result] = await pool.execute(
      `SELECT SUM(prix) AS total_depenses
       FROM commandes
       WHERE utilisateur_id = ? AND statut != 'brouillon'`,
      [req.utilisateur.id]
    );
    const totalDepenses = Number(result[0].total_depenses || 0);
    res.json({ total_depenses: totalDepenses });
  } catch (erreur) {
    console.error('Erreur dans GET /commandes/depenses:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors du calcul des dépenses' });
  }
});

// Récupérer des statistiques de navigation (simplifié, basé sur une hypothèse locale pour l'instant)
app.get('/statistiques/navigation', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leurs statistiques.' });
  }
  try {
    // Pour l'instant, simulation sans suivi réel (à remplacer par une table de logs si besoin)
    const [visites] = await pool.execute(
      `SELECT b.nom, COUNT(*) AS visite_count
       FROM boutiques b
       JOIN visites v ON b.id = v.boutique_id
       WHERE v.utilisateur_id = ?
       GROUP BY b.id, b.nom
       ORDER BY visite_count DESC
       LIMIT 5`,
      [req.utilisateur.id]
    );
    res.json({ visites_par_boutique: visites });
  } catch (erreur) {
    console.error('Erreur dans GET /statistiques/navigation:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des statistiques' });
  }
});



app.post('/visites', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent enregistrer des visites.' });
  }
  const { boutique_id } = req.body;
  if (!boutique_id) {
    return res.status(400).json({ erreur: 'boutique_id est requis' });
  }
  try {
    const dateVisite = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO visites (utilisateur_id, boutique_id, date_visite) VALUES (?, ?, ?)',
      [req.utilisateur.id, boutique_id, dateVisite]
    );
    res.json({ message: 'Visite enregistrée', id: result.insertId });
  } catch (erreur) {
    console.error('Erreur dans POST /visites:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'enregistrement de la visite' });
  }
});


app.get('/commandes/depenses/detail', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les clients peuvent voir leurs dépenses.' });
  }
  try {
    const utilisateurId = req.utilisateur.id;

    // Étape 1 : Récupérer les boutiques avec leurs totaux (corrigé pour inclure toutes les commandes)
    const [boutiques] = await pool.execute(
      `SELECT 
        b.id AS store_id,
        b.nom AS store_name,
        SUM(c.prix) AS total_amount
      FROM commandes c
      JOIN boutiques b ON c.boutique_id = b.id
      WHERE c.utilisateur_id = ? AND c.statut = 'en préparation'
      GROUP BY b.id, b.nom`,
      [utilisateurId]
    );

    // Étape 2 : Récupérer et grouper les articles et services pour chaque boutique
    const expensesByStore = [];
    for (const boutique of boutiques) {
      // Récupérer les articles avec leurs prix
      const [articles] = await pool.execute(
        `SELECT 
          a.nom AS name,
          c.prix AS price
        FROM commandes c
        JOIN articles a ON c.article_id = a.id
        WHERE c.boutique_id = ? AND c.utilisateur_id = ? AND c.statut = 'en préparation'`,
        [boutique.store_id, utilisateurId]
      );

      // Récupérer les services avec leurs prix
      const [services] = await pool.execute(
        `SELECT 
          s.nom AS name,
          c.prix AS price
        FROM commandes c
        JOIN services s ON c.service_id = s.id
        WHERE c.boutique_id = ? AND c.utilisateur_id = ? AND c.statut = 'en préparation'`,
        [boutique.store_id, utilisateurId]
      );

      // Grouper les articles par nom et calculer les sous-totaux
      const groupedArticles = articles.reduce((acc, article) => {
  const existing = acc.find(item => item.name === article.name);
  if (existing) {
    existing.price += Number(article.price);
    existing.quantity += 1;
  } else {
    acc.push({ name: article.name, price: Number(article.price), quantity: 1 });
  }
  return acc;
}, []);


      // Grouper les services par nom et calculer les sous-totaux
      const groupedServices = services.reduce((acc, service) => {
  const existing = acc.find(item => item.name === service.name);
  if (existing) {
    existing.price += Number(service.price);
    existing.quantity += 1;
  } else {
    acc.push({ name: service.name, price: Number(service.price), quantity: 1 });
  }
  return acc;
}, []);


      // Ajouter les données à expensesByStore
      expensesByStore.push({
        store_id: boutique.store_id,
        store_name: boutique.store_name,
        total_amount: boutique.total_amount || 0,
        articles: groupedArticles.filter(item => item.name && Number(item.price)),
        services: groupedServices.filter(item => item.name && Number(item.price)),
      });
    }

    // Calculer le total des dépenses (somme des total_amount des boutiques)
    const totalDepenses = expensesByStore.reduce((sum, store) => sum + Number(store.total_amount || 0), 0);

    // Vérification pour s'assurer que totalDepenses est cohérent
    if (totalDepenses === 0 && expensesByStore.length > 0) {
      console.warn('Total des dépenses calculé à 0, vérifiez les données dans la base.');
    }

    res.json({
      total_depenses: totalDepenses,
      expenses_by_store: expensesByStore,
    });
  } catch (error) {
    console.error('Erreur dans GET /commandes/depenses/detail:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des détails des dépenses' });
  }
});

// Nouvelle route pour récupérer un article spécifique par son ID
app.get('/boutiques/:id/articles/:articleId', async (req, res) => {
  try {
    const [article] = await pool.execute(
      'SELECT * FROM articles WHERE id = ? AND boutique_id = ?',
      [req.params.articleId, req.params.id]
    );
    if (!article.length) {
      return res.status(404).json({ erreur: 'Article non trouvé ou ne correspond pas à la boutique' });
    }
    res.json(article[0]);
  } catch (erreur) {
    throw erreur;
  }
});


// Nouvelle route pour récupérer un service spécifique par son ID
app.get('/boutiques/:id/services/:serviceId', async (req, res) => {
  try {
    const [service] = await pool.execute(
      'SELECT * FROM services WHERE id = ? AND boutique_id = ?',
      [req.params.serviceId, req.params.id]
    );
    if (!service.length) {
      return res.status(404).json({ erreur: 'Service non trouvé ou ne correspond pas à la boutique' });
    }
    res.json(service[0]);
  } catch (erreur) {
    throw erreur;
  }
});

app.put('/boutiques/:boutiqueId/commentaires/:commentId', verifierToken, async (req, res) => {
  try {
    const { texte } = req.body;
    if (!texte || !texte.trim()) {
      return res.status(400).json({ erreur: 'Le texte du commentaire est requis' });
    }

    const [comment] = await pool.execute(
      'SELECT * FROM commentaires WHERE id = ? AND utilisateur_id = ?',
      [req.params.commentId, req.utilisateur.id]
    );
    if (!comment.length) {
      return res.status(403).json({ erreur: 'Accès refusé ou commentaire non trouvé' });
    }

    await pool.execute(
      'UPDATE commentaires SET texte = ? WHERE id = ?',
      [texte, req.params.commentId]
    );
    res.json({ message: 'Commentaire modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification du commentaire:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la modification du commentaire' });
  }
});


app.delete('/boutiques/:boutiqueId/commentaires/:commentId', verifierToken, async (req, res) => {
  try {
    const [comment] = await pool.execute(
      'SELECT * FROM commentaires WHERE id = ? AND utilisateur_id = ?',
      [req.params.commentId, req.utilisateur.id]
    );
    if (!comment.length) {
      return res.status(403).json({ erreur: 'Accès refusé ou commentaire non trouvé' });
    }

    await pool.execute(
      'DELETE FROM commentaires WHERE id = ?',
      [req.params.commentId]
    );
    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de la suppression du commentaire' });
  }
});

// Ajout pour la partie Gérant
// Récupérer les boutiques d'un gérant connecté
app.get('/gerant/boutiques', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent accéder à cette ressource.' });
  }
  try {
    const [boutiques] = await pool.execute(
      'SELECT * FROM boutiques WHERE gerant_id = ?',
      [req.utilisateur.id]
    );
    res.json(boutiques);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des boutiques du gérant:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des boutiques' });
  }
});


// Récupérer les commandes d'une boutique spécifique
// app.get('/boutiques/:id/commandes', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès refusé' });
//   }
//   try {
//     const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
//     if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }
//     const [commandes] = await pool.execute(
//       `SELECT c.*, b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
//               a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
//               s.nom AS service_nom, s.description AS service_description, s.image AS service_image
//        FROM commandes c
//        LEFT JOIN boutiques b ON c.boutique_id = b.id
//        LEFT JOIN articles a ON c.article_id = a.id
//        LEFT JOIN services s ON c.service_id = s.id
//        WHERE c.boutique_id = ?`,
//       [req.params.id]
//     );
//     res.json(commandes);
//   } catch (erreur) {
//     console.error('Erreur lors de la récupération des commandes:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des commandes' });
//   }
// });


app.get('/boutiques/:id/commandes', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé' });
  }
  try {
    const boutiqueId = req.params.id;
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [boutiqueId]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const [commandes] = await pool.execute(
      `SELECT 
         c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.prix, c.statut, 
         c.moyen_paiement, c.date_creation, c.quantite, c.livreur_id, c.image AS commande_image,
         u.nom AS client_nom, u.prenom AS client_prenom, u.email AS client_email,
         b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
         a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
         s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
         l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone
       FROM commandes c
       LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
       LEFT JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN services s ON c.service_id = s.id
       LEFT JOIN livreurs l ON c.livreur_id = l.id
       WHERE c.boutique_id = ?
       ORDER BY c.date_creation DESC`,
      [boutiqueId]
    );
    res.json(commandes);
  } catch (erreur) {
    console.error('Erreur dans GET /boutiques/:id/commandes:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des commandes' });
  }
});

// // Récupérer des statistiques pour une boutique spécifique
// app.get('/boutiques/:id/statistiques', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès refusé' });
//   }
//   try {
//     const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
//     if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }

//     // Nombre total de commandes
//     const [commandesCount] = await pool.execute(
//       'SELECT COUNT(*) as total FROM commandes WHERE boutique_id = ?',
//       [req.params.id]
//     );

//     // Revenus totaux (somme des prix des commandes)
//     const [revenus] = await pool.execute(
//       'SELECT SUM(prix) as total FROM commandes WHERE boutique_id = ? AND statut = "en préparation"',
//       [req.params.id]
//     );

//     // Nombre de visiteurs (basé sur historique_visites)
//     const [visiteurs] = await pool.execute(
//       'SELECT COUNT(DISTINCT utilisateur_id) as total FROM historique_visites WHERE boutique_id = ?',
//       [req.params.id]
//     );

//     res.json({
//       totalCommandes: commandesCount[0].total || 0,
//       revenusTotaux: revenus[0].total || 0,
//       totalVisiteurs: visiteurs[0].total || 0,
//     });
//   } catch (erreur) {
//     console.error('Erreur lors de la récupération des statistiques:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des statistiques' });
//   }
// });


// app.get('/boutiques/:id/statistiques', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const boutiqueId = parseInt(req.params.id);
//   const periode = req.query.periode || 'all';
//   let dateCondition = '';
//   let groupByClause = '';

//   const params = [boutiqueId];

//   // Définir la condition de date
//   if (periode === 'day') {
//     dateCondition = 'AND DATE(date_creation) = CURDATE()';
//   } else if (periode === 'week') {
//     dateCondition = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)';
//   } else if (periode === 'month') {
//     dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())';
//   }

//   try {
//     // Vérifier la propriété de la boutique
//     const [boutique] = await pool.execute(
//       'SELECT id, nom FROM boutiques WHERE id = ? AND gerant_id = ?',
//       [boutiqueId, req.utilisateur.id]
//     );

//     if (boutique.length === 0) {
//       return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé' });
//     }

//     // Requête: Nombre de commandes par statut
//     const [commandesParStatut] = await pool.execute(
//       `SELECT statut, COUNT(*) AS total
//        FROM commandes
//        WHERE boutique_id = ? ${dateCondition}
//        GROUP BY statut`,
//       params
//     );

//     // Requête: Revenus totaux
//     const [revenus] = await pool.execute(
//       `SELECT SUM(prix) AS total
//        FROM commandes
//        WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') ${dateCondition}`,
//       params
//     );

//     // Requête: Visiteurs uniques
//     const [visiteurs] = await pool.execute(
//       `SELECT COUNT(DISTINCT utilisateur_id) AS total
//        FROM historique_visites
//        WHERE boutique_id = ? ${dateCondition}`,
//       params
//     );

//     // Requête: Top 5 articles
//     const [topArticles] = await pool.execute(
//       `SELECT a.nom, COUNT(c.id) AS total_commandes, SUM(c.quantite) AS total_quantite
//        FROM articles a
//        JOIN commandes c ON a.id = c.article_id
//        WHERE a.boutique_id = ? ${dateCondition}
//        GROUP BY a.id, a.nom
//        ORDER BY total_commandes DESC
//        LIMIT 5`,
//       params
//     );

//     // Requête: Top 5 services
//     const [topServices] = await pool.execute(
//       `SELECT s.nom, COUNT(c.id) AS total_commandes
//        FROM services s
//        JOIN commandes c ON s.id = c.service_id
//        WHERE s.boutique_id = ? ${dateCondition}
//        GROUP BY s.id, s.nom
//        ORDER BY total_commandes DESC
//        LIMIT 5`,
//       params
//     );

//     // Requête: Dépenses par période
//     let depensesPeriode = [];
//     if (periode === 'day') {
//       [depensesPeriode] = await pool.execute(
//         `SELECT DATE_FORMAT(date_creation, '%H:00') AS heure, SUM(prix) AS total
//          FROM commandes
//          WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') AND DATE(date_creation) = CURDATE()
//          GROUP BY HOUR(date_creation)
//          ORDER BY heure`,
//         [boutiqueId]
//       );
//     } else if (periode === 'week') {
//       [depensesPeriode] = await pool.execute(
//         `SELECT DATE_FORMAT(date_creation, '%W') AS jour, SUM(prix) AS total
//          FROM commandes
//          WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)
//          GROUP BY DAYOFWEEK(date_creation)
//          ORDER BY FIELD(DATE_FORMAT(date_creation, '%W'), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
//         [boutiqueId]
//       );
//     } else if (periode === 'month') {
//       [depensesPeriode] = await pool.execute(
//         `SELECT DATE_FORMAT(date_creation, '%Y-%m-%d') AS jour, SUM(prix) AS total
//          FROM commandes
//          WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())
//          GROUP BY DATE(date_creation)
//          ORDER BY jour`,
//         [boutiqueId]
//       );
//     } else {
//       [depensesPeriode] = await pool.execute(
//         `SELECT DATE_FORMAT(date_creation, '%Y-%m') AS mois, SUM(prix) AS total
//          FROM commandes
//          WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée')
//          GROUP BY YEAR(date_creation), MONTH(date_creation)
//          ORDER BY mois`,
//         [boutiqueId]
//       );
//     }

//     // Requête: Taux de conversion
//     const [clientsAyantCommande] = await pool.execute(
//       `SELECT COUNT(DISTINCT utilisateur_id) AS total
//        FROM commandes
//        WHERE boutique_id = ? ${dateCondition}`,
//       params
//     );

//     const totalVisiteurs = visiteurs[0].total || 0;
//     const tauxConversion = totalVisiteurs > 0
//       ? ((clientsAyantCommande[0].total / totalVisiteurs) * 100).toFixed(2)
//       : 0;

//     // Réponse structurée
//     const stats = {
//       boutique: boutique[0].nom,
//       periode,
//       commandes: {
//         total: commandesParStatut.reduce((sum, row) => sum + row.total, 0),
//         parStatut: commandesParStatut.reduce((acc, row) => ({ ...acc, [row.statut]: row.total }), {}),
//       },
//       revenus: {
//         total: revenus[0].total || 0,
//         parPeriode: depensesPeriode,
//       },
//       visiteurs: {
//         total: totalVisiteurs,
//         tauxConversion: parseFloat(tauxConversion),
//       },
//       topArticles,
//       topServices,
//     };

//     res.json(stats);
//   } 
//   catch (erreur) {
//     console.error('Erreur lors de la récupération des statistiques:', {
//       message: erreur.message,
//       sqlMessage: erreur.sqlMessage,
//     });
//     res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des statistiques' });
//   }
// });





app.get('/boutiques/:id/statistiques', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const boutiqueId = parseInt(req.params.id);
  const periode = req.query.periode || 'all';

  // Validation de la période
  const periodesValides = ['day', 'week', 'month', 'all'];
  if (!periodesValides.includes(periode)) {
    return res.status(400).json({ erreur: 'Période invalide. Utilisez day, week, month ou all.' });
  }

  try {
    // Vérifier que la boutique appartient au gérant
    const [boutique] = await pool.execute(
      'SELECT id, nom FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutiqueId, req.utilisateur.id]
    );
    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé' });
    }

    // Définir le filtre de période pour les requêtes
    let dateCondition = '';
    const params = [boutiqueId];
    if (periode === 'Jour') {
      dateCondition = 'AND DATE(date_creation) = CURDATE()';
    } else if (periode === 'Semaine') {
      dateCondition = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)';
    } else if (periode === 'Mois') {
      dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())';
    }

    // Nombre de commandes par statut
    const [commandesParStatut] = await pool.execute(
      `SELECT statut, COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}
       GROUP BY statut`,
      params
    );

    // Revenus totaux (commandes en préparation ou livrée)
    const [revenus] = await pool.execute(
      `SELECT SUM(prix * quantite) AS total
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') ${dateCondition}`,
      params
    );

    // Nombre de visiteurs uniques
    const [visiteurs] = await pool.execute(
      `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM historique_visites
       WHERE boutique_id = ? ${dateCondition}`,
      params
    );

    // Top 5 articles commandés
    const [topArticles] = await pool.execute(
      `SELECT a.nom, COUNT(c.id) AS total_commandes, SUM(c.quantite) AS total_quantite
       FROM articles a
       JOIN commandes c ON a.id = c.article_id
       WHERE a.boutique_id = ? ${dateCondition}
       GROUP BY a.id, a.nom
       ORDER BY total_commandes DESC
       LIMIT 5`,
      params
    );

    // Top 5 services commandés
    const [topServices] = await pool.execute(
      `SELECT s.nom, COUNT(c.id) AS total_commandes
       FROM services s
       JOIN commandes c ON s.id = c.service_id
       WHERE s.boutique_id = ? ${dateCondition}
       GROUP BY s.id, s.nom
       ORDER BY total_commandes DESC
       LIMIT 5`,
      params
    );

    // Dépenses par période (pour les graphiques)
    let depensesPeriode;
    if (periode === 'day') {
      [depensesPeriode] = await pool.execute(
        `SELECT DATE_FORMAT(date_creation, '%H:00') AS heure, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') AND DATE(date_creation) = CURDATE()
         GROUP BY HOUR(date_creation)
         ORDER BY heure`,
        [boutiqueId]
      );
    } else if (periode === 'week') {
      [depensesPeriode] = await pool.execute(
        `SELECT DATE_FORMAT(date_creation, '%W') AS jour, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)
         GROUP BY DATE_FORMAT(date_creation, '%W')
         ORDER BY FIELD(DATE_FORMAT(date_creation, '%W'), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
        [boutiqueId]
      );
    } else if (periode === 'month') {
      [depensesPeriode] = await pool.execute(
        `SELECT DATE_FORMAT(date_creation, '%Y-%m-%d') AS jour, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée') AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())
         GROUP BY DATE(date_creation)
         ORDER BY jour`,
        [boutiqueId]
      );
    } else {
      [depensesPeriode] = await pool.execute(
        `SELECT DATE_FORMAT(date_creation, '%Y-%m') AS mois, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée')
         GROUP BY YEAR(date_creation), MONTH(date_creation)
         ORDER BY mois`,
        [boutiqueId]
      );
    }

    // Taux de conversion (visiteurs ayant commandé / total visiteurs)
    const [clientsAyantCommande] = await pool.execute(
      `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}`,
      params
    );
    const totalVisiteurs = visiteurs[0].total || 0;
    const tauxConversion = totalVisiteurs > 0 ? (clientsAyantCommande[0].total / totalVisiteurs * 100).toFixed(2) : 0;

    // Structurer la réponse
    const stats = {
      boutique: boutique[0].nom,
      periode,
      commandes: {
        total: commandesParStatut.reduce((sum, row) => sum + row.total, 0),
        parStatut: commandesParStatut.reduce((acc, row) => ({ ...acc, [row.statut]: row.total }), {}),
      },
      revenus: {
        total: revenus[0].total || 0,
        parPeriode: depensesPeriode,
      },
      visiteurs: {
        total: totalVisiteurs,
        tauxConversion: parseFloat(tauxConversion),
      },
      topArticles,
      topServices,
    };

    res.json(stats);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des statistiques:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      stack: erreur.stack,
      query: erreur.sql,
      periode, // Ajout pour débogage
      boutiqueId, // Ajout pour débogage
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des statistiques' });
  }
});







app.put('/boutiques/:id/articles/:articleId', verifierToken, upload.single('image'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé' });
  }
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    const { nom, description, prix, stock, categorie } = req.body;
    let image = req.body.image || null;
    if (req.file) {
      image = req.file.filename; // Nom du fichier uploadé
    }

    const [result] = await pool.execute(
      'UPDATE articles SET nom = ?, description = ?, prix = ?, stock = ?, categorie = ?, image = ? WHERE id = ? AND boutique_id = ?',
      [nom, description, prix, stock, categorie, image, req.params.articleId, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Article non trouvé ou non autorisé' });
    }

    res.json({ message: 'Article modifié avec succès' });
  } catch (erreur) {
    console.error('Erreur lors de la modification de l\'article:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la modification de l\'article' });
  }
});


app.put('/commandes/:id/livreur', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé' });
  }
  const { livreur_id } = req.body;
  const commandeId = parseInt(req.params.id);

  try {
    if (!commandeId || isNaN(commandeId)) {
      return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
    }

    // Vérifier que la commande existe et appartient à une boutique gérée par l'utilisateur
    const [commande] = await pool.execute(
      'SELECT c.boutique_id, b.gerant_id FROM commandes c JOIN boutiques b ON c.boutique_id = b.id WHERE c.id = ?',
      [commandeId]
    );
    if (!commande.length || commande[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    // Valider livreur_id si fourni, sinon permettre de supprimer l'assignation (null)
    if (livreur_id) {
      const [livreur] = await pool.execute(
        'SELECT id FROM livreurs WHERE id = ? AND boutique_id = ? AND actif = TRUE',
        [livreur_id, commande[0].boutique_id]
      );
      if (!livreur.length) {
        return res.status(404).json({ erreur: 'Livreur non trouvé, inactif ou ne correspond pas à la boutique' });
      }
    }

    // Mettre à jour la commande avec le livreur_id
    await pool.execute(
      'UPDATE commandes SET livreur_id = ? WHERE id = ?',
      [livreur_id || null, commandeId]
    );

    // Ajouter une notification pour le livreur si assigné
    if (livreur_id) {
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `Vous avez été assigné à la commande #${commandeId} pour la boutique ${commande[0].boutique_id}.`;
      await pool.execute(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [commande[0].boutique_id, livreur_id, message, date]
      );
    }

    res.json({ message: livreur_id ? 'Livreur assigné avec succès' : 'Livreur désassigné avec succès' });
  } catch (error) {
    console.error('Erreur assignation livreur:', error);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'assignation du livreur' });
  }
});


app.get('/gerant/commandes', verifierToken, async (req, res) => {
  try {
    const utilisateurId = req.utilisateur.id;
    if (req.utilisateur.type !== 'gerant') {
      return res.status(403).json({ erreur: 'Accès réservé aux gérants.' });
    }

    const [boutiques] = await pool.query(
      'SELECT id FROM boutiques WHERE gerant_id = ?',
      [utilisateurId]
    );

    if (boutiques.length === 0) {
      return res.json([]);
    }

    const boutiqueIds = boutiques.map(b => b.id);
    const [commandes] = await pool.query(
      'SELECT * FROM commandes WHERE boutique_id IN (?) ORDER BY date_creation DESC',
      [boutiqueIds]
    );

    res.json(commandes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});


app.get('/commandes/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé' });
  }
  try {
    const commandeId = req.params.id;
    const [commande] = await pool.execute(
      `SELECT 
         c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.prix, c.statut, 
         c.moyen_paiement, c.date_creation, c.quantite, c.livreur_id, c.image AS commande_image,
         u.nom AS client_nom, u.prenom AS client_prenom, u.email AS client_email, u.telephone AS client_telephone,
         b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
         a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
         s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
         l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone
       FROM commandes c
       LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
       LEFT JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN services s ON c.service_id = s.id
       LEFT JOIN livreurs l ON c.livreur_id = l.id
       WHERE c.id = ? AND b.gerant_id = ?`,
      [commandeId, req.utilisateur.id]
    );
    if (!commande.length) {
      return res.status(404).json({ erreur: 'Commande non trouvée ou accès refusé' });
    }
    res.json(commande[0]);
  } catch (erreur) {
    console.error('Erreur dans GET /commandes/:id:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération de la commande' });
  }
});


/**
 * 
 * Pour la gestion des livreurs et les notifications du gérant
 * 
 */



// Créer une commande avec coordonnées client et notification
// app.post('/commandes', verifierToken, async (req, res) => {
//   const {
//     boutique_id,
//     article_id,
//     service_id,
//     quantite,
//     prix,
//     moyen_paiement,
//     client_latitude,
//     client_longitude,
//   } = req.body;

//   if (!boutique_id || (!article_id && !service_id) || !quantite || !prix || !moyen_paiement || client_latitude === undefined || client_longitude === undefined) {
//     return res.status(400).json({ erreur: 'Données incomplètes' });
//   }

//   let connexion;
//   try {
//     connexion = await pool.getConnection();
//     await connexion.beginTransaction();

//     // Vérifier l'existence de la boutique
//     const [boutique] = await connexion.execute(
//       'SELECT id, gerant_id FROM boutiques WHERE id = ?',
//       [boutique_id]
//     );
//     if (!boutique.length) {
//       return res.status(404).json({ erreur: 'Boutique non trouvée' });
//     }

//     // Insérer la commande
//     const [result] = await connexion.execute(
//       `INSERT INTO commandes (utilisateur_id, boutique_id, article_id, service_id, quantite, prix, 
//         statut, moyen_paiement, client_latitude, client_longitude)
//        VALUES (?, ?, ?, ?, ?, ?, 'en attente', ?, ?, ?)`,
//       [
//         req.utilisateur.id,
//         boutique_id,
//         article_id || null,
//         service_id || null,
//         quantite,
//         prix,
//         moyen_paiement,
//         client_latitude,
//         client_longitude,
//       ]
//     );

//     // Envoyer une notification au gérant
//     const message = `Nouvelle commande #${result.insertId} passée pour votre boutique.`;
//     await envoyerNotification(boutique[0].gerant_id, boutique_id, message);

//     await connexion.commit();
//     res.json({ message: 'Commande créée avec succès', commande_id: result.insertId });
//   } catch (erreur) {
//     if (connexion) await connexion.rollback();
//     console.error('Erreur lors de la création de la commande:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur' });
//   } finally {
//     if (connexion) connexion.release();
//   }
// });



app.post('/commandes', verifierToken, async (req, res) => {
  console.log('Requête POST /commandes reçue:', req.body);
  const {
    boutique_id,
    article_id,
    service_id,
    quantite,
    prix,
    moyen_paiement,
    client_latitude,
    client_longitude,
  } = req.body;

  // Validation des données
  if (
    !boutique_id ||
    (!article_id && !service_id) ||
    !quantite ||
    !prix ||
    !moyen_paiement ||
    client_latitude === undefined ||
    client_longitude === undefined
  ) {
    console.log('Erreur: Données incomplètes', req.body);
    return res.status(400).json({ erreur: 'Données incomplètes' });
  }

  if (
    isNaN(client_latitude) ||
    isNaN(client_longitude) ||
    client_latitude < -90 ||
    client_latitude > 90 ||
    client_longitude < -180 ||
    client_longitude > 180
  ) {
    console.log('Erreur: Coordonnées invalides', { client_latitude, client_longitude });
    return res.status(400).json({ erreur: 'Coordonnées géographiques invalides' });
  }

  const moyensValides = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'];
  if (!moyensValides.includes(moyen_paiement)) {
    console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
    return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
  }

  if (quantite <= 0 || isNaN(quantite)) {
    console.log('Erreur: Quantité invalide', quantite);
    return res.status(400).json({ erreur: 'Quantité invalide' });
  }

  if (prix <= 0 || isNaN(prix)) {
    console.log('Erreur: Prix invalide', prix);
    return res.status(400).json({ erreur: 'Prix invalide' });
  }

  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();

    // Vérifier la boutique
    const [boutique] = await connexion.execute(
      'SELECT id, gerant_id FROM boutiques WHERE id = ?',
      [boutique_id]
    );
    if (!boutique.length) {
      console.log('Erreur: Boutique non trouvée', boutique_id);
      throw new Error('Boutique non trouvée');
    }

    // Vérifier l'article ou le service
    if (article_id) {
      const [article] = await connexion.execute(
        'SELECT id, prix, stock FROM articles WHERE id = ? AND boutique_id = ?',
        [article_id, boutique_id]
      );
      if (!article.length) {
        console.log('Erreur: Article non trouvé', article_id);
        throw new Error('Article non trouvé');
      }
      if (article[0].stock < quantite) {
        console.log('Erreur: Stock insuffisant', { article_id, stock: article[0].stock, quantite });
        throw new Error('Stock insuffisant pour cet article');
      }
      if (parseFloat(prix) !== parseFloat(article[0].prix) * quantite) {
        console.log('Erreur: Prix incorrect', { prix, expected: article[0].prix * quantite });
        throw new Error('Prix incorrect pour cet article');
      }
    } else if (service_id) {
      const [service] = await connexion.execute(
        'SELECT id, prix, disponible FROM services WHERE id = ? AND boutique_id = ?',
        [service_id, boutique_id]
      );
      if (!service.length) {
        console.log('Erreur: Service non trouvé', service_id);
        throw new Error('Service non trouvé');
      }
      if (!service[0].disponible) {
        console.log('Erreur: Service non disponible', service_id);
        throw new Error('Service non disponible');
      }
      if (parseFloat(prix) !== parseFloat(service[0].prix) * quantite) {
        console.log('Erreur: Prix incorrect', { prix, expected: service[0].prix * quantite });
        throw new Error('Prix incorrect pour ce service');
      }
    }

    // Insérer la commande
    const [result] = await connexion.execute(
      `INSERT INTO commandes (
        utilisateur_id, boutique_id, article_id, service_id, quantite, prix,
        statut, moyen_paiement, client_latitude, client_longitude, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, 'en attente', ?, ?, ?, NOW())`,
      [
        req.utilisateur.id,
        boutique_id,
        article_id || null,
        service_id || null,
        quantite,
        prix,
        moyen_paiement,
        client_latitude,
        client_longitude,
      ]
    );
    console.log('Commande insérée, ID:', result.insertId);

    // Mettre à jour le stock pour les articles
    if (article_id) {
      await connexion.execute(
        'UPDATE articles SET stock = stock - ? WHERE id = ?',
        [quantite, article_id]
      );
      console.log('Stock mis à jour pour l\'article', article_id);
    }

    // Envoyer une notification au gérant
    const message = `Nouvelle commande #${result.insertId} passée pour votre boutique.`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, NOW(), FALSE)`,
      [boutique[0].gerant_id, boutique_id, message]
    );
    console.log('Notification envoyée au gérant', boutique[0].gerant_id);

    await connexion.commit();
    res.json({ message: 'Commande créée avec succès', commande_id: result.insertId });
  } catch (erreur) {
    if (connexion) await connexion.rollback();
    console.error('Erreur lors de la création de la commande:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
      stack: erreur.stack, 
    });
    if (erreur.message === 'Boutique non trouvée') {
      res.status(404).json({ erreur: erreur.message });
    } else if (erreur.message === 'Article non trouvé' || erreur.message === 'Service non trouvé') {
      res.status(404).json({ erreur: erreur.message });
    } else if (
      erreur.message === 'Stock insuffisant pour cet article' ||
      erreur.message === 'Service non disponible' ||
      erreur.message === 'Prix incorrect pour cet article' ||
      erreur.message === 'Prix incorrect pour ce service'
    ) {
      res.status(400).json({ erreur: erreur.message });
    } else if (erreur.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Erreur de données unique' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  } finally {
    if (connexion) connexion.release();
  }
});

// Lister les livreurs d'une boutique
// app.get('/boutiques/:id/livreurs', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const boutiqueId = parseInt(req.params.id);
//   try {
//     const [boutique] = await pool.execute(
//       'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
//       [boutiqueId, req.utilisateur.id]
//     );
//     if (!boutique.length) {
//       return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé' });
//     }

//     const [livreurs] = await pool.execute(
//       'SELECT id, nom, prenom, telephone, email, actif FROM livreurs WHERE boutique_id = ?',
//       [boutiqueId]
//     );
//     res.json(livreurs);
//   } catch (erreur) {
//     console.error('Erreur lors de la récupération des livreurs:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur' });
//   }
// });

// Lister les livreurs d'une boutique
// Lister les livreurs d'une boutique
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
      'SELECT id, nom, prenom, telephone, email, actif FROM livreurs WHERE boutique_id = ?',
      [boutiqueId]
    );
    console.log('Livreurs bruts depuis la base:', livreurs); // Log des données brutes
    res.json(livreurs);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des livreurs:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Créer un livreur
// app.post('/boutiques/:id/livreurs', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const { nom, prenom, telephone, email, password, boutique_id } = req.body;
//   if (!nom || !prenom || !telephone || !boutique_id) {
//     return res.status(400).json({ erreur: 'Données incomplètes' });
//   }

//   try {
//     const [boutique] = await pool.execute(
//       'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
//       [boutique_id, req.utilisateur.id]
//     );
//     if (!boutique.length) {
//       return res.status(403).json({ erreur: 'Boutique non autorisée' });
//     }

//     let hashedPassword = null;
//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 12);
//     }

//     const [result] = await pool.execute(
//       `INSERT INTO livreurs (boutique_id, nom, prenom, telephone, email, password)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [boutique_id, nom, prenom, telephone, email || null, hashedPassword]
//     );
//     res.json({ message: 'Livreur créé avec succès', id: result.insertId });
//   } catch (erreur) {
//     console.error('Erreur lors de la création du livreur:', erreur);
//     if (erreur.code === 'ER_DUP_ENTRY') {
//       res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur' });
//     }
//   }
// });

// // Modifier un livreur
// app.put('/livreurs/:id', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const livreurId = parseInt(req.params.id);
//   const { nom, prenom, telephone, email, password } = req.body;
//   if (!nom || !prenom || !telephone) {
//     return res.status(400).json({ erreur: 'Données incomplètes' });
//   }

//   try {
//     const [livreur] = await pool.execute(
//       `SELECT l.id, l.boutique_id
//        FROM livreurs l
//        JOIN boutiques b ON l.boutique_id = b.id
//        WHERE l.id = ? AND b.gerant_id = ?`,
//       [livreurId, req.utilisateur.id]
//     );
//     if (!livreur.length) {
//       return res.status(403).json({ erreur: 'Livreur non trouvé ou accès non autorisé' });
//     }

//     let hashedPassword = null;
//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 12);
//     }

//     await pool.execute(
//       `UPDATE livreurs
//        SET nom = ?, prenom = ?, telephone = ?, email = ?, password = COALESCE(?, password)
//        WHERE id = ?`,
//       [nom, prenom, telephone, email || null, hashedPassword, livreurId]
//     );
//     res.json({ message: 'Livreur modifié avec succès' });
//   } catch (erreur) {
//     console.error('Erreur lors de la modification du livreur:', erreur);
//     if (erreur.code === 'ER_DUP_ENTRY') {
//       res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur' });
//     }
//   }
// });




// Créer un livreur
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

// Modifier un livreur
app.put('/livreurs/:id', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const livreurId = parseInt(req.params.id);
  const { nom, prenom, telephone, email, password, adresse, actif } = req.body;
  if (!nom || !prenom || !telephone) {
    if (req.file) {
      try {
        await fs.unlink(path.join(__dirname, req.file.path));
      } catch (error) {}
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
        } catch (error) {}
      }
      return res.status(403).json({ erreur: 'Livreur non trouvé ou accès non autorisé' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    let photoPath = livreur[0].photo;
    if (req.file) {
      photoPath = `/uploads/livreurs/${req.file.filename}`;
      if (livreur[0].photo) {
        try {
          await fs.unlink(path.join(__dirname, livreur[0].photo));
        } catch (error) {}
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
      } catch (unlinkError) {}
    }
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  }
});







// Supprimer un livreur
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

// // Assigner une commande à un livreur
// app.post('/commandes/:id/assigner', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const commandeId = parseInt(req.params.id);
//   const { livreur_id } = req.body;

//   if (!livreur_id) {
//     return res.status(400).json({ erreur: 'ID du livreur requis' });
//   }

//   let connexion;
//   try {
//     connexion = await pool.getConnection();
//     await connexion.beginTransaction();

//     // Vérifier la commande
//     const [commande] = await connexion.execute(
//       `SELECT c.id, c.boutique_id, c.client_latitude, c.client_longitude
//        FROM commandes c
//        JOIN boutiques b ON c.boutique_id = b.id
//        WHERE c.id = ? AND b.gerant_id = ? AND c.statut = 'en préparation' AND c.livreur_id IS NULL`,
//       [commandeId, req.utilisateur.id]
//     );
//     if (!commande.length) {
//       return res.status(403).json({ erreur: 'Commande non trouvée, non autorisée, ou déjà assignée' });
//     }

//     // Vérifier le livreur
//     const [livreur] = await connexion.execute(
//       'SELECT id, actif FROM livreurs WHERE id = ? AND boutique_id = ?',
//       [livreur_id, commande[0].boutique_id]
//     );
//     if (!livreur.length || !livreur[0].actif) {
//       return res.status(400).json({ erreur: 'Livreur non trouvé ou inactif' });
//     }

//     // Assigner la commande
//     await connexion.execute(
//       `UPDATE commandes
//        SET livreur_id = ?, statut = 'livrée'
//        WHERE id = ?`,
//       [livreur_id, commandeId]
//     );

//     // Envoyer une notification au livreur (simulé ici)
//     const message = `Nouvelle commande #${commandeId} assignée à vous. Coordonnées client : (${commande[0].client_latitude}, ${commande[0].client_longitude})`;
//     console.log(`Notification au livreur ${livreur_id}: ${message}`);

//     await connexion.commit();
//     res.json({ message: 'Commande assignée avec succès', commande: { id: commandeId, client_latitude: commande[0].client_latitude, client_longitude: commande[0].client_longitude } });
//   } catch (erreur) {
//     if (connexion) await connexion.rollback();
//     console.error('Erreur lors de l\'assignation de la commande:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur' });
//   } finally {
//     if (connexion) connexion.release();
//   }
// });



app.post('/commandes/:id/assigner', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    console.log('Accès refusé: utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const commandeId = parseInt(req.params.id);
  const { livreur_id } = req.body;

  if (!livreur_id || isNaN(livreur_id)) {
    console.log('Erreur: ID du livreur invalide', { livreur_id });
    return res.status(400).json({ erreur: 'ID du livreur requis et doit être un nombre' });
  }

  if (!commandeId || isNaN(commandeId)) {
    console.log('Erreur: ID de commande invalide', { commandeId });
    return res.status(400).json({ erreur: 'ID de commande invalide' });
  }

  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();

    // Vérifier la commande
    const [commande] = await connexion.execute(
      `SELECT c.id, c.boutique_id, c.statut, c.livreur_id, c.client_latitude, c.client_longitude
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.id = ? AND b.gerant_id = ?`,
      [commandeId, req.utilisateur.id]
    );
    if (!commande.length) {
      console.log('Commande non trouvée ou non autorisée', { commandeId, gerantId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }
    if (commande[0].statut !== 'en préparation') {
      console.log('Statut de commande non valide', { commandeId, statut: commande[0].statut });
      return res.status(400).json({ erreur: 'La commande doit être en statut "en préparation"' });
    }
    if (commande[0].livreur_id !== null) {
      console.log('Commande déjà assignée', { commandeId, livreur_id: commande[0].livreur_id });
      return res.status(400).json({ erreur: 'Commande déjà assignée à un livreur' });
    }

    // Vérifier le livreur
    const [livreur] = await connexion.execute(
      'SELECT id, actif, nom, prenom FROM livreurs WHERE id = ? AND boutique_id = ?',
      [livreur_id, commande[0].boutique_id]
    );
    if (!livreur.length) {
      console.log('Livreur non trouvé', { livreur_id, boutique_id: commande[0].boutique_id });
      return res.status(404).json({ erreur: 'Livreur non trouvé pour cette boutique' });
    }
    if (!livreur[0].actif) {
      console.log('Livreur inactif', { livreur_id, nom: livreur[0].nom, prenom: livreur[0].prenom });
      return res.status(400).json({ erreur: 'Livreur inactif' });
    }

    // Assigner la commande et passer à un statut "en cours de livraison" (nouveau statut à ajouter)
    await connexion.execute(
      `UPDATE commandes
       SET livreur_id = ?, statut = 'en cours de livraison'
       WHERE id = ?`,
      [livreur_id, commandeId]
    );
    console.log('Commande assignée', { commandeId, livreur_id, statut: 'en cours de livraison' });

    // Envoyer une notification au livreur
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `Nouvelle commande #${commandeId} assignée à vous. Coordonnées client : (${commande[0].client_latitude}, ${commande[0].client_longitude})`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [livreur_id, commande[0].boutique_id, message, date]
    );
    console.log('Notification envoyée au livreur', { livreur_id, message });

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
    if (erreur.message.includes('non trouvée') || erreur.message.includes('inactif')) {
      res.status(400).json({ erreur: erreur.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur lors de l\'assignation de la commande' });
    }
  } finally {
    if (connexion) connexion.release();
  }
});


// Lister les commandes d'une boutique (pour l'assignation)
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





//////////////:: POUR LE LIVREUR //////////////////////////////////::
// Route de connexion pour livreurs
// Route de connexion pour livreurs
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
      console.log('Livreur non trouvé', { identifiant });
      return res.status(400).json({ erreur: 'Livreur non trouvé' });
    }
    const motDePasseValide = await bcrypt.compare(mot_de_passe, livreur[0].password);
    if (!motDePasseValide) {
      console.log('Mot de passe incorrect pour livreur', { identifiant });
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

// Route pour récupérer les commandes assignées au livreur
aapp.get('/livreur/commandes', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  try {
    const [commandes] = await pool.execute(
      `SELECT c.id, c.boutique_id, c.client_latitude, c.client_longitude, c.statut, b.nom AS boutique_nom
       FROM commandes c
       JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.livreur_id = ? AND c.statut = 'en cours de livraison'`,
      [req.utilisateur.id]
    );
    res.json(commandes);
  } catch (erreur) {
    console.error('Erreur récupération commandes livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Route pour marquer une commande comme livrée

app.post('/commandes/:id/livrer', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
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
      console.log('Commande non trouvée ou non autorisée', { commandeId, livreurId: req.utilisateur.id });
      return res.status(403).json({ erreur: 'Commande non trouvée, non autorisée, ou pas en cours de livraison' });
    }

    await connexion.execute(
      `UPDATE commandes SET statut = 'livrée' WHERE id = ?`,
      [commandeId]
    );
    console.log('Commande marquée comme livrée', { commandeId });

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

// Route pour récupérer le profil du livreur
app.get('/livreur/profil', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  try {
    const [livreur] = await pool.execute(
      'SELECT id, nom, prenom, email, telephone, boutique_id, actif FROM livreurs WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!livreur.length) {
      console.log('Livreur non trouvé', { livreurId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Livreur non trouvé' });
    }
    res.json(livreur[0]);
  } catch (erreur) {
    console.error('Erreur récupération profil livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Route pour mettre à jour le profil du livreur
// Route pour mettre à jour le profil du livreur
app.put('/livreur/profil', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  const { nom, prenom, email, telephone, mot_de_passe } = req.body;
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
      console.log('Livreur non trouvé pour mise à jour', { livreurId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Livreur non trouvé' });
    }
    console.log('Profil livreur mis à jour', { livreurId: req.utilisateur.id });
    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (erreur) {
    console.error('Erreur mise à jour profil livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Route pour les notifications du livreur
app.get('/livreur/notifications', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
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



// Ajouter après les autres routes
app.post('/refresh-token', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ erreur: 'Token requis' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    console.log('Refresh token décodé:', decoded);
    const newToken = jwt.sign(
      { id: decoded.id, type: decoded.type, boutique_id: decoded.boutique_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token: newToken });
  } catch (erreur) {
    console.error('Erreur refresh token:', erreur);
    res.status(401).json({ erreur: 'Token invalide' });
  }
});

/////////////////////////////////////:::////////////////////////////////////:::://///////////////////////////




// Démarrer les programmes du serveur
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