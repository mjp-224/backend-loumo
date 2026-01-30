-- Script SQL pour créer la table demandes_services
-- Les demandes de services sont séparées des commandes d'articles

USE mapshop;

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

SELECT 'Table demandes_services créée avec succès!' AS Status;
