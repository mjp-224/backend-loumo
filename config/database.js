const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'geo_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initialiserBaseDeDonnees() {
  let connexion;
  try {
    connexion = await pool.getConnection();

    await connexion.execute('CREATE DATABASE IF NOT EXISTS geo_app');
    await connexion.query('USE geo_app');

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

    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS boutiques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        categorie VARCHAR(50) NOT NULL,
        horaires VARCHAR(255) NOT NULL,
        latitude DECIMAL(9,6) NOT NULL,
        longitude DECIMAL(9,6) NOT NULL,
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
        description TEXT,
        prix DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        image VARCHAR(255),
        date_prod DATE,
        date_exp DATE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

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

    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS commandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        boutique_id INT NOT NULL,
        article_id INT,
        service_id INT,
        prix DECIMAL(10,2) NOT NULL,
        statut ENUM('en attente', 'acceptée', 'en préparation', 'terminée') NOT NULL,
        moyen_paiement ENUM('carte', 'especes', 'mobile'),
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
      )
    `);

    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS commentaires (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        utilisateur_id INT NOT NULL,
        texte TEXT NOT NULL,
        date_creation DATETIME NOT NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      )
    `);

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

    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS livreurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        actif BOOLEAN DEFAULT TRUE,
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

    await connexion.execute(`
      CREATE TABLE IF NOT EXISTS paniers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        article_id INT,
        service_id INT,
        boutique_id INT NOT NULL,
        date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
      )
    `);

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

    await connexion.execute(`
      CREATE INDEX IF NOT EXISTS idx_historique_visites_date ON historique_visites (date_visite)
    `);

    console.log('Base de données initialisée avec succès');
  } catch (erreur) {
    console.error('Erreur lors de l\'initialisation de la base de données :', erreur);
    throw erreur;
  } finally {
    if (connexion) connexion.release();
  }
}

module.exports = { pool, initialiserBaseDeDonnees };