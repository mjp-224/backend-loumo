const pool = require('./db');

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

        // Obsolete but kept for history
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

        // Créer la table livreurs
        await connexion.execute(`
      CREATE TABLE IF NOT EXISTS livreurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boutique_id INT NOT NULL,
        nom VARCHAR(50) NOT NULL,
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
        client_nom VARCHAR(100),
        client_telephone VARCHAR(20),
        adresse_livraison VARCHAR(255),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE, -- Note: references 'utilisateurs' but mapped to clients/gerants by ID logic? Wait, clients and gerants have separate IDs.
        -- IMPORTANT: The original schema references 'utilisateurs'. But we have 'clients' and 'gerants'.
        -- If 'utilisateurs' table is obsolete, foreign keys should reference the active tables.
        -- However, MySQL foreign keys need a single parent table.
        -- 'utilisateurs' is likely a VIEW or we just don't use FK constraint strictly if IDs overlap or we have a unified users table?
        -- The original code CREATE TABLE utilisateurs exists. Maybe we sync it?
        -- For now, I keep the original schema logic. commandController likely handles the ID logic.
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

        // Indexes
        await connexion.execute(`CREATE INDEX IF NOT EXISTS idx_commandes_user_boutique ON commandes (utilisateur_id, boutique_id)`);
        await connexion.execute(`CREATE INDEX IF NOT EXISTS idx_historique_visites_date ON historique_visites (date_visite)`);
        await connexion.execute(`CREATE INDEX IF NOT EXISTS idx_commandes_boutique ON commandes (boutique_id)`);
        await connexion.execute(`CREATE INDEX IF NOT EXISTS idx_paiements_boutique ON paiements (boutique_id)`);
        await connexion.execute(`CREATE INDEX IF NOT EXISTS idx_livreurs_boutique ON livreurs (boutique_id)`);

    } catch (erreur) {
        console.error('Erreur lors de l\'initialisation de la base de données :', erreur);
        throw erreur;
    } finally {
        if (connexion) connexion.release();
    }
}

module.exports = initialiserBaseDeDonnees;
