-- Script SQL pour ajouter la colonne statut à la table utilisateurs
-- Cette colonne permet de tracker si un utilisateur est en ligne ou hors ligne

USE mapshop;

-- Ajouter la colonne statut si elle n'existe pas
ALTER TABLE utilisateurs 
ADD COLUMN IF NOT EXISTS statut BOOLEAN DEFAULT FALSE COMMENT 'Statut en ligne: true=en ligne, false=hors ligne';

-- Mettre tous les utilisateurs hors ligne par défaut
UPDATE utilisateurs SET statut = FALSE WHERE statut IS NULL;

-- Vérifier l'ajout
SELECT 'Colonne statut ajoutée avec succès!' AS Status;

-- Afficher un exemple
SELECT id, nom, prenom, type, actif, statut 
FROM utilisateurs 
LIMIT 5;
