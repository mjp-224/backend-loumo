# Déploiement du Backend Refactorisé

Ce backend a été refactorisé pour adopter une architecture MVC (Modèle-Vue-Contrôleur) modulaire, facilitant la maintenance et le déploiement.

## Prérequis

- Node.js (v14+)
- MySQL (v5.7+ ou v8)

## Installation

1.  Assurez-vous d'être dans le dossier du backend :
    ```bash
    cd geo-backend
    ```

2.  Installez les dépendances :
    ```bash
    npm install
    ```

## Configuration

1.  Créez ou modifiez le fichier `.env` à la racine :
    ```env
    PORT=3000
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=mapshop
    JWT_SECRET=votre_secret_jwt_super_securise
    ```

## Base de Données

Le backend initialise automatiquement la structure de la base de données au démarrage (`config/initDb.js`). Il n'est pas nécessaire d'importer un fichier SQL manuellement pour la structure.

## Démarrage

Pour lancer le serveur en production :

```bash
npm start
```

Le serveur écoutera sur le port spécifié (défaut: 3000).

## Structure du Projet

- **`server.js`** : Point d'entrée principal. Configure Express et monte les routes.
- **`config/`** : Configuration DB (`db.js`) et initialisation (`initDb.js`).
- **`controllers/`** : Logique métier (Auth, Boutiques, Commandes, etc.).
- **`middleware/`** : Middlewares (Auth `auth.js`, Upload `upload.js`).
- **`routes/`** : Définitions des routes API.
- **`Uploads/`** : Dossier de stockage des images.

## Sécurité

- Les mots de passe sont hashés avec `bcryptjs`.
- L'authentification utilise `jsonwebtoken`.
- Les uploads sont gérés par `multer` avec filtrage des types de fichiers.

## Note pour l'Hébergement Gratuit

Cette structure est optimisée pour des hébergements comme Railway, Render ou Heroku (avec add-on MySQL). Assurez-vous simplement que les variables d'environnement (`DB_HOST` etc.) sont correctement configurées sur votre hébergeur.
