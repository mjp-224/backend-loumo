# MapShop Backend API

Backend Node.js pour l'application MapShop - Plateforme de gestion de boutiques et livraisons.

## 🚀 Stack Technique

- **Runtime**: Node.js (>= 18)
- **Framework**: Express.js
- **Base de données**: MySQL
- **Authentification**: JWT (JSON Web Tokens)
- **Upload**: Multer
- **Validation**: Joi
- **Sécurité**: bcrypt, express-rate-limit, CORS

## 📋 Prérequis

- Node.js 18+ installé
- MySQL 8+ installé et configuré
- npm ou yarn

## 🔧 Installation Locale

1. **Cloner le repository**
```bash
git clone <votre-repo-url>
cd geo-backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine :

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=mapshop_db
DB_PORT=3306

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise

# Server
PORT=5000
NODE_ENV=development
```

4. **Créer la base de données**

Exécuter les scripts SQL de création :
```bash
# Se connecter à MySQL
mysql -u root -p

# Créer la base de données
CREATE DATABASE mapshop_db;
```

5. **Démarrer le serveur**
```bash
npm start
```

Le serveur démarrera sur `http://localhost:5000`

## 📁 Structure du Projet

```
geo-backend/
├── config/          # Configuration (DB, JWT, etc.)
├── controllers/     # Logique métier
├── middleware/      # Middlewares (auth, validation)
├── models/          # Modèles de données
├── routes/          # Routes API
├── uploads/         # Fichiers uploadés
├── utils/           # Utilitaires
├── server.js        # Point d'entrée
└── package.json
```

## 🌐 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails utilisateur
- `PUT /api/users/:id` - Modifier utilisateur
- `DELETE /api/users/:id` - Supprimer utilisateur

### Boutiques
- `GET /api/boutiques` - Liste des boutiques
- `POST /api/boutiques` - Créer boutique
- `PUT /api/boutiques/:id` - Modifier boutique
- `DELETE /api/boutiques/:id` - Supprimer boutique

### Commandes
- `GET /api/commandes` - Liste des commandes
- `POST /api/commandes` - Créer commande
- `PUT /api/commandes/:id/status` - Mettre à jour statut

### Livreurs
- `GET /api/livreurs` - Liste des livreurs
- `PUT /api/livreurs/:id/toggle` - Activer/désactiver

## 🚢 Déploiement sur Render

### 1. Préparer le Repository GitHub

```bash
# Vérifier les fichiers
git status

# Ajouter les fichiers
git add .

# Commit
git commit -m "Initial commit - Backend MapShop"

# Push vers GitHub
git remote add origin https://github.com/votre-username/geo-backend.git
git push -u origin main
```

### 2. Créer le Service sur Render

1. Aller sur [render.com](https://render.com) et se connecter
2. Cliquer sur **"New +"** → **"Web Service"**
3. Connecter votre repository GitHub
4. Configurer :
   - **Name**: `mapshop-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 3. Configurer les Variables d'Environnement

Dans Render, aller dans **Environment** et ajouter :

```
DB_HOST=<votre_host_mysql_distant>
DB_USER=<votre_user>
DB_PASSWORD=<votre_password>
DB_NAME=mapshop_db
DB_PORT=3306
JWT_SECRET=<generer_secret_securise>
NODE_ENV=production
```

> **Important**: Vous aurez besoin d'une base MySQL hébergée (ex: PlanetScale, Railway, ou Render MySQL)

### 4. Déployer

Cliquer sur **"Create Web Service"**. Render va :
- Cloner votre repository
- Installer les dépendances
- Démarrer le serveur
- Fournir une URL publique

## 🔒 Sécurité

- Les mots de passe sont hashés avec bcrypt
- JWT pour l'authentification
- Rate limiting sur les endpoints sensibles
- Validation des entrées avec Joi
- CORS configuré

## 📝 Notes

- Ne JAMAIS commit le fichier `.env`
- Utiliser des secrets forts en production
- Configurer une base de données MySQL distante avant le déploiement

## 📧 Support

Pour toute question, contacter l'équipe de développement MapShop.

## 📄 Licence

ISC
