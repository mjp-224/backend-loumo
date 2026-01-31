-- ============================================================
-- MapShop Database - Version nettoyée pour hébergement
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ============================================================
-- Tables
-- ============================================================

-- Table: articles
CREATE TABLE IF NOT EXISTS `articles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `image` varchar(255) DEFAULT NULL,
  `date_exp` date DEFAULT NULL,
  `date_prod` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: boutiques
CREATE TABLE IF NOT EXISTS `boutiques` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `categorie` varchar(50) NOT NULL,
  `horaires` varchar(255) NOT NULL,
  `latitude` decimal(9,6) NOT NULL,
  `longitude` decimal(9,6) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `gerant_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `gerant_id` (`gerant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: clients
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `date_inscription` datetime NOT NULL,
  `date_naissance` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telephone` (`telephone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: commandes
CREATE TABLE IF NOT EXISTS `commandes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `article_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `statut` enum('en attente','acceptée','en préparation','livrée','en cours de livraison') NOT NULL DEFAULT 'en attente',
  `image` varchar(255) DEFAULT NULL,
  `moyen_paiement` enum('Orange Money','Mobile Money','John-Pay','Cash','Paypal') DEFAULT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `quantite` int(11) DEFAULT 1,
  `livreur_id` int(11) DEFAULT NULL,
  `client_latitude` decimal(10,6) DEFAULT NULL,
  `client_longitude` decimal(10,6) DEFAULT NULL,
  `client_nom` varchar(100) DEFAULT NULL,
  `client_telephone` varchar(20) DEFAULT NULL,
  `adresse_livraison` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `utilisateur_id` (`utilisateur_id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: commentaires
CREATE TABLE IF NOT EXISTS `commentaires` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boutique_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `texte` text NOT NULL,
  `article_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `date_creation` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `boutique_id` (`boutique_id`),
  KEY `utilisateur_id` (`utilisateur_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: demandes_services
CREATE TABLE IF NOT EXISTS `demandes_services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `statut` enum('en_attente','acceptée','refusée','en_cours','terminée','annulée') DEFAULT 'en_attente',
  `prix` decimal(10,2) NOT NULL,
  `moyen_paiement` varchar(50) DEFAULT 'Cash',
  `client_nom` varchar(100) NOT NULL,
  `client_telephone` varchar(20) NOT NULL,
  `client_latitude` decimal(10,7) DEFAULT NULL,
  `client_longitude` decimal(10,7) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_modification` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: gerants
CREATE TABLE IF NOT EXISTS `gerants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `date_inscription` datetime NOT NULL,
  `date_naissance` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telephone` (`telephone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: historique_visites
CREATE TABLE IF NOT EXISTS `historique_visites` (
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `date_visite` datetime NOT NULL,
  `frequence` int(11) DEFAULT 1,
  KEY `utilisateur_id` (`utilisateur_id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: livreurs
CREATE TABLE IF NOT EXISTS `livreurs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boutique_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(20) DEFAULT 'client',
  `date` datetime NOT NULL,
  `lu` tinyint(1) NOT NULL DEFAULT 0,
  `client_id` int(11) DEFAULT NULL,
  `gerant_id` int(11) DEFAULT NULL,
  `utilisateur_id` int(11) NOT NULL DEFAULT 0,
  `type_utilisateur` enum('client','gerant','livreur') DEFAULT 'client',
  PRIMARY KEY (`id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: paiements
CREATE TABLE IF NOT EXISTS `paiements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commande_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `moyen_paiement` varchar(50) NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `commande_id` (`commande_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: paniers
CREATE TABLE IF NOT EXISTS `paniers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int(11) NOT NULL,
  `article_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `boutique_id` int(11) NOT NULL,
  `date_ajout` datetime DEFAULT CURRENT_TIMESTAMP,
  `quantite` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: personnel
CREATE TABLE IF NOT EXISTS `personnel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `type_personnel` enum('Gérant','Employé','Caissier','Vendeur','Serveur','Cuisinier','Coiffeur','Esthéticien','Responsable','Stagiaire') NOT NULL,
  `salaire` decimal(10,2) DEFAULT NULL,
  `date_embauche` date NOT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: positions_livreurs
CREATE TABLE IF NOT EXISTS `positions_livreurs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `livreur_id` int(11) NOT NULL,
  `commande_id` int(11) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `livreur_id` (`livreur_id`),
  KEY `commande_id` (`commande_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: reductions
CREATE TABLE IF NOT EXISTS `reductions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commande_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `montant_propose` decimal(10,2) NOT NULL,
  `statut` enum('en attente','acceptée','refusée') NOT NULL DEFAULT 'en attente',
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `commande_id` (`commande_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: services
CREATE TABLE IF NOT EXISTS `services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `disponible` tinyint(1) DEFAULT 1,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `boutique_id` (`boutique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: signalements
CREATE TABLE IF NOT EXISTS `signalements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('BOUTIQUE','UTILISATEUR','COMMANDE','AUTRE') NOT NULL,
  `reported_by` int(11) NOT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `raison` text NOT NULL,
  `statut` enum('EN_ATTENTE','EN_COURS','RESOLU','REJETE') DEFAULT 'EN_ATTENTE',
  `resolution` text DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: super_admins
CREATE TABLE IF NOT EXISTS `super_admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','moderateur') DEFAULT 'admin',
  `actif` tinyint(1) DEFAULT 1,
  `photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: system_logs
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) DEFAULT NULL,
  `action_type` enum('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','BAN','UNBAN','APPROVE','REJECT') NOT NULL,
  `resource_type` enum('UTILISATEUR','BOUTIQUE','COMMANDE','PERSONNEL','SIGNALEMENT','AUTRE') NOT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: visites
CREATE TABLE IF NOT EXISTS `visites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `date_visite` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Compte Admin par défaut
-- ============================================================
-- Email: admin@mapshop.com
-- Mot de passe: Admin@2024

INSERT INTO `super_admins` (`nom`, `prenom`, `email`, `mot_de_passe`, `role`, `actif`) VALUES
('Admin', 'Super', 'admin@mapshop.com', '$2b$12$T5NP711GZQrTIH3W8VUf1.aOABgs94aJae5jhHzcBsVk15Plgtz6a', 'super_admin', 1);
