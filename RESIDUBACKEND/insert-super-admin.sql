-- Script SQL pour créer le compte Super Admin
-- Exécuter ce script dans MySQL ou phpMyAdmin

USE mapshop;

-- Supprimer l'ancien super admin s'il existe
DELETE FROM super_admins WHERE email = 'admin@mapshop.com';

-- Créer le super admin avec mot de passe hashé
-- Mot de passe: Admin@2024
INSERT INTO super_admins (nom, prenom, email, mot_de_passe, role, actif, created_at)
VALUES (
    'Admin',
    'Super',
    'admin@mapshop.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eedWdKxcz.Ri',
    'super_admin',
    TRUE,
    NOW()
);

-- Vérifier la création
SELECT id, nom, prenom, email, role, actif, created_at 
FROM super_admins 
WHERE email = 'admin@mapshop.com';

-- Afficher un message de confirmation
SELECT 'Super Admin créé avec succès!' AS Status,
       'Email: admin@mapshop.com' AS Email,
       'Mot de passe: Admin@2024' AS Password;
