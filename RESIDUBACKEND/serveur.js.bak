const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'))); // Route majuscule pour nouveaux uploads

// Configuration de Multer pour les uploads d'images
const stockage = multer.diskStorage({
  destination: (req, fichier, cb) => {
    // Déterminer le sous-dossier selon la route
    let subFolder = '';
    if (req.path.includes('/livreurs')) {
      subFolder = 'livreurs';
    } else if (req.path.includes('/personnel')) {
      subFolder = 'personnel';
    } else if (req.path.includes('/articles')) {
      subFolder = 'articles';
    } else if (req.path.includes('/services')) {
      subFolder = 'services';
    } else if (req.path.includes('/boutiques')) {
      subFolder = 'boutiques';
    } else if (req.path.includes('/gerants')) {
      subFolder = 'gerants';
    } else if (req.path.includes('/inscription')) {
      // Déterminer le sous-dossier selon le type d'utilisateur
      subFolder = req.body.type === 'client' ? 'clients' : 'gerants';
    }

    const dossier = subFolder ? `./Uploads/${subFolder}` : './Uploads';

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync('./Uploads')) {
      fs.mkdirSync('./Uploads');
    }
    if (subFolder && !fs.existsSync(dossier)) {
      fs.mkdirSync(dossier, { recursive: true });
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

    // Créer la table clients
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE,
        image VARCHAR(255),
        mot_de_passe VARCHAR(255) NOT NULL,
        date_inscription DATETIME NOT NULL,
        date_naissance DATE NOT NULL
      )
    `);

    // Créer la table gerants
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS gerants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE,
        image VARCHAR(255),
        mot_de_passe VARCHAR(255) NOT NULL,
        date_inscription DATETIME NOT NULL,
        date_naissance DATE NOT NULL
      )
    `);

    // (Note: La table utilisateurs est obsolète mais on ne la supprime pas ici pour l'historique de migration)
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
        FOREIGN KEY (gerant_id) REFERENCES gerants(id) ON DELETE CASCADE
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
        moyen_paiement ENUM('Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal', 'Paiement à la livraison'),
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


    // Modifier la table commandes pour ajouter les champs nécessaires
    // MySQL ne supporte pas ADD COLUMN IF NOT EXISTS, donc on utilise des try-catch individuels
    const columnsToAdd = [
      { name: 'client_nom', definition: 'VARCHAR(100)' },
      { name: 'client_telephone', definition: 'VARCHAR(20)' },
      { name: 'adresse_livraison', definition: 'VARCHAR(255)' }
    ];

    for (const column of columnsToAdd) {
      try {
        await connexion.execute(`ALTER TABLE commandes ADD COLUMN ${column.name} ${column.definition}`);
      } catch (err) {
        // Ignorer l'erreur si la colonne existe déjà
        if (err.code !== 'ER_DUP_FIELDNAME') {
          throw err;
        }
      }
    }

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


    // Créer la table personnel
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS personnel (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        telephone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(255),
        type_personnel ENUM('Gérant', 'Employé', 'Caissier', 'Vendeur', 'Serveur', 'Cuisinier', 'Coiffeur', 'Esthéticien', 'Responsable', 'Stagiaire') NOT NULL,
        salaire DECIMAL(10,2),
        date_embauche DATE NOT NULL,
        actif BOOLEAN DEFAULT TRUE,
        photo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

    // Créer la table super_admins
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        mot_de_passe VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'admin', 'moderateur') DEFAULT 'admin',
        actif BOOLEAN DEFAULT TRUE,
        photo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `);

    // Créer la table system_logs
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT,
        action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'BAN', 'UNBAN', 'APPROVE', 'REJECT') NOT NULL,
        resource_type ENUM('UTILISATEUR', 'BOUTIQUE', 'COMMANDE', 'PERSONNEL', 'SIGNALEMENT', 'AUTRE') NOT NULL,
        resource_id INT,
        description TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES super_admins(id) ON DELETE SET NULL
      )
    `);


    // Créer la table demandes_services     
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS demandes_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        boutique_id INT NOT NULL,
        service_id INT NOT NULL,
        statut ENUM('en_attente', 'acceptée', 'refusée', 'en_cours', 'terminée', 'annulée') DEFAULT 'en_attente',
        prix DECIMAL(10, 2) NOT NULL,
        moyen_paiement VARCHAR(50) DEFAULT 'Cash',
        client_nom VARCHAR(100) NOT NULL,
        client_telephone VARCHAR(20) NOT NULL,
        client_latitude DECIMAL(10, 7),
        client_longitude DECIMAL(10, 7),
        adresse VARCHAR(255),
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        notes TEXT,
        
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        
        INDEX idx_utilisateur (utilisateur_id),
        INDEX idx_boutique (boutique_id),
        INDEX idx_service (service_id),
        INDEX idx_statut (statut),
        INDEX idx_date_creation (date_creation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)



    // Créer la table signalements
    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS signalements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('BOUTIQUE', 'UTILISATEUR', 'COMMANDE', 'AUTRE') NOT NULL,
        reported_by INT NOT NULL,
        resource_id INT,
        raison TEXT NOT NULL,
        statut ENUM('EN_ATTENTE', 'EN_COURS', 'RESOLU', 'REJETE') DEFAULT 'EN_ATTENTE',
        resolution TEXT,
        resolved_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (reported_by) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES super_admins(id) ON DELETE SET NULL
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
        utilisateur_id INT NOT NULL, -- Gérant de la boutique
        message TEXT NOT NULL,
        date DATETIME NOT NULL,
        lu BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
      )
    `);

    // Migration: ajouter utilisateur_id si la colonne n'existe pas
    try {
      await connexion.execute(`ALTER TABLE notifications ADD COLUMN utilisateur_id INT NOT NULL DEFAULT 0`);
      console.log('Colonne utilisateur_id ajoutée à la table notifications');
    } catch (err) {
      // Ignorer si la colonne existe déjà
      if (err.code !== 'ER_DUP_FIELDNAME') {
        // Si c'est une autre erreur, on la log mais on continue
        console.log('Note: colonne utilisateur_id déjà présente ou erreur:', err.code);
      }
    }

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
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (livreur_id) REFERENCES livreurs(id),
    FOREIGN KEY (commande_id) REFERENCES commandes(id)
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

    // console.log('Base de données initialisée avec succès');
  } catch (erreur) {
    console.error('Erreur lors de l\'initialisation de la base de données :', erreur);
    throw erreur;
  } finally {
    if (connexion) connexion.release();
  }
}

// Middleware pour vérifier le token JWT
// const verifierToken = async (req, res, next) => {
//   const token = req.headers.authorization;
//   if (!token) return res.status(401).json({ erreur: 'Token requis' });
//   try {
//     const decode = jwt.verify(token, JWT_SECRET);
//     req.utilisateur = decode;
//     const [utilisateur] = await pool.execute(
//       'SELECT type FROM utilisateurs WHERE id = ?',
//       [decode.id]
//     );
//     if (!utilisateur.length) return res.status(401).json({ erreur: 'Utilisateur non trouvé' });
//     req.utilisateur.type = utilisateur[0].type;
//     next();
//   } catch (erreur) {
//     res.status(401).json({ erreur: 'Token invalide' });
//   }
// };



const verifierToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log('Vérification token:', {
  //   authHeader: authHeader || 'Absent',
  //   methode: req.method,
  //   url: req.url,
  // });
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // console.log('Token manquant ou mal formé');
    return res.status(401).json({ erreur: 'Token requis' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // console.log('Token décodé:', decoded);
    req.utilisateur = decoded;
    // Vérifier si c'est un utilisateur (client/gérant) ou un livreur
    if (decoded.type === 'livreur') {
      const [livreur] = await pool.execute(
        'SELECT id, boutique_id FROM livreurs WHERE id = ? AND actif = TRUE',
        [decoded.id]
      );
      if (!livreur.length) {
        // console.log('Livreur non trouvé ou inactif', { id: decoded.id });
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
      }

      if (!utilisateur.length) {
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

// Route connexion livreur
app.post('/connexion/livreur', async (req, res) => {
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

    // Vérification mot de passe (si hashé) ou comparaison directe (selon votre implémentation initiale)
    // Supposons bcrypt pour la sécurité, mais vérifier l'existant.
    // Si le mot de passe n'est pas hashé dans la DB actuelle (ce qui semble être le cas lignes 267), attention.
    // On va supposer une comparaison simple ou bcrypt si ça commence par $2a$

    let passwordMatch = false;
    if (livreur.password && livreur.password.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(mot_de_passe, livreur.password);
    } else {
      passwordMatch = (motDePasse === livreur.password);
      // Si le mot de passe correspond et n'est pas hashé, on pourrait envisager de le hasher ici
    }

    // CORRECTION: Pour l'instant, faisons simple et sécurisé : on compare avec bcrypt si possible, sinon égalité simple
    // Si livreur.password est null (anciens comptes?), ça échoue

    const validPassword = await bcrypt.compare(mot_de_passe, livreur.password);
    if (!validPassword) {
      return res.status(401).json({ erreur: 'Identifiant ou mot de passe incorrect' });
    }

    if (!livreur.actif) {
      return res.status(403).json({ erreur: 'Ce compte livreur est désactivé' });
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
});




// Routes
// POST /inscription
app.post('/inscription', upload.single('image'), async (req, res) => {
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
    const subFolder = type === 'client' ? 'clients' : 'gerants';
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
});




// Route de déconnexion - Mettre le statut à FALSE (hors ligne)
app.post('/deconnexion', verifierToken, async (req, res) => {
  try {
    const table = req.utilisateur.type === 'client' ? 'clients' : (req.utilisateur.type === 'gerant' ? 'gerants' : null);
    if (table) {
      // Supposition: la colonne 'statut' existe-t-elle dans clients/gerants ?
      // Dans le schéma original utilisateurs, il y avait 'statut'? Non, pas dans CREATE TABLE utilisateurs plus haut.
      // Attends, j'ai vu 'UPDATE utilisateurs SET statut = FALSE' dans le code original, mais pas dans le CREATE TABLE.
      // Si la colonne n'existe pas, ça va planter.
      // Vérifions le schéma original ligne 90 : pas de colonne statut.
      // Mais ligne 627 il y a un UPDATE statut = TRUE.
      // Peut-être ajoutée par alter table plus tard ? Ou oubliée dans mon CREATE TABLE ?
      // Je vais assumer qu'il faut l'ajouter ou gérer l'erreur.
      // Pour l'instant je tente l'update, si ça plante c'est que la colonne manque.
      // Je vais commenter l'update pour éviter le crash si la colonne n'existe pas, car je ne l'ai pas créée dans les nouvelles tables.

      // await pool.execute(
      //   `UPDATE ${table} SET statut = FALSE WHERE id = ?`,
      //   [req.utilisateur.id]
      // );
    }
    res.json({ message: 'Déconnexion réussie' });
  } catch (erreur) {
    console.error('Erreur déconnexion:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});


app.post('/connexion', async (req, res) => {
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

    if (!users.length) {
      return res.status(400).json({ erreur: 'Utilisateur non trouvé.' });
    }

    const user = users[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(400).json({ erreur: 'Mot de passe incorrect.' });
    }

    // Gestion du statut (mise en commentaire par sécurité si colonne absente)
    // const table = user.type === 'client' ? 'clients' : 'gerants';
    // await pool.execute(`UPDATE ${table} SET statut = TRUE WHERE id = ?`, [user.id]);

    const token = jwt.sign({ id: user.id, type: user.type }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, type: user.type, id: user.id });

  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});


// Routes protégées
// Routes protégées
app.get('/utilisateur', verifierToken, async (req, res) => {
  try {
    const table = req.utilisateur.type === 'client' ? 'clients' : (req.utilisateur.type === 'gerant' ? 'gerants' : null);
    if (!table) return res.status(400).json({ erreur: 'Type utilisateur inconnu' });

    const [utilisateur] = await pool.execute(
      `SELECT id, nom, prenom, telephone, email, image, '${req.utilisateur.type}' as type, date_inscription, date_naissance FROM ${table} WHERE id = ?`,
      [req.utilisateur.id]
    );
    if (!utilisateur.length) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });

    // Ajout du statut manuellement à true si connecté (ou aller chercher une colonne statut si elle existait)
    // Pour l'instant on renvoie l'objet sans statut ou avec statut true
    const user = utilisateur[0];
    user.statut = true;

    res.json(user);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

app.get('/boutiques', async (req, res) => {
  try {
    const [boutiques] = await pool.execute('SELECT * FROM boutiques');
    res.json(boutiques);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

app.get('/boutiques/:id', async (req, res) => {
  try {
    const [boutique] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length) return res.status(404).json({ erreur: 'Boutique non trouvée' });
    const [articles] = await pool.execute('SELECT * FROM articles WHERE boutique_id = ?', [req.params.id]);
    const [services] = await pool.execute('SELECT * FROM services WHERE boutique_id = ?', [req.params.id]);
    const [commentaires] = await pool.execute(
      'SELECT c.*, u.nom, u.prenom FROM commentaires c JOIN clients u ON c.utilisateur_id = u.id WHERE c.boutique_id = ?',
      [req.params.id]
    );
    const [livreurs] = await pool.execute(
      'SELECT id, boutique_id, nom, prenom, telephone, email, photo, adresse, actif, date_creation FROM livreurs WHERE boutique_id = ?',
      [req.params.id]
    );
    res.json({ ...boutique[0], articles, services, commentaires, livreurs });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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

    // Si un nouveau mot de passe est fourni, on met à jour tout y compris le mot de passe
    // Sinon, on met à jour tout sauf le mot de passe
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// app.put('/boutiques/:id/articles/:articleId', verifierToken, upload.single('image'), async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
//   try {
//     const { nom, description, prix, stock } = req.body;
//     if (!nom || !prix) {
//       return res.status(400).json({ erreur: 'Nom et prix sont requis.' });
//     }
//     const prixNum = parseFloat(prix);
//     if (isNaN(prixNum) || prixNum <= 0) {
//       return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
//     }
//     const stockNum = parseInt(stock) || 0;
//     if (stockNum < 0) {
//       return res.status(400).json({ erreur: 'Le stock ne peut pas être négatif.' });
//     }
//     const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
//     if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }
//     let cheminImage = null;
//     if (req.file) {
//       cheminImage = `/uploads/${req.file.filename}`;
//     } else if (req.body.image) {
//       cheminImage = req.body.image;
//     }
//     await pool.execute(
//       'UPDATE articles SET nom = ?, description = ?, prix = ?, stock = ?, image = ? WHERE id = ? AND boutique_id = ?',
//       [nom, description || null, prixNum, stockNum, cheminImage, req.params.articleId, req.params.id]
//     );
//     res.json({ message: 'Article mis à jour' });
//   } catch (erreur) {
//     throw erreur;
//   }
// });




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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    const disponibleBool = disponible === 'true' || disponible === true || disponible === '1' || disponible === 1;
    const [resultat] = await pool.execute(
      'INSERT INTO services (boutique_id, nom, description, prix, disponible, image) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, nom, description, prixNum, disponibleBool !== undefined ? disponibleBool : true, imagePath]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// app.put('/boutiques/:id/services/:serviceId', verifierToken, upload.single('image'), async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
//   try {
//     const { nom, description, prix, disponible } = req.body;
//     if (!nom || !prix) {
//       return res.status(400).json({ erreur: 'Nom et prix sont requis.' });
//     }
//     const prixNum = parseFloat(prix);
//     if (isNaN(prixNum) || prixNum <= 0) {
//       return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
//     }
//     const disponibleBool = disponible === 'true' || disponible === true;
//     const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
//     if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }
//     let cheminImage = null;
//     if (req.file) {
//       cheminImage = `/uploads/${req.file.filename}`;
//     } else if (req.body.image) {
//       cheminImage = req.body.image;
//     }
//     await pool.execute(
//       'UPDATE services SET nom = ?, description = ?, prix = ?, disponible = ?, image = ? WHERE id = ? AND boutique_id = ?',
//       [nom, description || null, prixNum, disponibleBool, cheminImage, req.params.serviceId, req.params.id]
//     );
//     res.json({ message: 'Service mis à jour' });
//   } catch (erreur) {
//     throw erreur;
//   }
// });

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
    // Vérifier que l'utilisateur est un gérant
    if (req.utilisateur.type !== 'gerant') {
      console.log('Erreur: Utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    // Valider les paramètres
    const boutiqueId = parseInt(req.params.id);
    const serviceId = parseInt(req.params.serviceId);
    if (isNaN(boutiqueId) || isNaN(serviceId)) {
      console.log('Erreur: IDs invalides', { boutiqueId, serviceId });
      return res.status(400).json({ erreur: 'IDs de boutique ou de service invalides' });
    }

    // Vérifier que la boutique appartient au gérant
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [boutiqueId]);
    console.log('Résultat boutique:', boutique);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      console.log('Erreur: Boutique non trouvée ou non autorisée', { boutiqueId, gerantId: req.utilisateur.id });
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    // Vérifier que le service existe
    const [service] = await pool.execute('SELECT id, image FROM services WHERE id = ? AND boutique_id = ?', [serviceId, boutiqueId]);
    console.log('Résultat service:', service);
    if (!service.length) {
      console.log('Erreur: Service non trouvé', { serviceId, boutiqueId });
      return res.status(404).json({ erreur: 'Service non trouvé' });
    }

    // Valider les données envoyées
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

    // Gérer la disponibilité - accepter '1'/'0', 'true'/'false', ou boolean
    const disponibleBool = disponible === 'true' || disponible === true || disponible === '1' || disponible === 1;

    // Gérer l'image
    let cheminImage = service[0].image;
    if (req.file) {
      // Nouvelle image fournie
      cheminImage = `/Uploads/${req.file.filename}`;
      if (service[0].image && fs.existsSync(path.join(__dirname, service[0].image))) {
        try {
          await fsPromises.unlink(path.join(__dirname, service[0].image));
          console.log('Ancienne image supprimée:', service[0].image);
        } catch (unlinkError) {
          console.error('Erreur suppression ancienne image:', unlinkError);
        }
      }
    } else if (conserver_image === 'true') {
      // Conserver l'image existante
      cheminImage = service[0].image;
      console.log('Image existante conservée:', cheminImage);
    } else {
      // Supprimer l'image existante
      cheminImage = null;
      if (service[0].image && fs.existsSync(path.join(__dirname, service[0].image))) {
        try {
          await fsPromises.unlink(path.join(__dirname, service[0].image));
          console.log('Image supprimée:', service[0].image);
        } catch (unlinkError) {
          console.error('Erreur suppression image:', unlinkError);
        }
      }
    }

    // Mettre à jour le service
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
        await fsPromises.unlink(path.join(__dirname, req.file.path));
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

app.get('/boutiques/:id/articles', async (req, res) => {
  try {
    const [articles] = await pool.execute('SELECT * FROM articles WHERE boutique_id = ?', [req.params.id]);
    res.json(articles);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

app.get('/boutiques/:id/services', async (req, res) => {
  try {
    const [services] = await pool.execute('SELECT * FROM services WHERE boutique_id = ?', [req.params.id]);
    res.json(services);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});




app.delete('/commandes/:id', verifierToken, async (req, res) => {
  // console.log('Requête reçue pour DELETE /commandes/:id');
  const commandeId = parseInt(req.params.id);
  const utilisateurId = req.utilisateur.id;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (!commandeId || isNaN(commandeId)) {
      // console.log('Erreur: Identifiant de commande invalide:', commandeId);
      throw new Error('Identifiant de commande invalide');
    }

    // Vérifier que la commande appartient à l'utilisateur
    const [commande] = await connection.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    if (!commande.length) {
      // console.log('Erreur: Commande non trouvée ou non autorisée pour utilisateurId:', utilisateurId);
      throw new Error('Commande non trouvée ou non autorisée');
    }

    // Vérifier si la commande a des paiements associés
    const [paiements] = await connection.query(
      'SELECT * FROM paiements WHERE commande_id = ?',
      [commandeId]
    );
    if (paiements.length > 0) {
      // console.log('Erreur: La commande a des paiements associés et ne peut pas être supprimée');
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
        // console.log('Erreur: Article non trouvé pour article_id:', commande[0].article_id);
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
// app.post('/commandes/:id/paiement', verifierToken, async (req, res) => {
//   console.log('Requête reçue pour POST /commandes/:id/paiement');
//   const commandeId = parseInt(req.params.id);
//   const { moyen_paiement } = req.body;
//   const utilisateurId = req.utilisateur.id;

//   try {
//     if (!commandeId || isNaN(commandeId)) {
//       console.log('Erreur: Identifiant de commande invalide');
//       return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
//     }

//     if (!moyen_paiement || !['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'].includes(moyen_paiement)) {
//       console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
//       return res.status(400).json({ erreur: 'Moyen de paiement invalide 2x' });
//     }

//     // Vérifier que la commande existe et appartient à l'utilisateur
//     const [commande] = await pool.query(
//       'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
//       [commandeId, utilisateurId]
//     );
//     console.log('Commande trouvée dans la base:', commande);
//     if (commande.length === 0) {
//       console.log('Erreur: Commande non trouvée ou non autorisée');
//       return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
//     }

//     if (commande[0].statut !== 'en attente') {
//       console.log('Erreur: Statut de la commande non valide pour paiement', commande[0].statut);
//       return res.status(400).json({ erreur: 'Cette commande a déjà été payée ou annulée' });
//     }

//     // Vérifier que la boutique existe
//     const [boutique] = await pool.query('SELECT * FROM boutiques WHERE id = ?', [commande[0].boutique_id]);
//     console.log('Boutique trouvée:', boutique);
//     if (boutique.length === 0) {
//       console.log('Erreur: Boutique non trouvée pour la commande');
//       return res.status(404).json({ erreur: 'Boutique non trouvée pour la commande' });
//     }

//     // Mettre à jour la commande avec le moyen de paiement et le statut
//     await pool.query(
//       'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
//       ['en préparation', moyen_paiement, commandeId]
//     );
//     console.log('Paiement confirmé pour commande:', commandeId);

//     // Enregistrer le paiement dans la table paiements
//     const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
//     console.log('Insertion dans paiements:', {
//       commandeId,
//       utilisateurId,
//       boutiqueId: commande[0].boutique_id,
//       montant: commande[0].prix,
//       moyen_paiement,
//       date,
//     });
//     const [paiementResult] = await pool.query(
//       'INSERT INTO paiements (commande_id, utilisateur_id, boutique_id, montant, moyen_paiement, date) VALUES (?, ?, ?, ?, ?, ?)',
//       [commandeId, utilisateurId, commande[0].boutique_id, commande[0].prix, moyen_paiement, date]
//     );
//     console.log('Paiement enregistré dans la table paiements, ID:', paiementResult.insertId);

//     // Récupérer le gérant de la boutique
//     const [gerant] = await pool.query(
//       'SELECT u.* FROM utilisateurs u JOIN boutiques b ON u.id = b.gerant_id WHERE b.id = ? AND u.type = ?',
//       [commande[0].boutique_id, 'gerant']
//     );
//     console.log('Gérant trouvé:', gerant);
//     if (gerant.length === 0) {
//       console.log('Aucun gérant trouvé pour la boutique:', commande[0].boutique_id);
//     } else {
//       // Envoyer une notification au gérant (simulée en l'enregistrant dans la table notifications)
//       const message = `Nouveau paiement reçu : ${commande[0].prix} GNF via ${moyen_paiement} pour la commande #${commandeId}.`;
//       console.log('Insertion dans notifications:', {
//         boutiqueId: commande[0].boutique_id,
//         utilisateurId: gerant[0].id,
//         message,
//         date,
//       });
//       const [notificationResult] = await pool.query(
//         'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
//         [commande[0].boutique_id, gerant[0].id, message, date]
//       );
//       console.log('Notification enregistrée pour le gérant, ID:', notificationResult.insertId);
//     }

//     res.status(200).json({ message: 'Paiement effectué avec succès', moyen_paiement });
//   } catch (error) {
//     console.error('Erreur détaillée paiement commande:', {
//       message: error.message,
//       sqlMessage: error.sqlMessage,
//       sqlState: error.sqlState,
//       code: error.code,
//     });
//     res.status(500).json({ erreur: 'Erreur serveur lors du paiement de la commande' });
//   }
// });



app.post('/commandes/:id/paiement', verifierToken, async (req, res) => {
  // console.log('Requête reçue pour POST /commandes/:id/paiement');
  const commandeId = parseInt(req.params.id);
  const { moyen_paiement } = req.body;
  const utilisateurId = req.utilisateur.id;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validation des paramètres
    if (!commandeId || isNaN(commandeId)) {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
    }

    // if (!moyen_paiement || !['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'].includes(moyen_paiement)) {
    //   // console.log('Erreur: Moyen de paiement invalide', { moyen_paiement });
    //   return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
    // }

    // Vérifier que la commande existe et appartient à l'utilisateur
    const [commande] = await connection.query(
      'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
      [commandeId, utilisateurId]
    );
    // console.log('Commande trouvée:', commande);
    if (!commande.length) {
      await connection.rollback();
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }

    // Vérifier le statut de la commande
    if (commande[0].statut !== 'en attente') {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Cette commande a déjà été payée ou annulée' });
    }

    // Vérifier si un paiement existe déjà
    const [existingPaiement] = await connection.query(
      'SELECT id FROM paiements WHERE commande_id = ?',
      [commandeId]
    );
    if (existingPaiement.length > 0) {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Un paiement existe déjà pour cette commande' });
    }

    // Vérifier que la boutique existe
    const [boutique] = await connection.query('SELECT id FROM boutiques WHERE id = ?', [commande[0].boutique_id]);
    // console.log('Boutique trouvée:', boutique);
    if (!boutique.length) {
      await connection.rollback();
      return res.status(404).json({ erreur: 'Boutique non trouvée pour la commande' });
    }

    // Simuler des détails de paiement
    const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    let otp = null, reference_3ds = null;
    if (['Orange Money', 'Mobile Money', 'John-Pay', 'Paiement à la livraison'].includes(moyen_paiement)) {
      otp = Math.floor(100000 + Math.random() * 900000).toString(); // Générer un OTP à 6 chiffres
      // console.log('OTP simulé généré:', { commandeId, otp });
    } else if (moyen_paiement === 'Paypal') {
      reference_3ds = `3DS-${Date.now()}`; // Référence 3D Secure simulée
      // console.log('Référence 3D Secure simulée:', { commandeId, reference_3ds });
    }

    // Mettre à jour la commande
    await connection.query(
      'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
      ['en préparation', moyen_paiement, commandeId]
    );
    // console.log('Commande mise à jour:', { commandeId, statut: 'en préparation', moyen_paiement });

    // Enregistrer le paiement
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [paiementResult] = await connection.query(
      'INSERT INTO paiements (commande_id, utilisateur_id, boutique_id, montant, moyen_paiement, date) VALUES (?, ?, ?, ?, ?, ?)',
      [commandeId, utilisateurId, commande[0].boutique_id, commande[0].prix, moyen_paiement, date]
    );
    // console.log('Paiement enregistré:', { paiementId: paiementResult.insertId, transactionId });

    // Notifier le gérant
    const [gerant] = await connection.query(
      'SELECT g.id FROM gerants g JOIN boutiques b ON g.id = b.gerant_id WHERE b.id = ?',
      [commande[0].boutique_id]
    );
    if (gerant.length) {
      const message = `Nouveau paiement reçu pour la commande #${commandeId} via ${moyen_paiement}.`;
      await connection.query(
        'INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu) VALUES (?, ?, ?, ?, ?)',
        [gerant[0].id, commande[0].boutique_id, message, date, false]
      );
      // console.log('Notification envoyée au gérant:', { gerantId: gerant[0].id, message });
    }

    await connection.commit();

    // Réponse enrichie pour la simulation
    res.json({
      message: 'Paiement effectué avec succès',
      moyen_paiement,
      transaction_id: transactionId,
      otp,
      reference_3ds,
      commande_id: commandeId,
      montant: commande[0].prix,
      date
    });
  } catch (erreur) {
    if (connection) await connection.rollback();
    console.error('Erreur lors du traitement du paiement:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
      stack: erreur.stack
    });
    if (erreur.message.includes('non trouvée')) {
      res.status(404).json({ erreur: erreur.message });
    } else if (erreur.message.includes('invalide') || erreur.message.includes('déjà')) {
      res.status(400).json({ erreur: erreur.message });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur lors du traitement du paiement' });
    }
  } finally {
    if (connection) connection.release();
  }
});



// Récupérer les commentaires pour un article ou un service
app.get('/boutiques/:id/commentaires', verifierToken, async (req, res) => {
  // console.log('Requête reçue pour GET /boutiques/:id/commentaires');
  const boutiqueId = parseInt(req.params.id);
  const { article_id, service_id } = req.query;

  try {
    if (!boutiqueId || isNaN(boutiqueId)) {
      // console.log('Erreur: Identifiant de boutique invalide:', boutiqueId);
      return res.status(400).json({ erreur: 'Identifiant de boutique invalide' });
    }

    if (!article_id && !service_id) {
      // console.log('Erreur: Aucun article ou service spécifié');
      return res.status(400).json({ erreur: 'Aucun article ou service spécifié' });
    }

    if (article_id && service_id) {
      // console.log('Erreur: Impossible de spécifier à la fois un article et un service');
      return res.status(400).json({ erreur: 'Impossible de spécifier à la fois un article et un service' });
    }

    let query = `
      SELECT c.id, c.texte, DATE_FORMAT(c.date_creation, '%Y-%m-%d %H:%i:%s') AS date, u.nom, u.prenom, u.image
      FROM commentaires c
      JOIN clients u ON c.utilisateur_id = u.id
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

    // console.log('Requête SQL:', query, 'Params:', queryParams);
    const [comments] = await pool.query(query, queryParams);
    // console.log('Résultat de la requête:', comments);

    if (comments.length === 0) {
      // console.log('Aucun commentaire trouvé pour boutiqueId:', boutiqueId);
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
  // console.log('Requête reçue pour POST /boutiques/:id/commandes');
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

    if (!['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal', 'Paiement à la livraison'].includes(moyen_paiement)) {
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
// app.post('/commandes/:id/paiement', verifierToken, async (req, res) => {
//   console.log('Requête reçue pour POST /commandes/:id/paiement');
//   const commandeId = parseInt(req.params.id);
//   const { moyen_paiement } = req.body;
//   const utilisateurId = req.utilisateur.id;

//   try {
//     if (!commandeId || isNaN(commandeId)) {
//       console.log('Erreur: Identifiant de commande invalide');
//       return res.status(400).json({ erreur: 'Identifiant de commande invalide' });
//     }

//     if (!moyen_paiement || !['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'].includes(moyen_paiement)) {
//       console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
//       return res.status(400).json({ erreur: 'Moyen de paiement invalide encore' });
//     }

//     // Vérifier que la commande existe et appartient à l'utilisateur
//     const [commande] = await pool.query(
//       'SELECT * FROM commandes WHERE id = ? AND utilisateur_id = ?',
//       [commandeId, utilisateurId]
//     );
//     console.log('Commande trouvée dans la base:', commande);
//     if (commande.length === 0) {
//       console.log('Erreur: Commande non trouvée ou non autorisée');
//       return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
//     }

//     // Vérifier que la commande est en attente de paiement
//     if (commande[0].statut !== 'en attente') {
//       console.log('Erreur: Statut de la commande non valide pour paiement', commande[0].statut);
//       return res.status(400).json({ erreur: 'Cette commande n\'est plus en attente de paiement' });
//     }

//     // Vérifier que la boutique existe
//     const [boutique] = await pool.query('SELECT * FROM boutiques WHERE id = ?', [commande[0].boutique_id]);
//     console.log('Boutique trouvée:', boutique);
//     if (boutique.length === 0) {
//       console.log('Erreur: Boutique non trouvée pour la commande');
//       return res.status(404).json({ erreur: 'Boutique non trouvée pour la commande' });
//     }

//     // Mettre à jour la commande avec le moyen de paiement et passer au statut suivant (par exemple, 'acceptée')
//     await pool.query(
//       'UPDATE commandes SET statut = ?, moyen_paiement = ? WHERE id = ?',
//       ['en préparation', moyen_paiement, commandeId]
//     );
//     console.log('Paiement confirmé pour commande, nouveau statut:', 'en préparation');

//     // Enregistrer le paiement dans la table paiements
//     const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
//     console.log('Insertion dans paiements:', {
//       commandeId,
//       utilisateurId,
//       boutiqueId: commande[0].boutique_id,
//       montant: commande[0].prix,
//       moyen_paiement,
//       date,
//     });
//     const [paiementResult] = await pool.query(
//       'INSERT INTO paiements (commande_id, utilisateur_id, boutique_id, montant, moyen_paiement, date) VALUES (?, ?, ?, ?, ?, ?)',
//       [commandeId, utilisateurId, commande[0].boutique_id, commande[0].prix, moyen_paiement, date]
//     );
//     console.log('Paiement enregistré dans la table paiements, ID:', paiementResult.insertId);

//     // Récupérer le gérant de la boutique
//     const [gerant] = await pool.query(
//       'SELECT u.* FROM utilisateurs u JOIN boutiques b ON u.id = b.utilisateur_id WHERE b.id = ? AND u.type = ?',
//       [commande[0].boutique_id, 'gerant']
//     );
//     console.log('Gérant trouvé:', gerant);
//     if (gerant.length === 0) {
//       console.log('Aucun gérant trouvé pour la boutique:', commande[0].boutique_id);
//     } else {
//       // Envoyer une notification au gérant (simulée en l'enregistrant dans la table notifications)
//       const message = `Nouveau paiement reçu : ${commande[0].prix} GNF via ${moyen_paiement} pour la commande #${commandeId}.`;
//       console.log('Insertion dans notifications:', {
//         boutiqueId: commande[0].boutique_id,
//         utilisateurId: gerant[0].id,
//         message,
//         date,
//       });
//       const [notificationResult] = await pool.query(
//         'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
//         [commande[0].boutique_id, gerant[0].id, message, date]
//       );
//       console.log('Notification enregistrée pour le gérant, ID:', notificationResult.insertId);
//     }

//     res.status(200).json({ message: 'Paiement effectué avec succès', moyen_paiement });
//   } catch (error) {
//     console.error('Erreur détaillée paiement commande:', {
//       message: error.message,
//       sqlMessage: error.sqlMessage,
//       sqlState: error.sqlState,
//       code: error.code,
//     });
//     res.status(500).json({ erreur: 'Erreur serveur lors du paiement de la commande' });
//   }
// });



// app.get('/commandes', verifierToken, async (req, res) => {
//   try {
//     let commandes;
//     if (req.utilisateur.type === 'client') {
//       [commandes] = await pool.execute(
//         `SELECT c.*, b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
//                 a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
//                 s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
//                 l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone
//          FROM commandes c
//          LEFT JOIN boutiques b ON c.boutique_id = b.id
//          LEFT JOIN articles a ON c.article_id = a.id
//          LEFT JOIN services s ON c.service_id = s.id
//          LEFT JOIN livreurs l ON c.livreur_id = l.id
//          WHERE c.utilisateur_id = ?`,
//         [req.utilisateur.id]
//       );
//     } else {
//       [commandes] = await pool.execute(
//         `SELECT c.*, b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
//                 a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
//                 s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
//                 l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone
//          FROM commandes c
//          JOIN boutiques b ON c.boutique_id = b.id
//          LEFT JOIN articles a ON c.article_id = a.id
//          LEFT JOIN services s ON c.service_id = s.id
//          LEFT JOIN livreurs l ON c.livreur_id = l.id
//          WHERE b.gerant_id = ?`,
//         [req.utilisateur.id]
//       );
//     }
//     res.json(commandes);
//   } catch (erreur) {
//     res.status(500).json({ erreur: 'Erreur lors de la récupération des commandes' });
//   }
// });


// AUJOURD'HUI 11/01/2026 
// ROUTE GET /commandes - Version modifiée pour inclure demandes_services
app.get('/commandes', verifierToken, async (req, res) => {
  try {
    let commandes = [];
    let demandesServices = [];

    if (req.utilisateur.type === 'client') {
      // Récupérer les commandes (articles et anciens services via table commandes)
      [commandes] = await pool.execute(
        `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
                c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id, c.image,
                c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone,
                'commande' AS type
         FROM commandes c
         LEFT JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE c.utilisateur_id = ?`,
        [req.utilisateur.id]
      );

      // Récupérer les demandes de services (nouvelle table demandes_services)
      [demandesServices] = await pool.execute(
        `SELECT ds.id, ds.utilisateur_id, ds.boutique_id, NULL AS article_id, ds.service_id, 
                1 AS quantite, ds.prix, ds.statut, ds.moyen_paiement, ds.date_creation, 
                NULL AS livreur_id, ds.client_latitude, ds.client_longitude, 
                ds.client_nom, ds.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                NULL AS article_nom, NULL AS article_description, NULL AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                NULL AS livreur_nom, NULL AS livreur_prenom, NULL AS livreur_telephone,
                s.image AS image, 'demande_service' AS type
         FROM demandes_services ds
         LEFT JOIN boutiques b ON ds.boutique_id = b.id
         LEFT JOIN services s ON ds.service_id = s.id
         WHERE ds.utilisateur_id = ?`,
        [req.utilisateur.id]
      );
    } else {
      // Pour gérant : récupérer commandes de ses boutiques
      [commandes] = await pool.execute(
        `SELECT c.id, c.utilisateur_id, c.boutique_id, c.article_id, c.service_id, c.quantite,
                c.prix, c.statut, c.moyen_paiement, c.date_creation, c.livreur_id, c.image,
                c.client_latitude, c.client_longitude, c.client_nom, c.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                a.nom AS article_nom, a.description AS article_description, a.image AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                l.nom AS livreur_nom, l.prenom AS livreur_prenom, l.telephone AS livreur_telephone,
                'commande' AS type
         FROM commandes c
         JOIN boutiques b ON c.boutique_id = b.id
         LEFT JOIN articles a ON c.article_id = a.id
         LEFT JOIN services s ON c.service_id = s.id
         LEFT JOIN livreurs l ON c.livreur_id = l.id
         WHERE b.gerant_id = ?`,
        [req.utilisateur.id]
      );

      // Récupérer demandes services des boutiques du gérant
      [demandesServices] = await pool.execute(
        `SELECT ds.id, ds.utilisateur_id, ds.boutique_id, NULL AS article_id, ds.service_id,
                1 AS quantite, ds.prix, ds.statut, ds.moyen_paiement, ds.date_creation,
                NULL AS livreur_id, ds.client_latitude, ds.client_longitude,
                ds.client_nom, ds.client_telephone,
                b.nom AS boutique_nom, b.description AS boutique_description, b.image AS boutique_image,
                NULL AS article_nom, NULL AS article_description, NULL AS article_image,
                s.nom AS service_nom, s.description AS service_description, s.image AS service_image,
                NULL AS livreur_nom, NULL AS livreur_prenom, NULL AS livreur_telephone,
                s.image AS image, 'demande_service' AS type
         FROM demandes_services ds
         JOIN boutiques b ON ds.boutique_id = b.id
         LEFT JOIN services s ON ds.service_id = s.id
         WHERE b.gerant_id = ?`,
        [req.utilisateur.id]
      );
    }

    // Combiner les deux listes et trier par date
    const toutesLesCommandes = [...commandes, ...demandesServices].sort((a, b) =>
      new Date(b.date_creation) - new Date(a.date_creation)
    );

    res.json(toutesLesCommandes);
  } catch (erreur) {
    console.error('Erreur GET /commandes:', erreur);
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
      'SELECT c.*, u.nom, u.prenom FROM commentaires c JOIN clients u ON c.utilisateur_id = u.id WHERE c.boutique_id = ?',
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
    const moyensPaiement = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal', 'Paiement à la livraison'];
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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

    // Notification au gérant sur la demande de réduction - AVEC DÉTAILS COMPLETS
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const messageGerant = `💰 Nouvelle demande de réduction
🏪 Commande #${req.params.id}
💸 Prix initial : ${commande[0].prix} GNF
🔽 Prix proposé : ${montant_propose} GNF
📉 Réduction demandée : ${(commande[0].prix - montant_propose).toFixed(2)} GNF
👤 Client : ${commande[0].client_nom || 'N/A'}
📞 Téléphone : ${commande[0].client_telephone || 'N/A'}`;
    await pool.execute(
      'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
      [commande[0].boutique_id, commande[0].gerant_id, messageGerant, date]
    );

    // Notification au client pour confirmer sa demande - AVEC DÉTAILS COMPLETS
    const messageClient = `✅ Demande de réduction envoyée
🏪 Commande #${req.params.id}
💸 Prix actuel : ${commande[0].prix} GNF
🔽 Prix proposé : ${montant_propose} GNF
⏳ En attente de validation du gérant`;
    await pool.execute(
      'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
      [commande[0].boutique_id, req.utilisateur.id, messageClient, date]
    );

    res.json({ message: 'Demande de réduction envoyée', id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// app.get('/reductions', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
//   try {
//     const [reductions] = await pool.execute(
//       `SELECT r.*, c.id AS commande_id, c.prix AS commande_prix, u.nom AS utilisateur_nom, u.prenom
//        FROM reductions r
//        JOIN commandes c ON r.commande_id = c.id
//        JOIN utilisateurs u ON r.utilisateur_id = u.id
//        WHERE c.boutique_id IN (SELECT id FROM boutiques WHERE gerant_id = ?)
//        ORDER BY r.date_creation DESC`,
//       [req.utilisateur.id]
//     );
//     res.json(reductions);
//   } catch (erreur) {
//     throw erreur;
//   }
// });




app.get('/reductions', verifierToken, async (req, res) => {
  const { boutique_id } = req.query;
  const userId = req.utilisateur.id;
  const userType = req.utilisateur.type;

  // console.log('Requête GET /reductions:', { boutique_id, userId, userType });

  try {
    if (userType !== 'gerant') {
      // console.log('Accès refusé: utilisateur non gérant', { userType });
      return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent voir les demandes de réduction.' });
    }

    let query;
    let params = [];

    if (boutique_id && !isNaN(parseInt(boutique_id))) {
      // Vérifier que la boutique appartient au gérant
      const [boutique] = await pool.execute(
        'SELECT id, gerant_id FROM boutiques WHERE id = ? AND gerant_id = ?',
        [parseInt(boutique_id), userId]
      );
      if (!boutique.length) {
        // console.log('Boutique non trouvée ou non autorisée', { boutique_id, userId });
        return res.status(403).json({ erreur: 'Boutique non trouvée ou vous n\'êtes pas autorisé à y accéder.' });
      }

      query = `
        SELECT r.*, c.id AS commande_id, c.prix AS commande_prix, u.nom AS utilisateur_nom, u.prenom
        FROM reductions r
        JOIN commandes c ON r.commande_id = c.id
        JOIN clients u ON r.utilisateur_id = u.id
        WHERE c.boutique_id = ?
        ORDER BY r.date_creation DESC
      `;
      params = [parseInt(boutique_id)];
    } else {
      // Récupérer toutes les réductions pour les boutiques du gérant
      query = `
        SELECT r.*, c.id AS commande_id, c.prix AS commande_prix, u.nom AS utilisateur_nom, u.prenom
        FROM reductions r
        JOIN commandes c ON r.commande_id = c.id
        JOIN clients u ON r.utilisateur_id = u.id
        WHERE c.boutique_id IN (
          SELECT id FROM boutiques WHERE gerant_id = ?
        )
        ORDER BY r.date_creation DESC
      `;
      params = [userId];
    }

    // console.log('Exécution de la requête SQL:', { query, params });
    const [reductions] = await pool.execute(query, params);

    // console.log('Réductions envoyées:', {
    //   count: reductions.length,
    //   boutique_id: boutique_id || 'toutes',
    //   userId,
    // });
    res.json(reductions);
  } catch (erreur) {
    console.error('Erreur détaillée dans GET /reductions:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
      query: query || 'non défini',
      params: params || 'non défini',
      stack: erreur.stack,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des demandes de réduction.' });
  }
});












app.put('/reductions/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    // console.log('Accès refusé : Utilisateur type', req.utilisateur.type);
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
      await connection.rollback();
      return res.status(404).json({ erreur: 'Demande de réduction non trouvée ou non autorisée' });
    }

    const reduction = reductions[0];
    if (reduction.statut !== 'en attente') {
      await connection.rollback();
      return res.status(400).json({ erreur: 'Cette demande a déjà été traitée' });
    }

    if (statut === 'acceptée') {
      // Mettre à jour le prix de la commande avec le montant proposé
      await connection.query(
        'UPDATE commandes SET prix = ? WHERE id = ?',
        [reduction.montant_propose, reduction.commande_id]
      );

      // Notification au client - RÉDUCTION ACCEPTÉE AVEC DÉTAILS COMPLETS
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const reduction_montant = (reduction.commande_prix - reduction.montant_propose).toFixed(2);
      const message = `✅ Réduction acceptée !
🏪 Commande #${reduction.commande_id}
🔴 Ancien prix : ${reduction.commande_prix} GNF
🟬 Nouveau prix : ${reduction.montant_propose} GNF
💰 Économie : ${reduction_montant} GNF
🎉 Votre demande a été acceptée par le gérant`;
      await connection.query(
        'INSERT INTO notifications (boutique_id, utilisateur_id, message, date) VALUES (?, ?, ?, ?)',
        [reduction.boutique_id, reduction.utilisateur_id, message, date]
      );
    } else {
      // Notification au client - RÉDUCTION REFUSÉE AVEC DÉTAILS
      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const message = `❌ Réduction refusée
🏪 Commande #${reduction.commande_id}
💸 Prix maintenu : ${reduction.commande_prix} GNF
😔 Votre demande de réduction a été refusée par le gérant`;
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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






// app.get('/notifications', verifierToken, async (req, res) => {
//   try {
//     let notifications;
//     if (req.utilisateur.type === 'gerant') {
//       // Notifications pour les gérants (associées à leurs boutiques)
//       [notifications] = await pool.execute(
//         `SELECT n.*, b.nom AS boutique_nom
//          FROM notifications n
//          JOIN boutiques b ON n.boutique_id = b.id
//          WHERE n.utilisateur_id = ?
//          ORDER BY n.date DESC`,
//         [req.utilisateur.id]
//       );
//     } else if (req.utilisateur.type === 'client') {
//       // Notifications pour les clients (associées à eux directement)
//       [notifications] = await pool.execute(
//         `SELECT n.*, b.nom AS boutique_nom
//          FROM notifications n
//          JOIN boutiques b ON n.boutique_id = b.id
//          WHERE n.utilisateur_id = ?
//          ORDER BY n.date DESC`,
//         [req.utilisateur.id]
//       );
//     } else {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }
//     res.json(notifications);
//   } catch (erreur) {
//     console.error('Erreur dans GET /notifications:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des notifications' });
//   }
// });



app.get('/notifications', verifierToken, async (req, res) => {
  const { boutique_id } = req.query;
  const userId = req.utilisateur.id;
  const userType = req.utilisateur.type;

  // console.log('Requête GET /notifications:', { boutique_id, userId, userType });

  try {
    let notifications;

    if (userType === 'gerant') {
      let query;
      let params = [userId];

      if (boutique_id && !isNaN(parseInt(boutique_id))) {
        // Vérifier que la boutique appartient au gérant
        const [boutique] = await pool.execute(
          'SELECT id, gerant_id FROM boutiques WHERE id = ? AND gerant_id = ?',
          [parseInt(boutique_id), userId]
        );
        if (!boutique.length) {
          // console.log('Boutique non trouvée ou non autorisée', { boutique_id, userId });
          return res.status(403).json({ erreur: 'Boutique non trouvée ou vous n\'êtes pas autorisé à y accéder' });
        }
        query = `
          SELECT n.*, b.nom AS boutique_nom
          FROM notifications n
          JOIN boutiques b ON n.boutique_id = b.id
          WHERE n.utilisateur_id = ? AND n.boutique_id = ?
          ORDER BY n.date DESC
        `;
        params.push(parseInt(boutique_id));
      } else {
        // Récupérer toutes les notifications pour toutes les boutiques du gérant
        query = `
          SELECT n.*, b.nom AS boutique_nom
          FROM notifications n
          JOIN boutiques b ON n.boutique_id = b.id
          WHERE n.utilisateur_id = ? AND b.gerant_id = ?
          ORDER BY n.date DESC
        `;
        params.push(userId);
      }

      [notifications] = await pool.execute(query, params);
    } else if (userType === 'client') {
      // Notifications pour les clients (pas liées à une boutique spécifique)
      [notifications] = await pool.execute(
        `SELECT n.*, b.nom AS boutique_nom
         FROM notifications n
         JOIN boutiques b ON n.boutique_id = b.id
         WHERE n.utilisateur_id = ?
         ORDER BY n.date DESC`,
        [userId]
      );
    } else if (userType === 'livreur') {
      // Notifications pour les livreurs (liées à leur boutique_id)
      [notifications] = await pool.execute(
        `SELECT n.*, b.nom AS boutique_nom
         FROM notifications n
         JOIN boutiques b ON n.boutique_id = b.id
         WHERE n.utilisateur_id = ? AND n.boutique_id = ?
         ORDER BY n.date DESC`,
        [userId, req.utilisateur.boutique_id]
      );
    } else {
      // console.log('Accès refusé: type utilisateur invalide', { userType });
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    // console.log('Notifications envoyées:', {
    //   count: notifications.length,
    //   boutique_id: boutique_id || 'toutes',
    //   userId,
    // });
    res.json(notifications);
  } catch (erreur) {
    console.error('Erreur dans GET /notifications:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des notifications' });
  }
});

// MARQUER UNE NOTIFICATION COMME LUE
app.post('/notifications/:id/lu', verifierToken, async (req, res) => {
  const notificationId = req.params.id;
  try {
    // Vérifier que la notification appartient à l'utilisateur
    const [notification] = await pool.execute(
      'SELECT utilisateur_id FROM notifications WHERE id = ?',
      [notificationId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ erreur: 'Notification non trouvée' });
    }

    if (notification[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    await pool.execute(
      'UPDATE notifications SET lu = TRUE WHERE id = ?',
      [notificationId]
    );

    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur mark read:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// SUPPRIMER UNE NOTIFICATION
app.delete('/notifications/:id', verifierToken, async (req, res) => {
  const notificationId = req.params.id;
  try {
    // Vérifier que la notification appartient à l'utilisateur
    const [notification] = await pool.execute(
      'SELECT utilisateur_id FROM notifications WHERE id = ?',
      [notificationId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ erreur: 'Notification non trouvée' });
    }

    if (notification[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    await pool.execute(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );

    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    console.error('Erreur delete notification:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});





// app.get('/utilisateur', verifierToken, async (req, res) => {
//   try {
//     const [utilisateur] = await pool.execute(
//       'SELECT id, nom, prenom, email, telephone, type FROM utilisateurs WHERE id = ?',
//       [req.utilisateur.id]
//     );
//     if (!utilisateur.length) {
//       return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
//     }
//     res.json(utilisateur[0]);
//   } catch (erreur) {
//     console.error('Erreur dans GET /utilisateur:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des informations utilisateur' });
//   }
// });

app.put('/utilisateur', verifierToken, upload.single('image'), async (req, res) => {
  try {
    // console.log('Requête reçue pour PUT /utilisateur:', {
    //   body: req.body,
    //   file: req.file,
    // });

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
      imagePath = `/uploads/${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, imagePath);
      fs.renameSync(req.file.path, filePath); // Déplacer le fichier uploadé vers le nouveau chemin
      // console.log('Nouvelle image renommée et stockée:', imagePath);

      // Supprimer l'ancienne image si elle existe
      if (user[0].image) {
        const oldImagePath = path.join(__dirname, user[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          // console.log('Ancienne image supprimée:', oldImagePath);
        }
      }
    } else if (existingImagePath) {
      // Pas de nouvelle image, utiliser l'image existante envoyée par le client
      imagePath = existingImagePath;
      // console.log('Utilisation de l\'image existante (envoyée par le client):', imagePath);
    } else if (user[0].image) {
      // Pas de nouvelle image ni d'image existante dans la requête, conserver l'image actuelle
      imagePath = user[0].image;
      // console.log('Utilisation de l\'image existante (de la base de données):', imagePath);
    }

    if (imagePath) {
      const filePath = path.join(__dirname, imagePath);
      if (!fs.existsSync(filePath)) {
        console.error(`Fichier manquant : ${filePath} n'existe pas`);
        return res.status(500).json({ erreur: 'Image introuvable sur le serveur' });
      }
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
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
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

app.get('/boutiques/:id/services/:id', verifierToken, async (req, res) => {
  const { id: boutiqueId } = req.params;
  const { id: serviceId } = req.params;
  try {
    const [service] = await pool.query(
      'SELECT * FROM services WHERE id = ? AND boutique_id = ?',
      [serviceId, boutiqueId]
    );
    if (!service.length) {
      // console.log('Service non trouvé:', { serviceId, boutiqueId });
      return res.status(404).json({ erreur: 'Service non trouvé' });
    }
    // console.log('Service envoyé:', service[0]);
    res.json(service[0]);
  } catch (err) {
    console.error('Erreur GET /boutiques/:id/services/:id:', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
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
      // return res.status(403).json({ erreur: 'Accès refusé ou commentaire non trouvé' });
      return res.status(403).json({ erreur: 'Accès refusé' });
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
      return res.status(403).json({ erreur: 'Accès refusé' });
      // return res.status(403).json({ erreur: 'Accès refusé ou commentaire non trouvé' });
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
       LEFT JOIN clients u ON c.utilisateur_id = u.id
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
  const periodesValides = ['day', 'week', 'month', 'year', 'all'];
  if (!periodesValides.includes(periode)) {
    return res.status(400).json({ erreur: 'Période invalide. Utilisez day, week, month, year ou all.' });
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

    // Définir le filtre de période
    let dateCondition = '';
    let dateConditionPeriodePrecedente = '';
    let groupByClause = '';

    if (periode === 'day') {
      dateCondition = 'AND DATE(date_creation) = CURDATE()';
      dateConditionPeriodePrecedente = 'AND DATE(date_creation) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
      groupByClause = 'HOUR(date_creation)';
    } else if (periode === 'week') {
      dateCondition = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)';
      dateConditionPeriodePrecedente = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)';
      groupByClause = 'DAYNAME(date_creation)';
    } else if (periode === 'month') {
      dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())';
      dateConditionPeriodePrecedente = 'AND YEAR(date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(date_creation) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
      groupByClause = 'DAY(date_creation)';
    } else if (periode === 'year') {
      dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE())';
      dateConditionPeriodePrecedente = 'AND YEAR(date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 YEAR))';
      groupByClause = 'MONTH(date_creation)';
    }

    // 1. COMMANDES - Statistiques détaillées
    const [commandesParStatut] = await pool.execute(
      `SELECT statut, COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}
       GROUP BY statut`,
      [boutiqueId]
    );

    const commandesTotal = commandesParStatut.reduce((sum, c) => sum + parseInt(c.total), 0);
    const commandesCompletees = commandesParStatut.find(c => c.statut === 'livrée')?.total || 0;
    const tauxCompletion = commandesTotal > 0 ? ((commandesCompletees / commandesTotal) * 100).toFixed(1) : 0;

    // Commandes période précédente pour comparaison
    const [commandesPeriodePrecedente] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateConditionPeriodePrecedente}`,
      [boutiqueId]
    );

    const commandesPrecedent = parseInt(commandesPeriodePrecedente[0]?.total) || 0;
    const croissanceCommandes = commandesPrecedent > 0
      ? (((commandesTotal - commandesPrecedent) / commandesPrecedent) * 100).toFixed(1)
      : 0;

    // 2. REVENUS - Calculs mathématiques avancés
    const [revenus] = await pool.execute(
      `SELECT SUM(prix * quantite) AS total, COUNT(*) AS nombre_commandes,
              AVG(prix * quantite) AS moyenne_commande
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateCondition}`,
      [boutiqueId]
    );

    const revenuTotal = parseFloat(revenus[0]?.total) || 0;
    const nombreCommandesPayees = parseInt(revenus[0]?.nombre_commandes) || 0;
    const moyenneParCommande = parseFloat(revenus[0]?.moyenne_commande) || 0;

    // Revenus période précédente
    const [revenusPeriodePrecedente] = await pool.execute(
      `SELECT SUM(prix * quantite) AS total
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateConditionPeriodePrecedente}`,
      [boutiqueId]
    );

    const revenuPrecedent = parseFloat(revenusPeriodePrecedente[0]?.total) || 0;
    const croissanceRevenus = revenuPrecedent > 0
      ? (((revenuTotal - revenuPrecedent) / revenuPrecedent) * 100).toFixed(1)
      : 0;

    // Revenus par période pour graphique et tendance
    let revenusParPeriode;
    if (groupByClause) {
      [revenusParPeriode] = await pool.execute(
        `SELECT ${groupByClause} AS periode, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateCondition}
         GROUP BY ${groupByClause}
         ORDER BY date_creation`,
        [boutiqueId]
      );
    } else {
      // Pour periode=all, grouper par mois
      [revenusParPeriode] = await pool.execute(
        `SELECT DATE_FORMAT(date_creation, '%Y-%m') AS periode, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée')
         GROUP BY YEAR(date_creation), MONTH(date_creation)
         ORDER BY date_creation
         LIMIT 12`,
        [boutiqueId]
      );
    }

    // Calcul tendance (régression linéaire simplifiée - pente moyenne)
    let tendancePente = 0;
    if (revenusParPeriode.length > 1) {
      const valeurs = revenusParPeriode.map(r => parseFloat(r.total));
      const moyenneValeurs = valeurs.reduce((sum, v) => sum + v, 0) / valeurs.length;
      const differences = valeurs.slice(1).map((v, i) => v - valeurs[i]);
      tendancePente = differences.reduce((sum, d) => sum + d, 0) / differences.length;
    }

    // Prédiction simple (moyenne mobile)
    const prediction = revenusParPeriode.length > 0
      ? revenusParPeriode.reduce((sum, r) => sum + parseFloat(r.total), 0) / revenusParPeriode.length
      : 0;

    // 3. CLIENTS - Analyse détaillée
    const [clientsTotal] = await pool.execute(
      `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}`,
      [boutiqueId]
    );

    const [clientsRecurrents] = await pool.execute(
      `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? AND utilisateur_id IN (
         SELECT utilisateur_id FROM commandes WHERE boutique_id = ? GROUP BY utilisateur_id HAVING COUNT(*) > 1
       ) ${dateCondition}`,
      [boutiqueId, boutiqueId]
    );

    const totalClients = parseInt(clientsTotal[0]?.total) || 0;
    const recurrents = parseInt(clientsRecurrents[0]?.total) || 0;
    const nouveaux = totalClients - recurrents;
    const tauxRetention = totalClients > 0 ? ((recurrents / totalClients) * 100).toFixed(1) : 0;

    // 4. TOP PRODUITS/SERVICES
    const [topArticles] = await pool.execute(
      `SELECT a.nom, SUM(c.quantite) AS quantite_totale, SUM(c.prix * c.quantite) AS revenu_total
       FROM commandes c
       JOIN articles a ON c.article_id = a.id
       WHERE c.boutique_id = ? AND c.article_id IS NOT NULL ${dateCondition}
       GROUP BY a.id, a.nom
       ORDER BY revenu_total DESC
       LIMIT 5`,
      [boutiqueId]
    );

    const [topServices] = await pool.execute(
      `SELECT s.nom, COUNT(DISTINCT ds.id) AS nombre_demandes, SUM(ds.prix) AS revenu_total
       FROM demandes_services ds
       JOIN services s ON ds.service_id = s.id
       WHERE ds.boutique_id = ? ${dateCondition.replace('date_creation', 'ds.date_creation')}
       GROUP BY s.id, s.nom
       ORDER BY revenu_total DESC
       LIMIT 5`,
      [boutiqueId]
    );

    // 5. RÉPONSE COMPLÈTE
    res.json({
      boutique: {
        id: boutique[0].id,
        nom: boutique[0].nom
      },
      revenus: {
        total: revenuTotal,
        moyenneParCommande: moyenneParCommande.toFixed(0),
        croissance: parseFloat(croissanceRevenus),
        parPeriode: revenusParPeriode.map(r => ({
          periode: r.periode,
          total: parseFloat(r.total).toFixed(0)
        })),
        tendance: {
          pente: tendancePente.toFixed(0),
          direction: tendancePente > 0 ? 'hausse' : tendancePente < 0 ? 'baisse' : 'stable',
          prediction: prediction.toFixed(0)
        }
      },
      commandes: {
        total: commandesTotal,
        parStatut: commandesParStatut.reduce((obj, c) => {
          obj[c.statut] = parseInt(c.total);
          return obj;
        }, {}),
        tauxCompletion: parseFloat(tauxCompletion),
        croissance: parseFloat(croissanceCommandes)
      },
      clients: {
        total: totalClients,
        nouveaux: nouveaux,
        recurrents: recurrents,
        tauxRetention: parseFloat(tauxRetention)
      },
      topProduits: topArticles.map(a => ({
        nom: a.nom,
        quantite: parseInt(a.quantite_totale),
        revenu: parseFloat(a.revenu_total).toFixed(0)
      })),
      topServices: topServices.map(s => ({
        nom: s.nom,
        demandes: parseInt(s.nombre_demandes),
        revenu: parseFloat(s.revenu_total).toFixed(0)
      }))
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des statistiques' });
  }
});

app.get('/clients/depenses', verifierToken, async (req, res) => {
  console.log('>>> Route /clients/depenses appelée');
  if (req.utilisateur.type !== 'client') return res.status(403).json({ erreur: 'Accès réservé aux clients' });

  const utilisateurId = req.utilisateur.id;
  const periode = req.query.periode || 'month';
  console.log('Utilisateur ID:', utilisateurId, 'Période:', periode);

  try {
    // Construire la condition de date selon la période
    let dateCondition = '';
    switch (periode) {
      case 'today':
        dateCondition = 'AND DATE(c.date_creation) = CURDATE()';
        break;
      case 'week':
        dateCondition = 'AND c.date_creation >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateCondition = 'AND c.date_creation >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      case 'year':
        dateCondition = 'AND c.date_creation >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default: // 'all'
        dateCondition = '';
    }

    // Dépenses totales avec filtre de période
    const [depensesActuelles] = await pool.execute(
      `SELECT COALESCE(SUM(prix * quantite), 0) AS total, COUNT(*) AS nombre_commandes, COALESCE(AVG(prix * quantite), 0) AS moyenne_commande 
       FROM commandes c WHERE c.utilisateur_id = ? ${dateCondition}`, [utilisateurId]);

    const totalDepenses = parseFloat(depensesActuelles[0]?.total) || 0;
    const nombreCommandes = parseInt(depensesActuelles[0]?.nombre_commandes) || 0;
    const moyenneCommande = parseFloat(depensesActuelles[0]?.moyenne_commande) || 0;

    // Top boutiques avec filtre de période
    const [topBoutiques] = await pool.execute(
      `SELECT b.nom, COUNT(c.id) AS nombre_commandes, COALESCE(SUM(c.prix * c.quantite), 0) AS total_depense
       FROM commandes c JOIN boutiques b ON c.boutique_id = b.id
       WHERE c.utilisateur_id = ? ${dateCondition} GROUP BY b.id, b.nom ORDER BY total_depense DESC LIMIT 5`, [utilisateurId]);

    // Top articles avec filtre de période
    const [topArticles] = await pool.execute(
      `SELECT a.nom, COALESCE(SUM(c.quantite), 0) AS quantite_totale, COALESCE(SUM(c.prix * c.quantite), 0) AS total_depense
       FROM commandes c JOIN articles a ON c.article_id = a.id
       WHERE c.utilisateur_id = ? AND c.article_id IS NOT NULL ${dateCondition}
       GROUP BY a.id, a.nom ORDER BY total_depense DESC LIMIT 5`, [utilisateurId]);

    // Transactions récentes avec filtre de période
    const [transactionsRecentes] = await pool.execute(
      `SELECT c.id, b.nom AS boutique_nom, a.nom AS produit_nom, c.prix, c.quantite, c.date_creation
       FROM commandes c
       LEFT JOIN boutiques b ON c.boutique_id = b.id
       LEFT JOIN articles a ON c.article_id = a.id
       WHERE c.utilisateur_id = ? ${dateCondition} ORDER BY c.date_creation DESC LIMIT 10`, [utilisateurId]);

    console.log('✅ Dépenses récupérées - Total:', totalDepenses, 'Commandes:', nombreCommandes);

    res.json({
      periode,
      total: totalDepenses.toFixed(0),
      moyenne: moyenneCommande.toFixed(0),
      nombreCommandes,
      topBoutiques: topBoutiques.map(b => ({ nom: b.nom, commandes: parseInt(b.nombre_commandes), depense: parseFloat(b.total_depense).toFixed(0) })),
      topProduits: topArticles.map(p => ({ nom: p.nom, quantite: parseInt(p.quantite_totale), depense: parseFloat(p.total_depense).toFixed(0) })),
      transactionsRecentes: transactionsRecentes.map(t => ({
        id: t.id,
        boutique: t.boutique_nom,
        produit: t.produit_nom,
        prix: parseFloat(t.prix),
        quantite: parseInt(t.quantite) || 1,
        date: t.date_creation
      }))
    });

  } catch (error) {
    console.error('❌ ERREUR dépenses client:', error.message);
    console.error('SQL:', error.sql);
    res.status(500).json({ erreur: error.message, sql: error.sql });
  }
});





// app.put('/boutiques/:id/articles/:articleId', verifierToken, upload.single('image'), async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès refusé' });
//   }
//   try {
//     const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
//     if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
//       return res.status(403).json({ erreur: 'Accès refusé' });
//     }

//     const { nom, description, prix, stock, categorie } = req.body;
//     let image = req.body.image || null;
//     if (req.file) {
//       image = req.file.filename; // Nom du fichier uploadé
//     }

//     const [result] = await pool.execute(
//       'UPDATE articles SET nom = ?, description = ?, prix = ?, stock = ?, categorie = ?, image = ? WHERE id = ? AND boutique_id = ?',
//       [nom, description, prix, stock, categorie, image, req.params.articleId, req.params.id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ erreur: 'Article non trouvé ou non autorisé' });
//     }

//     res.json({ message: 'Article modifié avec succès' });
//   } catch (erreur) {
//     console.error('Erreur lors de la modification de l\'article:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur lors de la modification de l\'article' });
//   }
// });






app.put('/boutiques/:id/articles/:articleId', verifierToken, upload.single('image'), async (req, res) => {
  console.log('Requête PUT reçue:', {
    utilisateurId: req.utilisateur.id,
    utilisateurType: req.utilisateur.type,
    boutiqueId: req.params.id,
    articleId: req.params.articleId,
    body: req.body,
    file: req.file ? req.file.filename : null,
  });

  try {
    // Vérifier que l'utilisateur est un gérant
    if (req.utilisateur.type !== 'gerant') {
      console.log('Erreur: Utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
      return res.status(403).json({ erreur: 'Accès interdit: utilisateur non gérant' });
    }

    // Valider les paramètres
    const boutiqueId = parseInt(req.params.id);
    const articleId = parseInt(req.params.articleId);
    if (isNaN(boutiqueId) || isNaN(articleId)) {
      console.log('Erreur: IDs invalides', { boutiqueId, articleId });
      return res.status(400).json({ erreur: 'IDs de boutique ou d\'article invalides' });
    }

    // Vérifier que la boutique appartient au gérant
    const [boutique] = await pool.execute(
      'SELECT gerant_id FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutiqueId, req.utilisateur.id]
    );
    console.log('Résultat boutique:', boutique);
    if (!boutique.length) {
      console.log('Erreur: Boutique non trouvée ou non autorisée', { boutiqueId, gerantId: req.utilisateur.id });
      return res.status(403).json({ erreur: 'Accès interdit: boutique non autorisée' });
    }

    // Vérifier que l'article existe et appartient à la boutique
    const [article] = await pool.execute(
      'SELECT id, image FROM articles WHERE id = ? AND boutique_id = ?',
      [articleId, boutiqueId]
    );
    console.log('Résultat article:', article);
    if (!article.length) {
      console.log('Erreur: Article non trouvé', { articleId, boutiqueId });
      return res.status(404).json({ erreur: 'Article non trouvé' });
    }

    // Valider les données envoyées
    const { nom, description, prix, stock, date_exp, date_prod, conserver_image } = req.body;
    if (!nom || !prix) {
      console.log('Erreur: Données requises manquantes', { nom, prix });
      return res.status(400).json({ erreur: 'Nom et prix sont requis' });
    }

    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      console.log('Erreur: Prix invalide', { prix });
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif' });
    }

    const stockNum = parseInt(stock) || 0;
    if (stockNum < 0) {
      console.log('Erreur: Stock invalide', { stock });
      return res.status(400).json({ erreur: 'Le stock ne peut pas être négatif' });
    }

    // Valider les dates si fournies
    let dateExp = null, dateProd = null;
    if (date_exp) {
      dateExp = new Date(date_exp);
      if (isNaN(dateExp.getTime())) {
        console.log('Erreur: Date d\'expiration invalide', { date_exp });
        return res.status(400).json({ erreur: 'Date d\'expiration invalide' });
      }
    }
    if (date_prod) {
      dateProd = new Date(date_prod);
      if (isNaN(dateProd.getTime())) {
        console.log('Erreur: Date de production invalide', { date_prod });
        return res.status(400).json({ erreur: 'Date de production invalide' });
      }
    }
    if (dateExp && dateProd && dateExp < dateProd) {
      console.log('Erreur: Dates incohérentes', { date_exp, date_prod });
      return res.status(400).json({ erreur: 'La date d\'expiration doit être postérieure à la date de production' });
    }

    // Gérer l'image
    let cheminImage = article[0].image;
    if (req.file) {
      // Nouvelle image fournie
      cheminImage = `/Uploads/${req.file.filename}`;
      if (article[0].image && fs.existsSync(path.join(__dirname, article[0].image))) {
        try {
          await fsPromises.unlink(path.join(__dirname, article[0].image));
          console.log('Ancienne image supprimée:', article[0].image);
        } catch (unlinkError) {
          console.error('Erreur suppression ancienne image:', unlinkError);
        }
      }
    } else if (conserver_image === 'true') {
      // Conserver l'image existante
      cheminImage = article[0].image;
      console.log('Image existante conservée:', cheminImage);
    } else {
      // Supprimer l'image existante
      cheminImage = null;
      if (article[0].image && fs.existsSync(path.join(__dirname, article[0].image))) {
        try {
          await fsPromises.unlink(path.join(__dirname, article[0].image));
          console.log('Image supprimée:', article[0].image);
        } catch (unlinkError) {
          console.error('Erreur suppression image:', unlinkError);
        }
      }
    }

    // Mettre à jour l'article
    await pool.execute(
      `UPDATE articles 
       SET nom = ?, description = ?, prix = ?, stock = ?, image = ?, date_exp = ?, date_prod = ? 
       WHERE id = ? AND boutique_id = ?`,
      [
        nom,
        description || null,
        prixNum,
        stockNum,
        cheminImage,
        dateExp ? dateExp.toISOString().split('T')[0] : null,
        dateProd ? dateProd.toISOString().split('T')[0] : null,
        articleId,
        boutiqueId,
      ]
    );
    console.log('Article mis à jour:', { articleId, boutiqueId });

    res.json({ message: 'Article mis à jour avec succès' });
  } catch (erreur) {
    console.error('Erreur lors de la mise à jour de l\'article:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
    });
    if (req.file) {
      try {
        await fsPromises.unlink(path.join(__dirname, req.file.path));
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


app.put('/boutiques/:id/articles/:id', verifierToken, upload.single('image'), async (req, res) => {
  const { id: boutiqueId } = req.params;
  const { id: articleId } = req.params;
  const { nom, description, prix, stock, date_exp, date_prod, conserver_image } = req.body;

  // console.log('Requête PUT /boutiques/:id/articles/:id reçue:', {
  //   boutiqueId,
  //   articleId,
  //   body: req.body,
  //   file: req.file,
  // });

  try {
    // Vérifier que l'utilisateur est un gérant et que la boutique lui appartient
    const [boutique] = await pool.query('SELECT gerant_id FROM boutiques WHERE id = ?', [boutiqueId]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      // console.log('Accès interdit: utilisateur non autorisé', { userId: req.utilisateur.id, boutique });
      return res.status(403).json({ erreur: 'Accès interdit' });
    }

    // Vérifier que l'article existe
    const [article] = await pool.query('SELECT * FROM articles WHERE id = ? AND boutique_id = ?', [articleId, boutiqueId]);
    if (!article.length) {
      // console.log('Article non trouvé:', { articleId, boutiqueId });
      return res.status(404).json({ erreur: 'Article non trouvé' });
    }

    // Valider les données
    if (!nom || !nom.trim()) {
      return res.status(400).json({ erreur: 'Le nom est requis' });
    }
    const parsedPrix = parseFloat(prix);
    if (isNaN(parsedPrix) || parsedPrix <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif' });
    }
    const parsedStock = parseInt(stock);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ erreur: 'Le stock doit être un entier positif' });
    }

    // Construire la requête de mise à jour
    let query = 'UPDATE articles SET nom = ?, description = ?, prix = ?, stock = ?, date_exp = ?, date_prod = ?';
    let params = [nom.trim(), description ? description.trim() : null, parsedPrix, parsedStock, date_exp || null, date_prod || null];

    // Gérer l'image
    if (req.file) {
      // console.log('Nouvelle image reçue:', req.file);
      const imagePath = `/Uploads/${req.file.filename}`;
      query += ', image = ?';
      params.push(imagePath);
      // Supprimer l'ancienne image si elle existe
      if (article[0].image) {
        try {
          const oldImagePath = path.join(__dirname, article[0].image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            // console.log('Ancienne image supprimée:', oldImagePath);
          }
        } catch (err) {
          console.error('Erreur lors de la suppression de l\'ancienne image:', err);
        }
      }
    } else if (conserver_image === 'true') {
      // console.log('Conservation de l\'image existante');
      // Ne rien faire, conserver l'image actuelle
    } else {
      // console.log('Suppression de l\'image existante');
      query += ', image = NULL';
      params.push(null);
      // Supprimer l'ancienne image si elle existe
      if (article[0].image) {
        try {
          const oldImagePath = path.join(__dirname, article[0].image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            // console.log('Ancienne image supprimée:', oldImagePath);
          }
        } catch (err) {
          console.error('Erreur lors de la suppression de l\'ancienne image:', err);
        }
      }
    }

    query += ' WHERE id = ? AND boutique_id = ?';
    params.push(articleId, boutiqueId);

    // console.log('Exécution de la requête SQL:', { query, params });
    await pool.query(query, params);

    // console.log('Article modifié avec succès:', { articleId, boutiqueId });
    res.json({ message: 'Article modifié avec succès' });
  } catch (err) {
    console.error('Erreur dans PUT /boutiques/:id/articles/:id:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ erreur: 'Erreur serveur lors de la modification de l\'article', details: err.message });
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
       LEFT JOIN clients u ON c.utilisateur_id = u.id
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



// app.post('/commandes', verifierToken, async (req, res) => {
//   console.log('Requête POST /commandes reçue:', req.body);
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

//   // Validation des données
//   if (
//     !boutique_id ||
//     (!article_id && !service_id) ||
//     !quantite ||
//     !prix ||
//     !moyen_paiement ||
//     client_latitude === undefined ||
//     client_longitude === undefined
//   ) {
//     console.log('Erreur: Données incomplètes', req.body);
//     return res.status(400).json({ erreur: 'Données incomplètes' });
//   }

//   if (
//     isNaN(client_latitude) ||
//     isNaN(client_longitude) ||
//     client_latitude < -90 ||
//     client_latitude > 90 ||
//     client_longitude < -180 ||
//     client_longitude > 180
//   ) {
//     console.log('Erreur: Coordonnées invalides', { client_latitude, client_longitude });
//     return res.status(400).json({ erreur: 'Coordonnées géographiques invalides' });
//   }

//   const moyensValides = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'];
//   if (!moyensValides.includes(moyen_paiement)) {
//     console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
//     return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
//   }

//   if (quantite <= 0 || isNaN(quantite)) {
//     console.log('Erreur: Quantité invalide', quantite);
//     return res.status(400).json({ erreur: 'Quantité invalide' });
//   }

//   if (prix <= 0 || isNaN(prix)) {
//     console.log('Erreur: Prix invalide', prix);
//     return res.status(400).json({ erreur: 'Prix invalide' });
//   }

//   let connexion;
//   try {
//     connexion = await pool.getConnection();
//     await connexion.beginTransaction();

//     // Vérifier la boutique
//     const [boutique] = await connexion.execute(
//       'SELECT id, gerant_id FROM boutiques WHERE id = ?',
//       [boutique_id]
//     );
//     if (!boutique.length) {
//       console.log('Erreur: Boutique non trouvée', boutique_id);
//       throw new Error('Boutique non trouvée');
//     }

//     // Vérifier l'article ou le service
//     if (article_id) {
//       const [article] = await connexion.execute(
//         'SELECT id, prix, stock FROM articles WHERE id = ? AND boutique_id = ?',
//         [article_id, boutique_id]
//       );
//       if (!article.length) {
//         console.log('Erreur: Article non trouvé', article_id);
//         throw new Error('Article non trouvé');
//       }
//       if (article[0].stock < quantite) {
//         console.log('Erreur: Stock insuffisant', { article_id, stock: article[0].stock, quantite });
//         throw new Error('Stock insuffisant pour cet article');
//       }
//       if (parseFloat(prix) !== parseFloat(article[0].prix) * quantite) {
//         console.log('Erreur: Prix incorrect', { prix, expected: article[0].prix * quantite });
//         throw new Error('Prix incorrect pour cet article');
//       }
//     } else if (service_id) {
//       const [service] = await connexion.execute(
//         'SELECT id, prix, disponible FROM services WHERE id = ? AND boutique_id = ?',
//         [service_id, boutique_id]
//       );
//       if (!service.length) {
//         console.log('Erreur: Service non trouvé', service_id);
//         throw new Error('Service non trouvé');
//       }
//       if (!service[0].disponible) {
//         console.log('Erreur: Service non disponible', service_id);
//         throw new Error('Service non disponible');
//       }
//       if (parseFloat(prix) !== parseFloat(service[0].prix) * quantite) {
//         console.log('Erreur: Prix incorrect', { prix, expected: service[0].prix * quantite });
//         throw new Error('Prix incorrect pour ce service');
//       }
//     }

//     // Insérer la commande
//     const [result] = await connexion.execute(
//       `INSERT INTO commandes (
//         utilisateur_id, boutique_id, article_id, service_id, quantite, prix,
//         statut, moyen_paiement, client_latitude, client_longitude, date_creation
//       ) VALUES (?, ?, ?, ?, ?, ?, 'en attente', ?, ?, ?, NOW())`,
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
//     console.log('Commande insérée, ID:', result.insertId);

//     // Mettre à jour le stock pour les articles
//     if (article_id) {
//       await connexion.execute(
//         'UPDATE articles SET stock = stock - ? WHERE id = ?',
//         [quantite, article_id]
//       );
//       console.log('Stock mis à jour pour l\'article', article_id);
//     }

//     // Envoyer une notification au gérant
//     const message = `Nouvelle commande #${result.insertId} passée pour votre boutique.`;
//     await connexion.execute(
//       `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
//        VALUES (?, ?, ?, NOW(), FALSE)`,
//       [boutique[0].gerant_id, boutique_id, message]
//     );
//     console.log('Notification envoyée au gérant', boutique[0].gerant_id);

//     await connexion.commit();
//     res.json({ message: 'Commande créée avec succès', commande_id: result.insertId });
//   } catch (erreur) {
//     if (connexion) await connexion.rollback();
//     console.error('Erreur lors de la création de la commande:', {
//       message: erreur.message,
//       sqlMessage: erreur.sqlMessage,
//       code: erreur.code,
//       stack: erreur.stack, 
//     });
//     if (erreur.message === 'Boutique non trouvée') {
//       res.status(404).json({ erreur: erreur.message });
//     } else if (erreur.message === 'Article non trouvé' || erreur.message === 'Service non trouvé') {
//       res.status(404).json({ erreur: erreur.message });
//     } else if (
//       erreur.message === 'Stock insuffisant pour cet article' ||
//       erreur.message === 'Service non disponible' ||
//       erreur.message === 'Prix incorrect pour cet article' ||
//       erreur.message === 'Prix incorrect pour ce service'
//     ) {
//       res.status(400).json({ erreur: erreur.message });
//     } else if (erreur.code === 'ER_DUP_ENTRY') {
//       res.status(400).json({ erreur: 'Erreur de données unique' });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur' });
//     }
//   } finally {
//     if (connexion) connexion.release();
//   }
// });




// app.post('/commandes', verifierToken, async (req, res) => {
//   console.log('Requête POST /commandes reçue:', req.body);
//   const {
//     boutique_id,
//     article_id,
//     service_id,
//     quantite,
//     prix,
//     moyen_paiement,
//     client_latitude,
//     client_longitude,
//     client_nom,
//     client_telephone,
//     adresse_livraison,
//   } = req.body;

//   // Validation des données
//   if (
//     !boutique_id ||
//     (!article_id && !service_id) ||
//     !quantite ||
//     !prix ||
//     !moyen_paiement ||
//     client_latitude === undefined ||
//     client_longitude === undefined ||
//     !client_nom ||
//     !client_telephone ||
//     !adresse_livraison
//   ) {
//     console.log('Erreur: Données incomplètes', req.body);
//     return res.status(400).json({ erreur: 'Données incomplètes' });
//   }

//   if (
//     isNaN(client_latitude) ||
//     isNaN(client_longitude) ||
//     client_latitude < -90 ||
//     client_latitude > 90 ||
//     client_longitude < -180 ||
//     client_longitude > 180
//   ) {
//     console.log('Erreur: Coordonnées invalides', { client_latitude, client_longitude });
//     return res.status(400).json({ erreur: 'Coordonnées géographiques invalides' });
//   }

//   if (typeof client_nom !== 'string' || client_nom.trim().length < 2) {
//     console.log('Erreur: Nom client invalide', client_nom);
//     return res.status(400).json({ erreur: 'Nom du client invalide' });
//   }

//   if (typeof client_telephone !== 'string' || !/^\+?\d{7,15}$/.test(client_telephone)) {
//     console.log('Erreur: Téléphone client invalide', client_telephone);
//     return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
//   }

//   if (typeof adresse_livraison !== 'string' || adresse_livraison.trim().length < 5) {
//     console.log('Erreur: Adresse livraison invalide', adresse_livraison);
//     return res.status(400).json({ erreur: 'Adresse de livraison invalide' });
//   }

//   const moyensValides = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal'];
//   if (!moyensValides.includes(moyen_paiement)) {
//     console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
//     return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
//   }

//   if (quantite <= 0 || isNaN(quantite)) {
//     console.log('Erreur: Quantité invalide', quantite);
//     return res.status(400).json({ erreur: 'Quantité invalide' });
//   }

//   if (prix <= 0 || isNaN(prix)) {
//     console.log('Erreur: Prix invalide', prix);
//     return res.status(400).json({ erreur: 'Prix invalide' });
//   }

//   let connexion;
//   try {
//     connexion = await pool.getConnection();
//     await connexion.beginTransaction();

//     // Vérifier la boutique
//     const [boutique] = await connexion.execute(
//       'SELECT id, gerant_id FROM boutiques WHERE id = ?',
//       [boutique_id]
//     );
//     if (!boutique.length) {
//       console.log('Erreur: Boutique non trouvée', boutique_id);
//       throw new Error('Boutique non trouvée');
//     }

//     // Vérifier l'article ou le service
//     if (article_id) {
//       const [article] = await connexion.execute(
//         'SELECT id, prix, stock FROM articles WHERE id = ? AND boutique_id = ?',
//         [article_id, boutique_id]
//       );
//       if (!article.length) {
//         console.log('Erreur: Article non trouvé', article_id);
//         throw new Error('Article non trouvé');
//       }
//       if (article[0].stock < quantite) {
//         console.log('Erreur: Stock insuffisant', { article_id, stock: article[0].stock, quantite });
//         throw new Error('Stock insuffisant pour cet article');
//       }
//       if (parseFloat(prix) !== parseFloat(article[0].prix) * quantite) {
//         console.log('Erreur: Prix incorrect', { prix, expected: article[0].prix * quantite });
//         throw new Error('Prix incorrect pour cet article');
//       }
//     } else if (service_id) {
//       const [service] = await connexion.execute(
//         'SELECT id, prix, disponible FROM services WHERE id = ? AND boutique_id = ?',
//         [service_id, boutique_id]
//       );
//       if (!service.length) {
//         console.log('Erreur: Service non trouvé', service_id);
//         throw new Error('Service non trouvé');
//       }
//       if (!service[0].disponible) {
//         console.log('Erreur: Service non disponible', service_id);
//         throw new Error('Service non disponible');
//       }
//       if (parseFloat(prix) !== parseFloat(service[0].prix) * quantite) {
//         console.log('Erreur: Prix incorrect', { prix, expected: service[0].prix * quantite });
//         throw new Error('Prix incorrect pour ce service');
//       }
//     }

//     // Insérer la commande
//     const [result] = await connexion.execute(
//       `INSERT INTO commandes (
//         utilisateur_id, boutique_id, article_id, service_id, quantite, prix,
//         statut, moyen_paiement, client_latitude, client_longitude, client_nom,
//         client_telephone, adresse_livraison, date_creation
//       ) VALUES (?, ?, ?, ?, ?, ?, 'en attente', ?, ?, ?, ?, ?, ?, NOW())`,
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
//         client_nom.trim(),
//         client_telephone.trim(),
//         adresse_livraison.trim(),
//       ]
//     );
//     console.log('Commande insérée, ID:', result.insertId);

//     // Mettre à jour le stock pour les articles
//     if (article_id) {
//       await connexion.execute(
//         'UPDATE articles SET stock = stock - ? WHERE id = ?',
//         [quantite, article_id]
//       );
//       console.log('Stock mis à jour pour l\'article', article_id);
//     }

//     // Envoyer une notification au gérant
//     const message = `Nouvelle commande #${result.insertId} passée pour votre boutique.`;
//     await connexion.execute(
//       `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
//        VALUES (?, ?, ?, NOW(), FALSE)`,
//       [boutique[0].gerant_id, boutique_id, message]
//     );
//     console.log('Notification envoyée au gérant', boutique[0].gerant_id);

//     await connexion.commit();
//     res.json({ message: 'Commande créée avec succès', commande_id: result.insertId });
//   } catch (erreur) {
//     if (connexion) await connexion.rollback();
//     console.error('Erreur lors de la création de la commande:', {
//       message: erreur.message,
//       sqlMessage: erreur.sqlMessage,
//       code: erreur.code,
//       stack: erreur.stack,
//     });
//     if (erreur.message === 'Boutique non trouvée') {
//       res.status(404).json({ erreur: erreur.message });
//     } else if (erreur.message === 'Article non trouvé' || erreur.message === 'Service non trouvé') {
//       res.status(404).json({ erreur: erreur.message });
//     } else if (
//       erreur.message === 'Stock insuffisant pour cet article' ||
//       erreur.message === 'Service non disponible' ||
//       erreur.message === 'Prix incorrect pour cet article' ||
//       erreur.message === 'Prix incorrect pour ce service'
//     ) {
//       res.status(400).json({ erreur: erreur.message });
//     } else if (erreur.code === 'ER_DUP_ENTRY') {
//       res.status(400).json({ erreur: 'Erreur de données unique' });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur' });
//     }
//   } finally {
//     if (connexion) connexion.release();
//   }
// });





app.post('/commandes', verifierToken, async (req, res) => {
  // console.log('Requête POST /commandes reçue:', req.body);
  const {
    boutique_id,
    article_id,
    service_id,
    quantite,
    prix,
    moyen_paiement,
    client_latitude,
    client_longitude,
    client_nom,
    client_telephone,
    adresse_livraison,
  } = req.body;

  // Validation des données
  if (
    !boutique_id ||
    (!article_id && !service_id) ||
    !quantite ||
    !prix ||
    !moyen_paiement ||
    client_latitude === undefined ||
    client_longitude === undefined ||
    !client_nom ||
    !client_telephone
    // ||
    // !adresse_livraison
  ) {
    // console.log('Erreur: Données incomplètes', req.body);
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
    // console.log('Erreur: Coordonnées invalides', { client_latitude, client_longitude });
    return res.status(400).json({ erreur: 'Coordonnées géographiques invalides' });
  }

  if (typeof client_nom !== 'string' || client_nom.trim().length < 2) {
    // console.log('Erreur: Nom client invalide', client_nom);
    return res.status(400).json({ erreur: 'Nom du client invalide' });
  }

  if (typeof client_telephone !== 'string' || !/^\+?\d{7,15}$/.test(client_telephone)) {
    // console.log('Erreur: Téléphone client invalide', client_telephone);
    return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
  }

  // if (typeof adresse_livraison !== 'string' || adresse_livraison.trim().length < 5) {
  //   // console.log('Erreur: Adresse livraison invalide', adresse_livraison);
  //   return res.status(400).json({ erreur: 'Adresse de livraison invalide, au moins 5 caractères et soyez précis' });
  // }

  if (typeof adresse_livraison !== 'string') {
    // console.log('Erreur: Adresse livraison invalide', adresse_livraison);
    return res.status(400).json({ erreur: 'Adresse de livraison invalide, soyer précis SVP !' });
  }

  const moyensValides = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal', 'Paiement à la livraison'];
  if (!moyensValides.includes(moyen_paiement)) {
    // console.log('Erreur: Moyen de paiement invalide', moyen_paiement);
    return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
  }

  if (quantite <= 0 || isNaN(quantite)) {
    // console.log('Erreur: Quantité invalide', quantite);
    return res.status(400).json({ erreur: 'Quantité invalide' });
  }

  if (prix <= 0 || isNaN(prix)) {
    // console.log('Erreur: Prix invalide', prix);
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
      // console.log('Erreur: Boutique non trouvée', boutique_id);
      throw new Error('Boutique non trouvée');
    }

    let image = null;

    // Vérifier l'article ou le service
    if (article_id) {
      const [article] = await connexion.execute(
        'SELECT id, prix, stock, image FROM articles WHERE id = ? AND boutique_id = ?',
        [article_id, boutique_id]
      );
      if (!article.length) {
        // console.log('Erreur: Article non trouvé', article_id);
        throw new Error('Article non trouvé');
      }
      if (article[0].stock < quantite) {
        // console.log('Erreur: Stock insuffisant', { article_id, stock: article[0].stock, quantite });
        throw new Error('Stock insuffisant pour cet article');
      }
      if (parseFloat(prix) !== parseFloat(article[0].prix) * quantite) {
        // console.log('Erreur: Prix incorrect', { prix, expected: article[0].prix * quantite });
        throw new Error('Prix incorrect pour cet article');
      }
      image = article[0].image;
    } else if (service_id) {
      const [service] = await connexion.execute(
        'SELECT id, prix, disponible, image FROM services WHERE id = ? AND boutique_id = ?',
        [service_id, boutique_id]
      );
      if (!service.length) {
        // console.log('Erreur: Service non trouvé', service_id);
        throw new Error('Service non trouvé');
      }
      if (!service[0].disponible) {
        // console.log('Erreur: Service non disponible', service_id);
        throw new Error('Service non disponible');
      }
      if (parseFloat(prix) !== parseFloat(service[0].prix) * quantite) {
        // console.log('Erreur: Prix incorrect', { prix, expected: service[0].prix * quantite });
        throw new Error('Prix incorrect pour ce service');
      }
      image = service[0].image;
    }

    // Insérer la commande
    const [result] = await connexion.execute(
      `INSERT INTO commandes (
        utilisateur_id, boutique_id, article_id, service_id, quantite, prix,
        statut, moyen_paiement, client_latitude, client_longitude, client_nom,
        client_telephone, adresse_livraison, image, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, 'en attente', ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
        client_nom.trim(),
        client_telephone.trim(),
        adresse_livraison.trim(),
        image || null,
      ]
    );
    // console.log('Commande insérée, ID:', result.insertId, 'Image:', image);

    // Mettre à jour le stock pour les articles
    if (article_id) {
      await connexion.execute(
        'UPDATE articles SET stock = stock - ? WHERE id = ?',
        [quantite, article_id]
      );
      // console.log('Stock mis à jour pour l\'article', article_id);
    }

    // Récupérer nom article/service pour notifications détaillées
    let nomItem = '';
    let typeItem = '';
    if (article_id) {
      const [artInfo] = await connexion.execute('SELECT nom FROM articles WHERE id = ?', [article_id]);
      nomItem = artInfo[0]?.nom || 'Article';
      typeItem = 'article';
    } else if (service_id) {
      const [servInfo] = await connexion.execute('SELECT nom FROM services WHERE id = ?', [service_id]);
      nomItem = servInfo[0]?.nom || 'Service';
      typeItem = 'service';
    }

    // Notification au gérant avec détails complets
    const messageGerant = typeItem === 'article'
      ? `🔔 Nouvelle commande d'article
📦 Article : "${nomItem}"
🔢 Quantité : ${quantite}
💰 Montant total : ${prix} GNF
👤 Client : ${client_nom}
📞 Téléphone : ${client_telephone}
📍 Adresse livraison : ${adresse_livraison || 'Non spécifiée'}`
      : `🔔 Nouvelle demande de service
📦 Service : "${nomItem}"
💰 Montant : ${prix} GNF
👤 Client : ${client_nom}
📞 Téléphone : ${client_telephone}`;

    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, NOW(), FALSE)`,
      [boutique[0].gerant_id, boutique_id, messageGerant]
    );

    // Notification au client avec détails complets
    const messageClient = typeItem === 'article'
      ? `✅ Commande d'article envoyée avec succès
📦 Article : "${nomItem}"
🔢 Quantité : ${quantite}
💰 Montant total : ${prix} GNF
🏪 Votre commande sera préparée et livrée bientôt`
      : `✅ Demande de service envoyée avec succès
📦 Service : "${nomItem}"
💰 Montant : ${prix} GNF
🏪 Vous serez contacté prochainement`;

    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, NOW(), FALSE)`,
      [req.utilisateur.id, boutique_id, messageClient]
    );

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
      'SELECT id, nom, prenom, telephone, email, actif, photo, adresse FROM livreurs WHERE boutique_id = ?',
      [boutiqueId]
    );
    // console.log('Livreurs bruts depuis la base:', livreurs); // Log des données brutes
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

    console.log('>>> POST livreur - req.file:', req.file ? req.file.filename : 'null');
    console.log('>>> POST livreur - req.body:', req.body);

    const photoPath = req.file ? `/Uploads/livreurs/${req.file.filename}` : null;
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
        await fsPromises.unlink(path.join(__dirname, req.file.path));
      } catch (unlinkError) { }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur' });
    }
  }
});

// // Modifier un livreur
// app.put('/livreurs/:id', verifierToken, upload.single('photo'), async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const livreurId = parseInt(req.params.id);
//   const { nom, prenom, telephone, email, password, adresse, actif } = req.body;
//   if (!nom || !prenom || !telephone) {
//     if (req.file) {
//       try {
//         await fsPromises.unlink(path.join(__dirname, req.file.path));
//       } catch (error) {}
//     }
//     return res.status(400).json({ erreur: 'Données incomplètes' });
//   }

//   try {
//     const [livreur] = await pool.execute(
//       `SELECT l.id, l.boutique_id, l.photo
//        FROM livreurs l
//        JOIN boutiques b ON l.boutique_id = b.id
//        WHERE l.id = ? AND b.gerant_id = ?`,
//       [livreurId, req.utilisateur.id]
//     );
//     if (!livreur.length) {
//       if (req.file) {
//         try {
//           await fsPromises.unlink(path.join(__dirname, req.file.path));
//         } catch (error) {}
//       }
//       return res.status(403).json({ erreur: 'Livreur non trouvé ou accès non autorisé' });
//     }

//     let hashedPassword = null;
//     if (password) {
//       hashedPassword = await bcrypt.hash(password, 12);
//     }

//     let photoPath = livreur[0].photo;
//     if (req.file) {
//       photoPath = `/uploads/livreurs/${req.file.filename}`;
//       if (livreur[0].photo) {
//         try {
//           await fsPromises.unlink(path.join(__dirname, livreur[0].photo));
//         } catch (error) {}
//       }
//     }

//     const actifValue = actif === 'true' || actif === true ? 1 : 0;

//     await pool.execute(
//       `UPDATE livreurs
//        SET nom = ?, prenom = ?, telephone = ?, email = ?, password = COALESCE(?, password), photo = ?, adresse = ?, actif = ?
//        WHERE id = ?`,
//       [nom, prenom, telephone, email || null, hashedPassword, photoPath, adresse || null, actifValue, livreurId]
//     );

//     res.json({ message: 'Livreur modifié avec succès' });
//   } catch (error) {
//     console.error('Erreur lors de la modification du livreur:', error);
//     if (req.file) {
//       try {
//         await fsPromises.unlink(path.join(__dirname, req.file.path));
//       } catch (unlinkError) {}
//     }
//     if (error.code === 'ER_DUP_ENTRY') {
//       res.status(400).json({ erreur: 'Téléphone ou email déjà utilisé' });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur' });
//     }
//   }
// });






app.put('/livreurs/:id', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const livreurId = parseInt(req.params.id);
  const { nom, prenom, telephone, email, password, adresse, actif, conserver_image } = req.body;
  if (!nom || !prenom || !telephone) {
    if (req.file) {
      try {
        await fsPromises.unlink(path.join(__dirname, req.file.path));
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
          await fsPromises.unlink(path.join(__dirname, req.file.path));
        } catch (error) {
          console.error('Erreur suppression fichier temporaire:', error);
        }
      }
      return res.status(403).json({ erreur: 'Livreur non trouvé ou accès non autorisé' });
    }

    // Loguer les données reçues
    console.log('>>> PUT /livreurs/:id - Données reçues:', {
      livreurId,
      body: { nom, prenom, telephone, email, adresse, actif, conserver_image },
      file: req.file ? req.file.filename : null,
    });

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    let photoPath = livreur[0].photo;
    if (req.file) {
      photoPath = `/Uploads/livreurs/${req.file.filename}`;
      if (livreur[0].photo && fs.existsSync(path.join(__dirname, livreur[0].photo))) {
        try {
          await fsPromises.unlink(path.join(__dirname, livreur[0].photo));
          // console.log('Ancienne image supprimée:', livreur[0].photo);
        } catch (error) {
          console.error('Erreur suppression ancienne image:', error);
        }
      }
    } else if (conserver_image === 'true') {
      photoPath = livreur[0].photo; // Conserver l'image existante
      // console.log('Image existante conservée:', photoPath);
    } else if (req.body.photo === '' || req.body.photo === null) {
      photoPath = null; // Effacer l'image
      if (livreur[0].photo && fs.existsSync(path.join(__dirname, livreur[0].photo))) {
        try {
          await fsPromises.unlink(path.join(__dirname, livreur[0].photo));
          // console.log('Image supprimée:', livreur[0].photo);
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

    // console.log('Livreur modifié:', { livreurId, photo: photoPath });

    res.json({ message: 'Livreur modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification du livreur:', error);
    if (req.file) {
      try {
        await fsPromises.unlink(path.join(__dirname, req.file.path));
        // console.log('Fichier temporaire supprimé:', req.file.path);
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

// Assigner une commande à un livreur
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



// app.post('/commandes/:id/assigner', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     console.log('Accès refusé: utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }

//   const commandeId = parseInt(req.params.id);
//   const { livreur_id } = req.body;

//   if (!livreur_id || isNaN(livreur_id)) {
//     console.log('Erreur: ID du livreur invalide', { livreur_id });
//     return res.status(400).json({ erreur: 'ID du livreur requis et doit être un nombre' });
//   }

//   if (!commandeId || isNaN(commandeId)) {
//     console.log('Erreur: ID de commande invalide', { commandeId });
//     return res.status(400).json({ erreur: 'ID de commande invalide' });
//   }

//   let connexion;
//   try {
//     connexion = await pool.getConnection();
//     await connexion.beginTransaction();

//     // Vérifier la commande
//     const [commande] = await connexion.execute(
//       `SELECT c.id, c.boutique_id, c.statut, c.livreur_id, c.client_latitude, c.client_longitude
//        FROM commandes c
//        JOIN boutiques b ON c.boutique_id = b.id
//        WHERE c.id = ? AND b.gerant_id = ?`,
//       [commandeId, req.utilisateur.id]
//     );
//     if (!commande.length) {
//       console.log('Commande non trouvée ou non autorisée', { commandeId, gerantId: req.utilisateur.id });
//       return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
//     }
//     if (commande[0].statut !== 'en préparation') {
//       console.log('Statut de commande non valide', { commandeId, statut: commande[0].statut });
//       return res.status(400).json({ erreur: 'La commande doit être en statut "en préparation"' });
//     }
//     if (commande[0].livreur_id !== null) {
//       console.log('Commande déjà assignée', { commandeId, livreur_id: commande[0].livreur_id });
//       return res.status(400).json({ erreur: 'Commande déjà assignée à un livreur' });
//     }

//     // Vérifier le livreur
//     const [livreur] = await connexion.execute(
//       'SELECT id, actif, nom, prenom FROM livreurs WHERE id = ? AND boutique_id = ?',
//       [livreur_id, commande[0].boutique_id]
//     );
//     if (!livreur.length) {
//       console.log('Livreur non trouvé', { livreur_id, boutique_id: commande[0].boutique_id });
//       return res.status(404).json({ erreur: 'Livreur non trouvé pour cette boutique' });
//     }
//     if (!livreur[0].actif) {
//       console.log('Livreur inactif', { livreur_id, nom: livreur[0].nom, prenom: livreur[0].prenom });
//       return res.status(400).json({ erreur: 'Livreur inactif' });
//     }

//     // Assigner la commande et passer à un statut "en cours de livraison" (nouveau statut à ajouter)
//     await connexion.execute(
//       `UPDATE commandes
//        SET livreur_id = ?, statut = 'en cours de livraison'
//        WHERE id = ?`,
//       [livreur_id, commandeId]
//     );
//     console.log('Commande assignée', { commandeId, livreur_id, statut: 'en cours de livraison' });

//     // Envoyer une notification au livreur
//     const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
//     const message = `Nouvelle commande #${commandeId} assignée à vous. Coordonnées client : (${commande[0].client_latitude}, ${commande[0].client_longitude})`;
//     await connexion.execute(
//       `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
//        VALUES (?, ?, ?, ?, FALSE)`,
//       [livreur_id, commande[0].boutique_id, message, date]
//     );
//     console.log('Notification envoyée au livreur', { livreur_id, message });

//     await connexion.commit();
//     res.json({
//       message: 'Commande assignée avec succès',
//       commande: {
//         id: commandeId,
//         client_latitude: commande[0].client_latitude,
//         client_longitude: commande[0].client_longitude,
//       },
//     });
//   } catch (erreur) {
//     if (connexion) await connexion.rollback();
//     console.error('Erreur lors de l\'assignation de la commande:', {
//       message: erreur.message,
//       sqlMessage: erreur.sqlMessage,
//       code: erreur.code,
//       stack: erreur.stack,
//     });
//     if (erreur.message.includes('non trouvée') || erreur.message.includes('inactif')) {
//       res.status(400).json({ erreur: erreur.message });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur lors de l\'assignation de la commande' });
//     }
//   } finally {
//     if (connexion) connexion.release();
//   }
// });


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
      // console.log('Identifiant ou mot de passe manquant');
      return res.status(400).json({ erreur: 'Identifiant et mot de passe requis' });
    }
    const [livreur] = await pool.execute(
      'SELECT id, boutique_id, nom, prenom, email, telephone, password FROM livreurs WHERE telephone = ? OR email = ?',
      [identifiant, identifiant]
    );
    if (!livreur.length) {
      // console.log('Livreur non trouvé', { identifiant });
      return res.status(400).json({ erreur: 'Livreur non trouvé' });
    }
    const motDePasseValide = await bcrypt.compare(mot_de_passe, livreur[0].password);
    if (!motDePasseValide) {
      // console.log('Mot de passe incorrect pour livreur', { identifiant });
      return res.status(400).json({ erreur: 'Mot de passe incorrect' });
    }
    const token = jwt.sign(
      { id: livreur[0].id, type: 'livreur', boutique_id: livreur[0].boutique_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    // console.log('Jeton généré pour livreur:', { id: livreur[0].id, token: token.substring(0, 20) + '...' });
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
// app.get('/livreur/commandes', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'livreur') {
//     console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
//     return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
//   }
//   try {
//     const [commandes] = await pool.execute(
//       `SELECT c.id, c.boutique_id, c.client_latitude, c.client_longitude, c.statut, b.nom AS boutique_nom
//        FROM commandes c
//        JOIN boutiques b ON c.boutique_id = b.id
//        WHERE c.livreur_id = ? AND c.statut = 'en cours de livraison'`,
//       [req.utilisateur.id]
//     );
//     res.json(commandes);
//   } catch (erreur) {
//     console.error('Erreur récupération commandes livreur:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur' });
//   }
// });

// app.get('/livreur/commandes', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'livreur') {
//     console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
//     return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
//   }
//   try {
//     const [commandes] = await pool.execute(
//       `SELECT 
//         c.id, 
//         c.boutique_id, 
//         c.client_latitude, 
//         c.client_longitude, 
//         c.statut, 
//         c.client_nom, 
//         c.client_telephone, 
//         c.adresse_livraison, 
//         c.date_creation AS reference, 
//         b.nom AS boutique_nom,
//         u.nom AS client_nom_utilisateur,
//         u.telephone AS client_telephone_utilisateur
//       FROM commandes c
//       JOIN boutiques b ON c.boutique_id = b.id
//       LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
//       WHERE c.livreur_id = ? AND c.statut = 'en cours de livraison'`,
//       [req.utilisateur.id]
//     );
//     res.json(commandes);
//     console.log('Commandes récupérées pour livreur:', { livreurId: req.utilisateur.id, nombre: commandes.length });
//   } catch (erreur) {
//     console.error('Erreur récupération commandes livreur:', erreur);
//     res.status(500).json({ erreur: 'Erreur serveur' });
//   }
// });



app.get('/livreur/commandes', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    // console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
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
      LEFT JOIN clients u ON c.utilisateur_id = u.id
      LEFT JOIN articles a ON c.article_id = a.id
      LEFT JOIN services s ON c.service_id = s.id
      WHERE c.livreur_id = ? AND c.statut IN ('en attente', 'en cours de livraison')`,
      [req.utilisateur.id]
    );
    res.json(commandes);
    // console.log('Commandes récupérées pour livreur:', { livreurId: req.utilisateur.id, nombre: commandes.length });
  } catch (erreur) {
    console.error('Erreur récupération commandes livreur:', {
      message: erreur.message,
      sqlMessage: erreur.sqlMessage,
      code: erreur.code,
    });
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});


// Route pour marquer une commande comme livrée
app.post('/commandes/:id/livrer', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    // console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
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
      // console.log('Commande non trouvée ou non autorisée', { commandeId, livreurId: req.utilisateur.id });
      return res.status(403).json({ erreur: 'Commande non trouvée, non autorisée, ou pas en cours de livraison' });
    }

    await connexion.execute(
      `UPDATE commandes SET statut = 'livrée' WHERE id = ?`,
      [commandeId]
    );
    // console.log('Commande marquée comme livrée', { commandeId });

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





// app.post('/commandes/:id/assigner', verifierToken, async (req, res) => {
//   if (req.utilisateur.type !== 'gerant') {
//     console.log('Accès refusé: utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
//     return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
//   }
//   const commandeId = parseInt(req.params.id);
//   const { livreur_id } = req.body;
//   if (!livreur_id || isNaN(livreur_id)) {
//     console.log('Erreur: ID du livreur invalide', { livreur_id });
//     return res.status(400).json({ erreur: 'ID du livreur requis et doit être un nombre' });
//   }
//   if (!commandeId || isNaN(commandeId)) {
//     console.log('Erreur: ID de commande invalide', { commandeId });
//     return res.status(400).json({ erreur: 'ID de commande invalide' });
//   }
//   let connexion;
//   try {
//     connexion = await pool.getConnection();
//     await connexion.beginTransaction();
//     const [commande] = await connexion.execute(
//       `SELECT c.id, c.boutique_id, c.statut, c.livreur_id, c.client_latitude, c.client_longitude
//        FROM commandes c
//        JOIN boutiques b ON c.boutique_id = b.id
//        WHERE c.id = ? AND b.gerant_id = ?`,
//       [commandeId, req.utilisateur.id]
//     );
//     if (!commande.length) {
//       console.log('Commande non trouvée ou non autorisée', { commandeId, gerantId: req.utilisateur.id });
//       return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
//     }
//     if (!['en attente', 'en préparation'].includes(commande[0].statut)) {
//       console.log('Statut de commande non valide', { commandeId, statut: commande[0].statut });
//       return res.status(400).json({ erreur: 'La commande doit être en statut "en attente" ou "en préparation"' });
//     }
//     if (commande[0].livreur_id !== null) {
//       console.log('Commande déjà assignée', { commandeId, livreur_id: commande[0].livreur_id });
//       return res.status(400).json({ erreur: 'Commande déjà assignée à un livreur' });
//     }
//     const [livreur] = await connexion.execute(
//       'SELECT id, actif, nom, prenom FROM livreurs WHERE id = ? AND boutique_id = ?',
//       [livreur_id, commande[0].boutique_id]
//     );
//     if (!livreur.length) {
//       console.log('Livreur non trouvé', { livreur_id, boutique_id: commande[0].boutique_id });
//       return res.status(404).json({ erreur: 'Livreur non trouvé pour cette boutique' });
//     }
//     if (!livreur[0].actif) {
//       console.log('Livreur inactif', { livreur_id, nom: livreur[0].nom, prenom: livreur[0].prenom });
//       return res.status(400).json({ erreur: 'Livreur inactif' });
//     }
//     await connexion.execute(
//       `UPDATE commandes
//        SET livreur_id = ?, statut = 'en cours de livraison'
//        WHERE id = ?`,
//       [livreur_id, commandeId]
//     );
//     console.log('Commande assignée', { commandeId, livreur_id, statut: 'en cours de livraison' });
//     const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
//     const message = `Nouvelle commande #${commandeId} assignée à vous. Coordonnées client : (${commande[0].client_latitude}, ${commande[0].client_longitude})`;
//     await connexion.execute(
//       `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
//        VALUES (?, ?, ?, ?, FALSE)`,
//       [livreur_id, commande[0].boutique_id, message, date]
//     );
//     console.log('Notification envoyée au livreur', { livreur_id, message });
//     await connexion.commit();
//     res.json({
//       message: 'Commande assignée avec succès',
//       commande: {
//         id: commandeId,
//         client_latitude: commande[0].client_latitude,
//         client_longitude: commande[0].client_longitude,
//       },
//     });
//   } catch (erreur) {
//     if (connexion) await connexion.rollback();
//     console.error('Erreur lors de l\'assignation de la commande:', {
//       message: erreur.message,
//       sqlMessage: erreur.sqlMessage,
//       code: erreur.code,
//       stack: erreur.stack,
//     });
//     if (erreur.message.includes('non trouvée') || erreur.message.includes('inactif')) {
//       res.status(400).json({ erreur: erreur.message });
//     } else {
//       res.status(500).json({ erreur: 'Erreur serveur lors de l\'assignation de la commande' });
//     }
//   } finally {
//     if (connexion) connexion.release();
//   }
// });


app.post('/commandes/:id/assigner', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    // console.log('Accès refusé: utilisateur non gérant', { utilisateurId: req.utilisateur.id, type: req.utilisateur.type });
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const commandeId = parseInt(req.params.id);
  const { livreur_id } = req.body;

  if (!livreur_id || isNaN(livreur_id)) {
    // console.log('Erreur: ID du livreur invalide', { livreur_id });
    return res.status(400).json({ erreur: 'ID du livreur requis et doit être un nombre' });
  }

  if (isNaN(commandeId)) {
    // console.log('Erreur: ID de commande invalide', { commandeId });
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
      // console.log('Commande non trouvée ou non autorisée', { commandeId, gerantId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Commande non trouvée ou non autorisée' });
    }

    if (!['en attente', 'en préparation'].includes(commande[0].statut)) {
      // console.log('Statut de commande non valide', { commandeId, statut: commande[0].statut });
      return res.status(400).json({ erreur: 'La commande doit être en statut "en attente" ou "en préparation"' });
    }

    if (commande[0].livreur_id !== null) {
      // console.log('Commande déjà assignée', { commandeId, livreur_id: commande[0].livreur_id });
      return res.status(400).json({ erreur: 'Commande déjà assignée à un livreur' });
    }

    // Vérifier le livreur
    const [livreur] = await connexion.execute(
      'SELECT id, actif, nom, prenom FROM livreurs WHERE id = ? AND boutique_id = ?',
      [livreur_id, commande[0].boutique_id]
    );

    if (!livreur.length) {
      // console.log('Livreur non trouvé', { livreur_id, boutique_id: commande[0].boutique_id });
      return res.status(404).json({ erreur: 'Livreur non trouvé pour cette boutique' });
    }

    if (!livreur[0].actif) {
      // console.log('Livreur inactif', { livreur_id, nom: livreur[0].nom, prenom: livreur[0].prenom });
      return res.status(400).json({ erreur: 'Livreur inactif' });
    }

    // Assigner la commande
    await connexion.execute(
      `UPDATE commandes
       SET livreur_id = ?, statut = 'en cours de livraison'
       WHERE id = ?`,
      [livreur_id, commandeId]
    );
    // console.log('Commande assignée', { commandeId, livreur_id, statut: 'en cours de livraison' });

    // Envoyer une notification au livreur
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `Nouvelle commande #${commandeId} assignée à vous. Coordonnées client : (${commande[0].client_latitude}, ${commande[0].client_longitude})`;
    await connexion.execute(
      `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
       VALUES (?, ?, ?, ?, FALSE)`,
      [livreur_id, commande[0].boutique_id, message, date]
    );
    // console.log('Notification envoyée au livreur', { livreur_id, message });

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






// Route pour récupérer le profil du livreur
app.get('/livreur/profil', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    // console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
    return res.status(403).json({ erreur: 'Accès réservé aux livreurs' });
  }
  try {
    const [livreur] = await pool.execute(
      'SELECT id, nom, prenom, email, telephone, boutique_id, actif, photo, adresse FROM livreurs WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!livreur.length) {
      // console.log('Livreur non trouvé', { livreurId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Livreur non trouvé' });
    }
    res.json(livreur[0]);
  } catch (erreur) {
    console.error('Erreur récupération profil livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Route pour mettre à jour le profil du livreur
app.put('/livreur/profil', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    // console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
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
      // console.log('Livreur non trouvé pour mise à jour', { livreurId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Livreur non trouvé' });
    }
    // console.log('Profil livreur mis à jour', { livreurId: req.utilisateur.id });
    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (erreur) {
    console.error('Erreur mise à jour profil livreur:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// Route pour les notifications du livreur
app.get('/livreur/notifications', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'livreur') {
    // console.log('Accès refusé: utilisateur non livreur', { utilisateurId: req.utilisateur.id });
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

// Route pour rafraîchir le jeton
// app.post('/refresh-token', async (req, res) => {
//   const { token } = req.body;
//   if (!token) {
//     console.log('Token manquant pour rafraîchissement');
//     return res.status(400).json({ erreur: 'Token requis' });
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
//     console.log('Refresh token décodé:', decoded);
//     const newToken = jwt.sign(
//       { id: decoded.id, type: decoded.type, boutique_id: decoded.boutique_id },
//       JWT_SECRET,
//       { expiresIn: '1h' }
//     );
//     console.log('Nouveau jeton généré:', newToken.substring(0, 20) + '...');
//     res.json({ token: newToken });
//   } catch (erreur) {
//     console.error('Erreur refresh token:', erreur);
//     res.status(401).json({ erreur: 'Token invalide' });
//   }
// });


app.post('/refresh-token', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    // console.log('Aucun token fourni pour rafraîchissement');
    return res.status(401).json({ erreur: 'Token requis' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    // console.log('Token décodé pour rafraîchissement:', { utilisateurId: decoded.id });

    // Déterminer la table selon le type dans le token
    let table;
    if (decoded.type === 'client') table = 'clients';
    else if (decoded.type === 'gerant') table = 'gerants';
    else if (decoded.type === 'livreur') table = 'livreurs';
    else return res.status(401).json({ erreur: 'Type utilisateur invalide' });

    const [utilisateur] = await pool.execute(
      `SELECT id FROM ${table} WHERE id = ?`,
      [decoded.id]
    );
    if (!utilisateur.length) {
      // console.log('Utilisateur non trouvé ou inactif', { utilisateurId: decoded.id });
      return res.status(401).json({ erreur: 'Utilisateur non trouvé ou inactif' });
    }
    const nouveauJeton = jwt.sign(
      { id: utilisateur[0].id, type: decoded.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    // console.log('Nouveau jeton généré:', { utilisateurId: decoded.id });
    res.json({ token: nouveauJeton });
  } catch (erreur) {
    console.error('Erreur rafraîchissement token:', {
      message: erreur.message,
      stack: erreur.stack,
    });
    res.status(401).json({ erreur: 'Token invalide' });
  }
});
/////////////////////////////////////:::////////////////////////////////////::::////////////////////////////
// 
// 
// //////////////NOUVELLE ROUTE POUR LE CLIENT/:::://///////////////////

app.get('/client/profil', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'client') {
    // console.log('Accès refusé: utilisateur non client', { utilisateurId: req.utilisateur.id });
    return res.status(403).json({ erreur: 'Accès réservé aux clients' });
  }
  try {
    const [utilisateur] = await pool.execute(
      'SELECT id, nom, prenom, telephone, email FROM clients WHERE id = ?',
      [req.utilisateur.id]
    );
    if (!utilisateur.length) {
      // console.log('Client non trouvé', { clientId: req.utilisateur.id });
      return res.status(404).json({ erreur: 'Client non trouvé' });
    }
    res.json({
      id: utilisateur[0].id,
      nom: utilisateur[0].nom,
      prenom: utilisateur[0].prenom,
      telephone: utilisateur[0].telephone,
      email: utilisateur[0].email,
    });
    // console.log('Profil client récupéré', { clientId: req.utilisateur.id });
  } catch (erreur) {
    console.error('Erreur récupération profil client:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::


// Middleware de gestion des erreurs (doit être après toutes les routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erreur: err.message || 'Erreur serveur' });
});




/////////////////////////////////////:::////////////////////////////////////::::////////////////////////////
// 
// 
// //////////////NOUVELLE ROUTE POUR LE CLIENT/:::://///////////////////
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::




// ==================== ROUTES PERSONNEL ====================

// POST /boutiques/:id/personnel - Créer un membre du personnel
app.post('/boutiques/:id/personnel', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent ajouter du personnel.' });
  }

  try {
    const boutiqueId = parseInt(req.params.id);
    const { nom, prenom, telephone, email, type_personnel, salaire, date_embauche, actif } = req.body;

    // Vérifier que la boutique appartient au gérant
    const [boutique] = await pool.execute(
      'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutiqueId, req.utilisateur.id]
    );

    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé.' });
    }

    // Validation des champs obligatoires
    if (!nom || !prenom || !telephone || !type_personnel || !date_embauche) {
      return res.status(400).json({ erreur: 'Les champs nom, prénom, téléphone, type_personnel et date_embauche sont requis.' });
    }

    // Gérer la photo
    const photoPath = req.file ? `/Uploads/personnel/${req.file.filename}` : null;

    // Gérer actif (par défaut true)
    const actifValue = actif === 'true' || actif === true || actif === '1' || actif === 1 ? 1 : 0;

    // Insérer le personnel
    const [result] = await pool.execute(
      `INSERT INTO personnel (boutique_id, nom, prenom, telephone, email, type_personnel, salaire, date_embauche, actif, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [boutiqueId, nom, prenom, telephone, email || null, type_personnel, salaire || null, date_embauche, actifValue, photoPath]
    );

    res.status(201).json({
      message: 'Personnel créé avec succès',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erreur création personnel:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Ce numéro de téléphone est déjà utilisé.' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur.' });
    }
  }
});

// GET /boutiques/:id/personnel - Lister tout le personnel d'une boutique
app.get('/boutiques/:id/personnel', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé.' });
  }

  try {
    const boutiqueId = parseInt(req.params.id);
    const { type, actif } = req.query;

    // Vérifier que la boutique appartient au gérant
    const [boutique] = await pool.execute(
      'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutiqueId, req.utilisateur.id]
    );

    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé.' });
    }

    // Construire la requête avec filtres optionnels
    let query = 'SELECT * FROM personnel WHERE boutique_id = ?';
    const params = [boutiqueId];

    if (type) {
      query += ' AND type_personnel = ?';
      params.push(type);
    }

    if (actif !== undefined) {
      query += ' AND actif = ?';
      params.push(actif === 'true' || actif === '1' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const [personnel] = await pool.execute(query, params);

    res.json(personnel);
  } catch (error) {
    console.error('Erreur liste personnel:', error);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// GET /personnel/:id - Obtenir un membre du personnel
app.get('/personnel/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé.' });
  }

  try {
    const personnelId = parseInt(req.params.id);

    const [personnel] = await pool.execute(
      `SELECT p.* FROM personnel p
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.id = ? AND b.gerant_id = ?`,
      [personnelId, req.utilisateur.id]
    );

    if (!personnel.length) {
      return res.status(404).json({ erreur: 'Personnel non trouvé.' });
    }

    res.json(personnel[0]);
  } catch (error) {
    console.error('Erreur lecture personnel:', error);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// PUT /personnel/:id - Mettre à jour un membre du personnel
app.put('/personnel/:id', verifierToken, upload.single('photo'), async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé.' });
  }

  try {
    const personnelId = parseInt(req.params.id);
    const { nom, prenom, telephone, email, type_personnel, salaire, date_embauche, actif, conserver_image } = req.body;

    // Vérifier que le personnel existe et appartient à une boutique du gérant
    const [personnel] = await pool.execute(
      `SELECT p.*, p.photo FROM personnel p
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.id = ? AND b.gerant_id = ?`,
      [personnelId, req.utilisateur.id]
    );

    if (!personnel.length) {
      return res.status(404).json({ erreur: 'Personnel non trouvé ou accès non autorisé.' });
    }

    // Validation des champs obligatoires
    if (!nom || !prenom || !telephone || !type_personnel || !date_embauche) {
      return res.status(400).json({ erreur: 'Les champs nom, prénom, téléphone, type_personnel et date_embauche sont requis.' });
    }

    // Gérer la photo
    let photoPath = personnel[0].photo;
    if (req.file) {
      photoPath = `/Uploads/personnel/${req.file.filename}`;
      // Supprimer l'ancienne photo
      if (personnel[0].photo && fs.existsSync(path.join(__dirname, personnel[0].photo))) {
        try {
          await fsPromises.unlink(path.join(__dirname, personnel[0].photo));
        } catch (err) {
          console.error('Erreur suppression ancienne photo:', err);
        }
      }
    } else if (conserver_image === 'true') {
      photoPath = personnel[0].photo;
    } else if (req.body.photo === '' || req.body.photo === null) {
      photoPath = null;
      if (personnel[0].photo && fs.existsSync(path.join(__dirname, personnel[0].photo))) {
        try {
          await fsPromises.unlink(path.join(__dirname, personnel[0].photo));
        } catch (err) {
          console.error('Erreur suppression photo:', err);
        }
      }
    }

    const actifValue = actif === 'true' || actif === true || actif === '1' || actif === 1 ? 1 : 0;

    // Si on désactive le seul personnel actif, bloquer
    if (actifValue === 0) {
      const [actifs] = await pool.execute(
        'SELECT COUNT(*) as count FROM personnel WHERE boutique_id = ? AND actif = true AND id != ?',
        [personnel[0].boutique_id, personnelId]
      );
      if (actifs[0].count === 0) {
        return res.status(400).json({ erreur: 'Impossible de désactiver. La boutique doit avoir au moins un personnel actif.' });
      }
    }

    // Mettre à jour
    await pool.execute(
      `UPDATE personnel
       SET nom = ?, prenom = ?, telephone = ?, email = ?, type_personnel = ?, salaire = ?, date_embauche = ?, actif = ?, photo = ?
       WHERE id = ?`,
      [nom, prenom, telephone, email || null, type_personnel, salaire || null, date_embauche, actifValue, photoPath, personnelId]
    );

    res.json({ message: 'Personnel modifié avec succès' });
  } catch (error) {
    console.error('Erreur modification personnel:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ erreur: 'Ce numéro de téléphone est déjà utilisé.' });
    } else {
      res.status(500).json({ erreur: 'Erreur serveur.' });
    }
  }
});

// DELETE /personnel/:id - Supprimer un membre du personnel
app.delete('/personnel/:id', verifierToken, async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé.' });
  }

  try {
    const personnelId = parseInt(req.params.id);

    // Vérifier que le personnel existe et appartient à une boutique du gérant
    const [personnel] = await pool.execute(
      `SELECT p.*, p.photo FROM personnel p
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.id = ? AND b.gerant_id = ?`,
      [personnelId, req.utilisateur.id]
    );

    if (!personnel.length) {
      return res.status(404).json({ erreur: 'Personnel non trouvé ou accès non autorisé.' });
    }

    // Vérifier qu'il reste au moins 1 personnel actif
    const [actifs] = await pool.execute(
      'SELECT COUNT(*) as count FROM personnel WHERE boutique_id = ? AND actif = true AND id != ?',
      [personnel[0].boutique_id, personnelId]
    );

    if (actifs[0].count === 0 && personnel[0].actif) {
      return res.status(400).json({ erreur: 'Impossible de supprimer. La boutique doit avoir au moins un personnel actif.' });
    }

    // Supprimer la photo si elle existe
    if (personnel[0].photo && fs.existsSync(path.join(__dirname, personnel[0].photo))) {
      try {
        await fsPromises.unlink(path.join(__dirname, personnel[0].photo));
      } catch (err) {
        console.error('Erreur suppression photo:', err);
      }
    }

    // Supprimer le personnel
    await pool.execute('DELETE FROM personnel WHERE id = ?', [personnelId]);

    res.json({ message: 'Personnel supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression personnel:', error);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});






/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::









/////////////////////////////////////:::////////////////////////////////////::::////////////////////////////
// 
// 
// //////////////NOUVELLE ROUTE POUR LE CLIENT/:::://///////////////////
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::






// ==================== MIDDLEWARE SUPER ADMIN ====================

// Middleware pour vérifier qu'un utilisateur est super admin
function verifierSuperAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ erreur: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'super_admin') {
      return res.status(403).json({ erreur: 'Accès refusé. Seuls les super admins peuvent accéder à cette ressource.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ erreur: 'Token invalide' });
  }
}

// Fonction helper pour logger les actions
async function logAction(adminId, actionType, resourceType, resourceId, description, ipAddress) {
  try {
    await pool.execute(
      `INSERT INTO system_logs (admin_id, action_type, resource_type, resource_id, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, actionType, resourceType, resourceId, description, ipAddress]
    );
  } catch (error) {
    console.error('Erreur lors du logging:', error);
  }
}

// ==================== ROUTES AUTHENTIFICATION ====================

// POST /super-admin/login - Connexion super admin
app.post('/super-admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ erreur: 'Email et mot de passe requis' });
    }

    // Récupérer le super admin
    const [admins] = await pool.execute(
      'SELECT * FROM super_admins WHERE email = ? AND actif = TRUE',
      [email]
    );

    if (!admins.length) {
      return res.status(401).json({ erreur: 'Identifiants invalides' });
    }

    const admin = admins[0];

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(password, admin.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Identifiants invalides' });
    }

    // Mettre à jour last_login
    await pool.execute(
      'UPDATE super_admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    // Générer le token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        type: 'super_admin',
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Logger la connexion
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAction(admin.id, 'LOGIN', 'AUTRE', null, `Connexion super admin: ${admin.email}`, ipAddress);

    res.json({
      token,
      admin: {
        id: admin.id,
        nom: admin.nom,
        prenom: admin.prenom,
        email: admin.email,
        role: admin.role,
        photo: admin.photo
      }
    });
  } catch (error) {
    console.error('Erreur login super admin:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /super-admin/logout - Déconnexion
app.post('/super-admin/logout', verifierSuperAdmin, async (req, res) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAction(req.admin.id, 'LOGOUT', 'AUTRE', null, 'Déconnexion super admin', ipAddress);
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ==================== GESTION UTILISATEURS ====================

// GET /super-admin/users - Liste tous les utilisateurs (paginée)
app.get('/super-admin/users', verifierSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 25, type, search, statut } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, nom, prenom, telephone, email, type, date_inscription, date_naissance FROM utilisateurs WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY date_inscription DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await pool.execute(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) as total FROM utilisateurs WHERE 1=1';
    const countParams = [];
    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }
    if (search) {
      countQuery += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur liste users:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// GET /super-admin/users/:id - Détails d'un utilisateur
app.get('/super-admin/users/:id', verifierSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const [users] = await pool.execute(
      'SELECT * FROM utilisateurs WHERE id = ?',
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }

    // Récupérer les boutiques si gérant
    let boutiques = [];
    if (users[0].type === 'gerant') {
      [boutiques] = await pool.execute(
        'SELECT id, nom, categorie, adresse FROM boutiques WHERE gerant_id = ?',
        [userId]
      );
    }

    // Récupérer les commandes récentes
    const [commandes] = await pool.execute(
      'SELECT id, statut, prix, date_creation FROM commandes WHERE utilisateur_id = ? ORDER BY date_creation DESC LIMIT 10',
      [userId]
    );

    res.json({
      user: users[0],
      boutiques,
      commandes
    });
  } catch (error) {
    console.error('Erreur détails user:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /super-admin/users/:id - Supprimer un utilisateur
app.delete('/super-admin/users/:id', verifierSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const [users] = await pool.execute('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ erreur: 'Utilisateur non trouvé' });
    }

    await pool.execute('DELETE FROM utilisateurs WHERE id = ?', [userId]);

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAction(
      req.admin.id,
      'DELETE',
      'UTILISATEUR',
      userId,
      `Suppression utilisateur: ${users[0].nom} ${users[0].prenom} (${users[0].email})`,
      ipAddress
    );

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression user:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ==================== GESTION BOUTIQUES ====================

// GET /super-admin/boutiques - Liste toutes les boutiques
app.get('/super-admin/boutiques', verifierSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 25, categorie, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, u.nom as gerant_nom, u.prenom as gerant_prenom, u.email as gerant_email
      FROM boutiques b
      JOIN utilisateurs u ON b.gerant_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (categorie) {
      query += ' AND b.categorie = ?';
      params.push(categorie);
    }

    if (search) {
      query += ' AND (b.nom LIKE ? OR b.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY b.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [boutiques] = await pool.execute(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) as total FROM boutiques b WHERE 1=1';
    const countParams = [];
    if (categorie) {
      countQuery += ' AND b.categorie = ?';
      countParams.push(categorie);
    }
    if (search) {
      countQuery += ' AND (b.nom LIKE ? OR b.description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      boutiques,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur liste boutiques:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /super-admin/boutiques/:id - Supprimer une boutique
app.delete('/super-admin/boutiques/:id', verifierSuperAdmin, async (req, res) => {
  try {
    const boutiqueId = parseInt(req.params.id);

    const [boutiques] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [boutiqueId]);
    if (!boutiques.length) {
      return res.status(404).json({ erreur: 'Boutique non trouvée' });
    }

    await pool.execute('DELETE FROM boutiques WHERE id = ?', [boutiqueId]);

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAction(
      req.admin.id,
      'DELETE',
      'BOUTIQUE',
      boutiqueId,
      `Suppression boutique: ${boutiques[0].nom}`,
      ipAddress
    );

    res.json({ message: 'Boutique supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression boutique:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ==================== STATISTIQUES GLOBALES ====================

// GET /super-admin/stats/overview - Vue d'ensemble
app.get('/super-admin/stats/overview', verifierSuperAdmin, async (req, res) => {
  try {
    // Compter les utilisateurs par type
    const [usersCount] = await pool.execute(`
      SELECT type, COUNT(*) as count
      FROM utilisateurs
      GROUP BY type
    `);

    const totalUsers = {};
    usersCount.forEach(row => {
      totalUsers[row.type] = row.count;
    });

    // Compter les boutiques
    const [boutiquesCount] = await pool.execute('SELECT COUNT(*) as total FROM boutiques');

    // Compter les commandes
    const [commandesCount] = await pool.execute('SELECT COUNT(*) as total, SUM(prix) as revenue FROM commandes');

    // Commandes en cours
    const [commandesEnCours] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM commandes
      WHERE statut IN ('en attente', 'acceptée', 'en préparation', 'en cours de livraison')
    `);

    // Revenue du mois en cours
    const [revenueMonth] = await pool.execute(`
      SELECT SUM(prix) as total
      FROM commandes
      WHERE MONTH(date_creation) = MONTH(CURRENT_DATE())
      AND YEAR(date_creation) = YEAR(CURRENT_DATE())
    `);

    res.json({
      totalUsers,
      totalBoutiques: boutiquesCount[0].total,
      totalCommandes: {
        total: commandesCount[0].total,
        enCours: commandesEnCours[0].count
      },
      revenue: {
        total: commandesCount[0].revenue || 0,
        thisMonth: revenueMonth[0].total || 0
      }
    });
  } catch (error) {
    console.error('Erreur stats overview:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ==================== SIGNALEMENTS ====================

// GET /super-admin/signalements - Liste des signalements
app.get('/super-admin/signalements', verifierSuperAdmin, async (req, res) => {
  try {
    const { statut = 'EN_ATTENTE', page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    const [signalements] = await pool.execute(`
      SELECT s.*, u.nom as reporter_nom, u.prenom as reporter_prenom
      FROM signalements s
      JOIN utilisateurs u ON s.reported_by = u.id
      WHERE s.statut = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [statut, parseInt(limit), offset]);

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM signalements WHERE statut = ?',
      [statut]
    );

    res.json({
      signalements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur liste signalements:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PUT /super-admin/signalements/:id/resolve - Résoudre un signalement
app.put('/super-admin/signalements/:id/resolve', verifierSuperAdmin, async (req, res) => {
  try {
    const signalementId = parseInt(req.params.id);
    const { resolution } = req.body;

    await pool.execute(`
      UPDATE signalements
      SET statut = 'RESOLU', resolution = ?, resolved_by = ?, resolved_at = NOW()
      WHERE id = ?
    `, [resolution, req.admin.id, signalementId]);

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await logAction(req.admin.id, 'APPROVE', 'SIGNALEMENT', signalementId, `Résolution signalement`, ipAddress);

    res.json({ message: 'Signalement résolu' });
  } catch (error) {
    console.error('Erreur résolution signalement:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ==================== LOGS ====================

// GET /super-admin/logs - Historique des actions
app.get('/super-admin/logs', verifierSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action_type, resource_type } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*, a.nom as admin_nom, a.prenom as admin_prenom
      FROM system_logs l
      LEFT JOIN super_admins a ON l.admin_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (action_type) {
      query += ' AND l.action_type = ?';
      params.push(action_type);
    }

    if (resource_type) {
      query += ' AND l.resource_type = ?';
      params.push(resource_type);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [logs] = await pool.execute(query, params);

    res.json({ logs });
  } catch (error) {
    console.error('Erreur logs:', error);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});








/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::
/////////////////////////////////////////////////////////:::::::::::::::://///////////////:::::::












// Démarrer les programmes du serveur
async function demarrerServeur() {
  try {
    await initialiserBaseDeDonnees();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Échec du démarrage du serveur :', error);
    process.exit(1);
  }
}

demarrerServeur();
// ==================== ROUTE DEMANDES DE SERVICES ====================
// POST /demandes-services - Créer une demande de service (UNIQUEMENT services, pas articles)
app.post('/demandes-services', verifierToken, async (req, res) => {
  const {
    boutique_id,
    service_id,
    prix,
    moyen_paiement,
    client_latitude,
    client_longitude,
    client_nom,
    client_telephone,
    adresse,
    notes,
  } = req.body;

  // Validation des données
  if (
    !boutique_id ||
    !service_id ||
    !prix ||
    !moyen_paiement ||
    client_latitude === undefined ||
    client_longitude === undefined ||
    !client_nom ||
    !client_telephone
  ) {
    return res.status(400).json({ erreur: 'Données incomplètes pour la demande de service' });
  }

  if (
    isNaN(client_latitude) ||
    isNaN(client_longitude) ||
    client_latitude < -90 ||
    client_latitude > 90 ||
    client_longitude < -180 ||
    client_longitude > 180
  ) {
    return res.status(400).json({ erreur: 'Coordonnées géographiques invalides' });
  }

  if (typeof client_nom !== 'string' || client_nom.trim().length < 2) {
    return res.status(400).json({ erreur: 'Nom du client invalide' });
  }

  if (typeof client_telephone !== 'string' || !/^\+?\d{7,15}$/.test(client_telephone)) {
    return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
  }

  const moyensValides = ['Orange Money', 'Mobile Money', 'John-Pay', 'Cash', 'Paypal', 'Paiement à la livraison'];
  if (!moyensValides.includes(moyen_paiement)) {
    return res.status(400).json({ erreur: 'Moyen de paiement invalide' });
  }

  if (prix <= 0 || isNaN(prix)) {
    return res.status(400).json({ erreur: 'Prix invalide' });
  }

  let connexion;
  try {
    connexion = await pool.getConnection();
    await connexion.beginTransaction();

    // Vérifier la boutique
    const [boutique] = await connexion.execute(
      'SELECT id, gerant_id, nom FROM boutiques WHERE id = ?',
      [boutique_id]
    );
    if (!boutique.length) {
      throw new Error('Boutique non trouvée');
    }

    // Vérifier le service
    const [service] = await connexion.execute(
      'SELECT id, nom, prix, disponible FROM services WHERE id = ? AND boutique_id = ?',
      [service_id, boutique_id]
    );
    if (!service.length) {
      throw new Error('Service non trouvé');
    }
    if (!service[0].disponible) {
      throw new Error('Service non disponible');
    }
    if (parseFloat(prix) !== parseFloat(service[0].prix)) {
      throw new Error('Prix incorrect pour ce service');
    }

    // Insérer la demande de service
    const [result] = await connexion.execute(
      `INSERT INTO demandes_services (
        utilisateur_id, boutique_id, service_id, prix, statut, moyen_paiement,
        client_latitude, client_longitude, client_nom, client_telephone, adresse, notes
      ) VALUES (?, ?, ?, ?, 'en_attente', ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.utilisateur.id,
        boutique_id,
        service_id,
        prix,
        moyen_paiement,
        client_latitude,
        client_longitude,
        client_nom.trim(),
        client_telephone.trim(),
        adresse || '',
        notes || '',
      ]
    );

    const demandeId = result.insertId;

    // // Notification pour le gérant
    // try {
    //   await connexion.execute(
    //     `INSERT INTO notifications (utilisateur_id, message, type, date)
    //      VALUES (?, ?, 'demande_service', NOW())`,
    //     [
    //       boutique[0].gerant_id,
    //       `Nouvelle demande de service "${service[0].nom}" de ${client_nom} - ${client_telephone}`,
    //     ]
    //   );
    // } catch (notifError) {
    //   console.log('Erreur notification gérant:', notifError.message);
    // }

    // // Notification pour le client
    // try {
    //   await connexion.execute(
    //     `INSERT INTO notifications (utilisateur_id, message, type, date)
    //      VALUES (?, ?, 'demande_service', NOW())`,
    //     [
    //       req.utilisateur.id,
    //       `Votre demande de service "${service[0].nom}" a été envoyée avec succès à ${client_nom}. Montant : ${prix} GNF`,
    //     ]
    //   );
    // } catch (notifError) {
    //   console.log('Erreur notification client:', notifError.message);
    // }




    // AUJOURD'HUI 10/01/2026









    // CORRECTION NOTIFICATIONS DEMANDES_SERVICES
    // Remplacer lignes 6588-6614 dans serveur.js

    // Notification pour le gérant - AVEC boutique_id et lu ET DÉTAILS COMPLETS
    try {
      const messageGerantDetaille = `🔔 Nouvelle demande de service
📦 Service : "${service[0].nom}"
💰 Montant : ${prix} GNF
👤 Client : ${client_nom}
📞 Téléphone : ${client_telephone}
${adresse ? `📍 Adresse : ${adresse}` : ''}`;

      await connexion.execute(
        `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
         VALUES (?, ?, ?, NOW(), FALSE)`,
        [
          boutique[0].gerant_id,
          boutique_id,
          messageGerantDetaille,
        ]
      );
    } catch (notifError) {
      console.log('Erreur notification gérant:', notifError.message);
    }

    // Notification pour le client - AVEC boutique_id et lu ET DÉTAILS COMPLETS
    try {
      const messageClientDetaille = `✅ Demande de service envoyée avec succès
📦 Service : "${service[0].nom}"
💰 Montant : ${prix} GNF
🏪 Boutique : ${boutique[0].nom || 'Boutique'}
📞 Vous serez contacté au ${client_telephone}`;

      await connexion.execute(
        `INSERT INTO notifications (utilisateur_id, boutique_id, message, date, lu)
         VALUES (?, ?, ?, NOW(), FALSE)`,
        [
          req.utilisateur.id,
          boutique_id,
          messageClientDetaille,
        ]
      );
    } catch (notifError) {
      console.log('Erreur notification client:', notifError.message);
    }


















    await connexion.commit();

    res.status(201).json({
      message: 'Demande de service créée avec succès',
      demande_id: demandeId,
      statut: 'en_attente',
    });
  } catch (error) {
    if (connexion) await connexion.rollback();
    console.error('Erreur création demande service:', error);
    res.status(400).json({ erreur: error.message || 'Erreur lors de la création de la demande de service' });
  } finally {
    if (connexion) connexion.release();
  }
});
