const pool = require('./db');
const bcrypt = require('bcrypt');

/**
 * Script d'initialisation de la base de données MapShop
 * Basé sur mapshop_clean.sql
 * Compatible avec site4now.net, db4free.net, et autres hébergeurs MySQL
 */

async function initialiserBaseDeDonnees() {
  let connexion;
  try {
    connexion = await pool.getConnection();
    console.log('✅ Connexion à la base de données établie');

    // Note: Sur la plupart des hébergeurs gratuits, la base de données est déjà créée
    // et vous ne pouvez pas utiliser CREATE DATABASE
    // Nous supprimons donc cette partie

    console.log('📦 Création des tables...');

    // ============================================================
    // TABLES PRINCIPALES
    // ============================================================

    // Table: clients
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(50) NOT NULL,
                prenom VARCHAR(50) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                email VARCHAR(100) DEFAULT NULL,
                image VARCHAR(255) DEFAULT NULL,
                mot_de_passe VARCHAR(255) NOT NULL,
                date_inscription DATETIME NOT NULL,
                date_naissance DATE NOT NULL,
                UNIQUE KEY telephone (telephone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table clients créée');

    // Table: gerants
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS gerants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(50) NOT NULL,
                prenom VARCHAR(50) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                email VARCHAR(100) DEFAULT NULL,
                image VARCHAR(255) DEFAULT NULL,
                mot_de_passe VARCHAR(255) NOT NULL,
                date_inscription DATETIME NOT NULL,
                date_naissance DATE NOT NULL,
                UNIQUE KEY telephone (telephone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table gerants créée');

    // Table: boutiques
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS boutiques (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                description TEXT DEFAULT NULL,
                categorie VARCHAR(50) NOT NULL,
                horaires VARCHAR(255) NOT NULL,
                latitude DECIMAL(9,6) NOT NULL,
                longitude DECIMAL(9,6) NOT NULL,
                telephone VARCHAR(20) DEFAULT NULL,
                adresse VARCHAR(255) DEFAULT NULL,
                image VARCHAR(255) DEFAULT NULL,
                gerant_id INT NOT NULL,
                KEY gerant_id (gerant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table boutiques créée');

    // Table: articles
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
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table articles créée');

    // Table: services
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                boutique_id INT NOT NULL,
                nom VARCHAR(100) NOT NULL,
                description TEXT DEFAULT NULL,
                prix DECIMAL(10,2) NOT NULL,
                disponible TINYINT(1) DEFAULT 1,
                image VARCHAR(255) DEFAULT NULL,
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table services créée');

    // Table: livreurs
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS livreurs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                boutique_id INT NOT NULL,
                nom VARCHAR(50) NOT NULL,
                prenom VARCHAR(50) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                email VARCHAR(100) DEFAULT NULL,
                password VARCHAR(255) DEFAULT NULL,
                photo VARCHAR(255) DEFAULT NULL,
                adresse VARCHAR(255) DEFAULT NULL,
                actif TINYINT(1) DEFAULT 1,
                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table livreurs créée');

    // Table: personnel
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS personnel (
                id INT AUTO_INCREMENT PRIMARY KEY,
                boutique_id INT NOT NULL,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                email VARCHAR(255) DEFAULT NULL,
                type_personnel ENUM('Gérant','Employé','Caissier','Vendeur','Serveur','Cuisinier','Coiffeur','Esthéticien','Responsable','Stagiaire') NOT NULL,
                salaire DECIMAL(10,2) DEFAULT NULL,
                date_embauche DATE NOT NULL,
                actif TINYINT(1) DEFAULT 1,
                photo VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table personnel créée');

    // Table: super_admins
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS super_admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                mot_de_passe VARCHAR(255) NOT NULL,
                role ENUM('super_admin','admin','moderateur') DEFAULT 'admin',
                actif TINYINT(1) DEFAULT 1,
                photo VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL DEFAULT NULL,
                UNIQUE KEY email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table super_admins créée');

    // Table: system_logs
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT DEFAULT NULL,
                action_type ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','BAN','UNBAN','APPROVE','REJECT') NOT NULL,
                resource_type ENUM('UTILISATEUR','BOUTIQUE','COMMANDE','PERSONNEL','SIGNALEMENT','AUTRE') NOT NULL,
                resource_id INT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                ip_address VARCHAR(45) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table system_logs créée');

    // ============================================================
    // TABLES TRANSACTIONNELLES
    // ============================================================

    // Table: commandes
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS commandes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                utilisateur_id INT NOT NULL,
                boutique_id INT NOT NULL,
                article_id INT DEFAULT NULL,
                service_id INT DEFAULT NULL,
                prix DECIMAL(10,2) NOT NULL,
                statut ENUM('en attente','acceptée','en préparation','livrée','en cours de livraison') NOT NULL DEFAULT 'en attente',
                image VARCHAR(255) DEFAULT NULL,
                moyen_paiement ENUM('Orange Money','Mobile Money','John-Pay','Cash','Paypal') DEFAULT NULL,
                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                quantite INT DEFAULT 1,
                livreur_id INT DEFAULT NULL,
                client_latitude DECIMAL(10,6) DEFAULT NULL,
                client_longitude DECIMAL(10,6) DEFAULT NULL,
                client_nom VARCHAR(100) DEFAULT NULL,
                client_telephone VARCHAR(20) DEFAULT NULL,
                adresse_livraison VARCHAR(255) DEFAULT NULL,
                KEY utilisateur_id (utilisateur_id),
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table commandes créée');

    // Table: commentaires
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS commentaires (
                id INT AUTO_INCREMENT PRIMARY KEY,
                boutique_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                texte TEXT NOT NULL,
                article_id INT DEFAULT NULL,
                service_id INT DEFAULT NULL,
                date_creation DATETIME NOT NULL,
                KEY boutique_id (boutique_id),
                KEY utilisateur_id (utilisateur_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table commentaires créée');

    // Table: demandes_services
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS demandes_services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                utilisateur_id INT NOT NULL,
                boutique_id INT NOT NULL,
                service_id INT NOT NULL,
                statut ENUM('en_attente','acceptée','refusée','en_cours','terminée','annulée') DEFAULT 'en_attente',
                prix DECIMAL(10,2) NOT NULL,
                moyen_paiement VARCHAR(50) DEFAULT 'Cash',
                client_nom VARCHAR(100) NOT NULL,
                client_telephone VARCHAR(20) NOT NULL,
                client_latitude DECIMAL(10,7) DEFAULT NULL,
                client_longitude DECIMAL(10,7) DEFAULT NULL,
                adresse VARCHAR(255) DEFAULT NULL,
                date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                notes TEXT DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    console.log('✓ Table demandes_services créée');

    // Table: signalements
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS signalements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('BOUTIQUE','UTILISATEUR','COMMANDE','AUTRE') NOT NULL,
                reported_by INT NOT NULL,
                resource_id INT DEFAULT NULL,
                raison TEXT NOT NULL,
                statut ENUM('EN_ATTENTE','EN_COURS','RESOLU','REJETE') DEFAULT 'EN_ATTENTE',
                resolution TEXT DEFAULT NULL,
                resolved_by INT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table signalements créée');

    // Table: paniers
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS paniers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                utilisateur_id INT NOT NULL,
                article_id INT DEFAULT NULL,
                service_id INT DEFAULT NULL,
                boutique_id INT NOT NULL,
                date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
                quantite INT DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table paniers créée');

    // Table: reductions
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS reductions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                commande_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                montant_propose DECIMAL(10,2) NOT NULL,
                statut ENUM('en attente','acceptée','refusée') NOT NULL DEFAULT 'en attente',
                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                KEY commande_id (commande_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table reductions créée');

    // Table: paiements
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS paiements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                commande_id INT NOT NULL,
                utilisateur_id INT NOT NULL,
                boutique_id INT NOT NULL,
                montant DECIMAL(10,2) NOT NULL,
                moyen_paiement VARCHAR(50) NOT NULL,
                date DATETIME NOT NULL,
                KEY commande_id (commande_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table paiements créée');

    // Table: notifications
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                boutique_id INT NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(20) DEFAULT 'client',
                date DATETIME NOT NULL,
                lu TINYINT(1) NOT NULL DEFAULT 0,
                client_id INT DEFAULT NULL,
                gerant_id INT DEFAULT NULL,
                utilisateur_id INT NOT NULL DEFAULT 0,
                type_utilisateur ENUM('client','gerant','livreur') DEFAULT 'client',
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table notifications créée');

    // Table: visites
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS visites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                utilisateur_id INT NOT NULL,
                boutique_id INT NOT NULL,
                date_visite DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table visites créée');

    // Table: historique_visites
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS historique_visites (
                utilisateur_id INT NOT NULL,
                boutique_id INT NOT NULL,
                date_visite DATETIME NOT NULL,
                frequence INT DEFAULT 1,
                KEY utilisateur_id (utilisateur_id),
                KEY boutique_id (boutique_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table historique_visites créée');

    // Table: positions_livreurs
    await connexion.execute(`
            CREATE TABLE IF NOT EXISTS positions_livreurs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                livreur_id INT NOT NULL,
                commande_id INT NOT NULL,
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                KEY livreur_id (livreur_id),
                KEY commande_id (commande_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    console.log('✓ Table positions_livreurs créée');

    // ============================================================
    // COMPTE ADMIN PAR DÉFAUT
    // ============================================================

    // Vérifier si un admin existe déjà
    const [existingAdmins] = await connexion.execute(
      'SELECT COUNT(*) as count FROM super_admins WHERE email = ?',
      ['admin@mapshop.com']
    );

    if (existingAdmins[0].count === 0) {
      // Hash du mot de passe Admin@2024
      const hashedPassword = '$2b$12$T5NP711GZQrTIH3W8VUf1.aOABgs94aJae5jhHzcBsVk15Plgtz6a';

      await connexion.execute(
        `INSERT INTO super_admins (nom, prenom, email, mot_de_passe, role, actif) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
        ['Admin', 'Super', 'admin@mapshop.com', hashedPassword, 'super_admin', 1]
      );
      console.log('✅ Compte admin créé');
      console.log('   Email: admin@mapshop.com');
      console.log('   Mot de passe: Admin@2024');
    } else {
      console.log('ℹ️  Compte admin existe déjà');
    }

    console.log('\n🎉 Initialisation de la base de données terminée avec succès !');
    console.log('📊 Toutes les tables ont été créées');

  } catch (erreur) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', erreur.message);
    throw erreur;
  } finally {
    if (connexion) connexion.release();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  initialiserBaseDeDonnees()
    .then(() => {
      console.log('\n✅ Script terminé');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Erreur:', err);
      process.exit(1);
    });
}

module.exports = initialiserBaseDeDonnees;
