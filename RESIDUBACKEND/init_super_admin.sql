-- Script SQL pour créer le premier Super Admin
-- Email: admin@mapshop.com
-- Mot de passe: Admin@2024

-- IMPORTANT: Exécutez ce script après le premier démarrage du serveur
-- ou connectez-vous à MySQL et exécutez ces commandes

USE mapshop;

-- Créer le super admin par défaut
-- Mot de passe hashé pour: Admin@2024
INSERT INTO super_admins (nom, prenom, email, mot_de_passe, role, actif)
VALUES (
  'Super', 
  'Admin', 
  'admin@mapshop.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eedWdKxcz.Ri', -- Hash de 'Admin@2024'
  'super_admin',
  TRUE
);

-- Vérifier la création
SELECT * FROM super_admins;
